import { SetPasswordForm } from "@/components/admin/auth-forms";
import { PageHeader } from "@/components/ui/page-header";

/** Target of the invitation and password-reset emails (see supabase/README.md, "Staff access").
 * Opening it changes nothing; the token is spent only when the form is submitted.
 */
export default async function ConfirmPage({ searchParams }: PageProps<"/admin/confirm">) {
  const { type, token_hash: tokenHash } = await searchParams;
  const valid = (type === "invite" || type === "recovery") && typeof tokenHash === "string";
  return (
    <>
      <PageHeader eyebrow="Staff" title={type === "recovery" ? "Reset password" : "Welcome"}
        intro={valid ? "Choose a password to finish signing in." : "This link is not valid. Ask the owner for a new one."} />
      {valid ? <div className="mt-10"><SetPasswordForm type={type} tokenHash={tokenHash} /></div> : null}
    </>
  );
}
