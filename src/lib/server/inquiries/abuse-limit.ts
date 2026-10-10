import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { callRpc, type Configuration } from "./persistence";

/** Starting thresholds, not tuned values: a restaurant form sees a few messages a day.
 * Raise them if real guests are refused (logged as contact_rate_limited). See "Contact rate limits" in supabase/README.md.
 */
export const CONTACT_LIMITS = Object.freeze({
  subjectLimit: 5, subjectSeconds: 10 * 60, // per client network
  globalLimit: 60, globalSeconds: 60 * 60, // whole site
});

export type LimitResult = { kind: "allowed" } | { kind: "limited"; retryAfter: number } | { kind: "unavailable" };

/** The client network, from the only header Vercel sets itself and documents as not overwritable
 * by a proxy in front (x-vercel-forwarded-for). Off Vercel no header is trusted, so every request
 * shares one "unattributed" bucket; that is conservative, never a bypass.
 * IPv6 is reduced to its /64 because one subscriber usually controls the whole /64.
 */
export function clientNetwork(request: Request, env: NodeJS.ProcessEnv = process.env): string {
  if (env.VERCEL !== "1") return "unattributed";
  const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() ?? "";
  const version = isIP(ip);
  if (version === 4) return ip;
  if (version !== 6) return "unattributed";
  // Expand to eight hex groups; an embedded dotted IPv4 tail fills the last two.
  const groups = (part: string) => (part ? part.split(":").flatMap((g) => {
    if (!g.includes(".")) return [g];
    const [a, b, c, d] = g.split(".").map(Number);
    return [((a << 8) | b).toString(16), ((c << 8) | d).toString(16)];
  }) : []);
  const [head, tail] = ip.toLowerCase().split("::");
  const left = groups(head);
  const right = groups(tail ?? "");
  const full = (tail === undefined ? left : [...left, ...Array(8 - left.length - right.length).fill("0"), ...right])
    .map((g) => parseInt(g, 16));
  // IPv4-mapped (::ffff:a.b.c.d, dotted or hex) is the IPv4 client.
  if (full.slice(0, 5).every((g) => g === 0) && full[5] === 0xffff) {
    return [full[6] >> 8, full[6] & 255, full[7] >> 8, full[7] & 255].join(".");
  }
  return `${full.slice(0, 4).map((g) => g.toString(16).padStart(4, "0")).join(":")}::/64`;
}

/** Counts one valid attempt against shared limits. Fails closed: a limiter outage is "unavailable",
 * never unrestricted acceptance. Stores only a keyed hash of the network, not the address.
 */
export async function checkContactLimit(
  request: Request, submissionKey: string | null, configuration: Configuration,
  options: { env?: NodeJS.ProcessEnv; fetch?: typeof fetch } = {},
): Promise<LimitResult> {
  const subject = createHmac("sha256", configuration.secretKey)
    .update(`contact-limit:${clientNetwork(request, options.env)}`).digest("hex");
  const result = await callRpc(configuration, "check_contact_limit", {
    p_subject: subject, p_key: submissionKey?.toLowerCase() ?? null,
    p_subject_limit: CONTACT_LIMITS.subjectLimit, p_subject_seconds: CONTACT_LIMITS.subjectSeconds,
    p_global_limit: CONTACT_LIMITS.globalLimit, p_global_seconds: CONTACT_LIMITS.globalSeconds,
  }, 256, options.fetch);
  if (result && typeof result === "object" && "allowed" in result) {
    if (result.allowed === true) return { kind: "allowed" };
    if (result.allowed === false && "retryAfter" in result && Number.isInteger(result.retryAfter) &&
        (result.retryAfter as number) >= 1 && (result.retryAfter as number) <= 86400) {
      return { kind: "limited", retryAfter: result.retryAfter as number };
    }
  }
  return { kind: "unavailable" };
}
