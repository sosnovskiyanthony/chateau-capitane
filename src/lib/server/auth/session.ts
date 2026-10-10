import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPersistenceConfiguration } from "../inquiries/persistence";
import { refreshSession, resolveStaff, safeAdminPath, signOut, type Session, type Staff } from "./staff-auth";

const ACCESS = "cc_staff_access";
const REFRESH = "cc_staff_refresh";
/** Sign-in lasts while staff are active: each hourly renewal extends it; 12 idle hours ends it. */
const IDLE_SECONDS = 12 * 60 * 60;
// httpOnly: no page script can read the tokens. Path /admin: never sent with public page requests.
const options = () => ({ httpOnly: true, sameSite: "lax" as const, path: "/admin",
  secure: process.env.NODE_ENV === "production" });

/** Server Functions and Route Handlers only (Next.js cannot set cookies while rendering). */
export async function saveSession(session: Session) {
  const jar = await cookies();
  // Expires a minute before the token so a present cookie is never a just-expired token.
  jar.set(ACCESS, session.accessToken, { ...options(), maxAge: session.expiresIn - 60 });
  jar.set(REFRESH, session.refreshToken, { ...options(), maxAge: IDLE_SECONDS });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete({ name: ACCESS, ...options() });
  jar.delete({ name: REFRESH, ...options() });
}

/** Revokes the session at Supabase (best effort) and clears the cookies. Uses the refresh token when
 * present, so it works even after the short-lived access cookie has expired or been rejected.
 * Server Functions and Route Handlers only.
 */
export async function endSession() {
  const configuration = getPersistenceConfiguration();
  const { accessToken, refreshToken } = await readTokens();
  if (configuration) {
    const renewed = refreshToken ? await refreshSession(configuration, refreshToken) : undefined;
    const token = renewed?.kind === "ok" ? renewed.value.accessToken : accessToken;
    if (token) await signOut(configuration, token);
  }
  await clearSession();
}

export async function readTokens() {
  const jar = await cookies();
  return { accessToken: jar.get(ACCESS)?.value, refreshToken: jar.get(REFRESH)?.value };
}

/** Every admin page and Server Function calls this first. Returns the current staff member or redirects:
 * expired access → /admin/refresh (renews, then returns to `returnTo`); revoked, signed-out or
 * non-staff → /admin/refresh?end=1 (revokes and clears cookies, then /admin/login).
 * Membership is re-read on every call.
 */
export async function requireStaff(returnTo: string): Promise<Staff> {
  // Read cookies first: this marks the page as per-request, so it is never prerendered at build time.
  const { accessToken, refreshToken } = await readTokens();
  const configuration = getPersistenceConfiguration();
  if (!configuration) redirect("/admin/login?reason=unavailable");
  if (!accessToken) {
    redirect(refreshToken ? `/admin/refresh?next=${encodeURIComponent(safeAdminPath(returnTo))}` : "/admin/login");
  }
  const result = await resolveStaff(configuration, accessToken);
  if (result.kind === "ok") return result.value;
  // Rendering cannot clear cookies, so a route handler ends the session.
  redirect(result.kind === "unavailable" ? "/admin/login?reason=unavailable" : "/admin/refresh?end=1");
}
