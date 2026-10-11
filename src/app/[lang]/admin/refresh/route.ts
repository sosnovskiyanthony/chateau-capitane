import { redirect } from "next/navigation";
import { clearSession, endSession, readTokens, saveSession } from "@/lib/server/auth/session";
import { refreshSession, safeAdminPath } from "@/lib/server/auth/staff-auth";
import { getPersistenceConfiguration } from "@/lib/server/inquiries/persistence";

/** Renews an expired access token with the refresh cookie, then returns to the admin page.
 * With ?end=1 (from requireStaff for revoked or rejected sessions) it ends the session instead.
 * GET is acceptable: it only rotates or ends the caller's own session. Authorization happens on the next page.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (params.get("end") === "1") {
    await endSession();
    redirect("/admin/login?reason=signed-out");
  }
  const next = safeAdminPath(params.get("next"));
  const configuration = getPersistenceConfiguration();
  const { refreshToken } = await readTokens();
  if (!configuration) redirect("/admin/login?reason=unavailable");
  if (!refreshToken) redirect("/admin/login");
  const result = await refreshSession(configuration, refreshToken);
  if (result.kind === "unavailable") redirect("/admin/login?reason=unavailable");
  if (result.kind === "invalid") {
    await clearSession();
    redirect("/admin/login?reason=signed-out");
  }
  await saveSession(result.value);
  redirect(next);
}
