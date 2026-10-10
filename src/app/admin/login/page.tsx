import { LoginForm } from "@/components/admin/auth-forms";
import { PageHeader } from "@/components/ui/page-header";

const reasons: Record<string, string> = {
  "signed-out": "Your session ended. Please sign in again.",
  "logged-out": "You are signed out.",
  unavailable: "Staff sign-in is unavailable right now. Please try again shortly.",
};

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { reason } = await searchParams;
  return (
    <>
      <PageHeader eyebrow="Staff" title="Sign in"
        intro={(typeof reason === "string" && reasons[reason]) || "For invited restaurant staff only."} />
      <div className="mt-10"><LoginForm /></div>
    </>
  );
}
