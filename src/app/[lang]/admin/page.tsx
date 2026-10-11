import { logout } from "@/app/[lang]/admin/actions";
import { ctaClassName } from "@/components/ui/cta-class";
import { CtaLink } from "@/components/ui/cta-link";
import { PageHeader } from "@/components/ui/page-header";
import { requireStaff } from "@/lib/server/auth/session";

export default async function AdminPage() {
  const staff = await requireStaff("/admin");
  return (
    <>
      <PageHeader eyebrow="Staff" title="Dashboard"
        intro={`Signed in as ${staff.email || "staff member"} (${staff.role}).`} />
      <div className="mt-10 flex flex-wrap gap-4">
        <CtaLink href="/admin/inquiries">Open inquiries</CtaLink>
        <CtaLink href="/admin/content" variant="secondary">Website content</CtaLink>
        <form action={logout}>
          <button type="submit" className={ctaClassName("secondary")}>Sign out</button>
        </form>
      </div>
    </>
  );
}
