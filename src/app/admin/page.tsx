import { logout } from "@/app/admin/actions";
import { ctaClassName } from "@/components/ui/cta-link";
import { PageHeader } from "@/components/ui/page-header";
import { requireStaff } from "@/lib/server/auth/session";

export default async function AdminPage() {
  const staff = await requireStaff("/admin");
  return (
    <>
      <PageHeader eyebrow="Staff" title="Dashboard"
        intro={`Signed in as ${staff.email || "staff member"} (${staff.role}). The inquiry inbox is coming next.`} />
      <form action={logout} className="mt-10">
        <button type="submit" className={ctaClassName("secondary")}>Sign out</button>
      </form>
    </>
  );
}
