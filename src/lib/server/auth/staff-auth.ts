import "server-only";
import { createHmac } from "node:crypto";
import { clientNetwork, parseLimitResult, type LimitResult } from "../inquiries/abuse-limit";
import { callRpc, readBounded, type Configuration } from "../inquiries/persistence";

/** Supabase Auth over plain fetch, server-side only. Tokens never reach browser JavaScript:
 * src/lib/server/auth/session.ts keeps them in httpOnly cookies. Authorization comes only from
 * inquiry_private.staff_members (public.staff_role), never from Auth user metadata.
 */
export type Session = Readonly<{ accessToken: string; refreshToken: string; expiresIn: number }>;
export type Staff = Readonly<{ userId: string; email: string; role: "owner" | "staff" }>;
export type AuthResult<T> = { kind: "ok"; value: T } | { kind: "invalid" } | { kind: "unavailable" };
export type LinkType = "invite" | "recovery";

/** Sign-in and email-link attempts per client network, on top of Supabase's own Auth limits
 * (which see only the server's address). */
export const LOGIN_LIMIT = Object.freeze({ limit: 10, seconds: 15 * 60 });
/** Minimum in characters; maximum in bytes because bcrypt, used by Supabase Auth, ignores bytes after 72. */
export const PASSWORD = Object.freeze({ minCharacters: 12, maxBytes: 72 });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Only same-site admin paths are accepted as a return address (no open redirects). */
export function safeAdminPath(value: unknown): string {
  return typeof value === "string" && /^\/admin(?:\/[a-z0-9-]+)*$/.test(value) ? value : "/admin";
}

/** Local checks before a password is sent to Supabase Auth; returns an error message or null. */
export function passwordProblem(password: string, confirmation: string): string | null {
  if ([...password].length < PASSWORD.minCharacters) return `Use at least ${PASSWORD.minCharacters} characters.`;
  if (Buffer.byteLength(password, "utf8") > PASSWORD.maxBytes) return "That password is too long. Use a shorter one.";
  if (password !== confirmation) return "The two passwords do not match.";
  return null;
}

/** One bounded, no-store Auth request with a ten-second timeout. undefined = network/format failure. */
async function authCall(
  configuration: Configuration, method: "GET" | "POST" | "PUT", path: string,
  body: unknown, accessToken: string | null, fetchImpl: typeof fetch = fetch,
): Promise<{ status: number; json: unknown } | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const headers: Record<string, string> = { apikey: configuration.secretKey };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const response = await fetchImpl(`${configuration.url}/auth/v1/${path}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store", redirect: "error", signal: controller.signal,
    });
    const bytes = await readBounded(response.body, 64 * 1024);
    let json: unknown = null;
    if (bytes?.byteLength) { try { json = JSON.parse(new TextDecoder().decode(bytes)); } catch { /* not JSON */ } }
    return { status: response.status, json };
  } catch { return undefined; }
  finally { clearTimeout(timeout); }
}

/** 400/401/403/422 are a refusal of these credentials; anything else is a provider problem. */
const refused = (status: number) => [400, 401, 403, 422].includes(status);

function sessionFrom(response: { status: number; json: unknown } | undefined): AuthResult<Session> {
  if (!response) return { kind: "unavailable" };
  if (response.status !== 200) return refused(response.status) ? { kind: "invalid" } : { kind: "unavailable" };
  const json = response.json as Record<string, unknown> | null;
  const accessToken = json?.access_token, refreshToken = json?.refresh_token, expiresIn = json?.expires_in;
  if (typeof accessToken !== "string" || accessToken.length < 1 || accessToken.length > 8192 ||
      typeof refreshToken !== "string" || refreshToken.length < 1 || refreshToken.length > 1024 ||
      !Number.isInteger(expiresIn) || (expiresIn as number) < 120 || (expiresIn as number) > 86400) {
    return { kind: "unavailable" };
  }
  return { kind: "ok", value: { accessToken, refreshToken, expiresIn: expiresIn as number } };
}

export async function signInWithPassword(configuration: Configuration, email: string, password: string,
  fetchImpl?: typeof fetch): Promise<AuthResult<Session>> {
  return sessionFrom(await authCall(configuration, "POST", "token?grant_type=password", { email, password }, null, fetchImpl));
}

export async function refreshSession(configuration: Configuration, refreshToken: string,
  fetchImpl?: typeof fetch): Promise<AuthResult<Session>> {
  return sessionFrom(await authCall(configuration, "POST", "token?grant_type=refresh_token",
    { refresh_token: refreshToken }, null, fetchImpl));
}

/** Exchanges an invitation or password-reset email link (token_hash) for a session. Single use. */
export async function verifyEmailLink(configuration: Configuration, type: LinkType, tokenHash: string,
  fetchImpl?: typeof fetch): Promise<AuthResult<Session>> {
  return sessionFrom(await authCall(configuration, "POST", "verify", { type, token_hash: tokenHash }, null, fetchImpl));
}

export async function updatePassword(configuration: Configuration, accessToken: string, password: string,
  fetchImpl?: typeof fetch): Promise<AuthResult<null>> {
  const response = await authCall(configuration, "PUT", "user", { password }, accessToken, fetchImpl);
  if (!response) return { kind: "unavailable" };
  if (response.status === 200) return { kind: "ok", value: null };
  return refused(response.status) ? { kind: "invalid" } : { kind: "unavailable" };
}

/** Revokes this session's refresh token at Supabase. Best effort: cookies are cleared regardless. */
export async function signOut(configuration: Configuration, accessToken: string, fetchImpl?: typeof fetch) {
  await authCall(configuration, "POST", "logout?scope=local", undefined, accessToken, fetchImpl);
}

/** Checks the session with Supabase Auth (signed-out or deleted sessions fail there), then the
 * trusted membership table. Called on every admin page and action, so revocation applies to the next one.
 */
export async function resolveStaff(configuration: Configuration, accessToken: string,
  fetchImpl?: typeof fetch): Promise<AuthResult<Staff> | { kind: "denied" }> {
  const response = await authCall(configuration, "GET", "user", undefined, accessToken, fetchImpl);
  if (!response) return { kind: "unavailable" };
  if (response.status !== 200) return refused(response.status) ? { kind: "invalid" } : { kind: "unavailable" };
  const user = response.json as Record<string, unknown> | null;
  const userId = user?.id, email = user?.email;
  if (typeof userId !== "string" || !UUID.test(userId)) return { kind: "unavailable" };
  const role = await callRpc(configuration, "staff_role", { p_user: userId }, 64, fetchImpl);
  if (role === null) return { kind: "denied" };
  if (role !== "owner" && role !== "staff") return { kind: "unavailable" };
  return { kind: "ok", value: { userId, email: typeof email === "string" ? email : "", role } };
}

/** Counts one sign-in attempt for the client network. Fails closed like the contact limiter. */
export async function checkLoginLimit(request: Pick<Request, "headers">, configuration: Configuration,
  options: { env?: NodeJS.ProcessEnv; fetch?: typeof fetch } = {}): Promise<LimitResult> {
  const subject = createHmac("sha256", configuration.secretKey)
    .update(`login-limit:${clientNetwork(request, options.env)}`).digest("hex");
  const result = await callRpc(configuration, "check_login_limit",
    { p_subject: subject, p_limit: LOGIN_LIMIT.limit, p_seconds: LOGIN_LIMIT.seconds }, 256, options.fetch);
  return parseLimitResult(result);
}
