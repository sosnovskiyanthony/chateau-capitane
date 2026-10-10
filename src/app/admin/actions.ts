"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { site } from "@/lib/data/site";
import { endSession, saveSession } from "@/lib/server/auth/session";
import {
  checkLoginLimit, passwordProblem, resolveStaff, signInWithPassword, signOut, updatePassword, verifyEmailLink,
  type Session,
} from "@/lib/server/auth/staff-auth";
import { getPersistenceConfiguration, type Configuration } from "@/lib/server/inquiries/persistence";

// Server Functions are public POST endpoints. Next.js rejects calls whose Origin differs from the host (CSRF).
export type FormState = { error: string } | undefined;

const UNAVAILABLE = `Staff sign-in is unavailable right now. Please try again later or call ${site.phone.display}.`;
// One message for wrong password, unknown email and non-staff accounts, so accounts cannot be probed.
const REFUSED = "That email and password do not match a staff account.";

const field = (form: FormData, name: string, max: number) => {
  const value = form.get(name);
  return typeof value === "string" && value.length <= max ? value : "";
};

/** Saves the session only for current staff; anyone else is signed straight out again. */
async function admit(configuration: Configuration, session: Session, refusal: string): Promise<FormState> {
  const staff = await resolveStaff(configuration, session.accessToken);
  if (staff.kind === "unavailable") return { error: UNAVAILABLE };
  if (staff.kind !== "ok") {
    await signOut(configuration, session.accessToken);
    return { error: refusal };
  }
  await saveSession(session);
  redirect("/admin");
}

/** Counts one attempt (sign-in or email link) for the client network; returns an error to show, if any. */
async function attemptLimit(configuration: Configuration): Promise<FormState> {
  const limit = await checkLoginLimit({ headers: await headers() }, configuration);
  if (limit.kind === "unavailable") return { error: UNAVAILABLE };
  if (limit.kind === "limited") {
    const minutes = Math.ceil(limit.retryAfter / 60);
    return { error: `Too many attempts. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.` };
  }
}

export async function login(_state: FormState, form: FormData): Promise<FormState> {
  const email = field(form, "email", 254).trim();
  const password = field(form, "password", 1024);
  if (!email.includes("@") || !password) return { error: REFUSED };
  const configuration = getPersistenceConfiguration();
  if (!configuration) return { error: UNAVAILABLE };
  const limited = await attemptLimit(configuration);
  if (limited) return limited;
  const session = await signInWithPassword(configuration, email, password);
  if (session.kind === "invalid") return { error: REFUSED };
  if (session.kind === "unavailable") return { error: UNAVAILABLE };
  return admit(configuration, session.value, REFUSED);
}

/** Invitation and password-reset links: the email link opens a page; only this POST spends the
 * single-use token, so mail scanners that pre-open links cannot consume it.
 */
export async function setPasswordFromLink(_state: FormState, form: FormData): Promise<FormState> {
  const type = field(form, "type", 16);
  const tokenHash = field(form, "token_hash", 512);
  const password = field(form, "password", 1024);
  if ((type !== "invite" && type !== "recovery") || !/^[\w-]{8,512}$/.test(tokenHash)) {
    return { error: "This link is not valid. Ask the owner for a new one." };
  }
  const problem = passwordProblem(password, field(form, "confirm", 1024));
  if (problem) return { error: problem };
  const configuration = getPersistenceConfiguration();
  if (!configuration) return { error: UNAVAILABLE };
  const limited = await attemptLimit(configuration);
  if (limited) return limited;
  const session = await verifyEmailLink(configuration, type, tokenHash);
  if (session.kind === "invalid") return { error: "This link has expired or was already used. Ask the owner for a new one." };
  if (session.kind === "unavailable") return { error: UNAVAILABLE };
  const updated = await updatePassword(configuration, session.value.accessToken, password);
  if (updated.kind !== "ok") {
    await signOut(configuration, session.value.accessToken);
    return { error: updated.kind === "invalid"
      ? "That password was not accepted (too weak or recently used). The link is now used up; ask the owner for a new one."
      : UNAVAILABLE };
  }
  return admit(configuration, session.value, "This account does not have staff access.");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/admin/login?reason=logged-out");
}
