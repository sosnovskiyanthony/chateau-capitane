import type { Metadata } from "next";

import { Container } from "@/components/layout/container";

export const metadata: Metadata = {
  title: "Staff",
  robots: { index: false, follow: false },
};

/** Layouts do not re-run on every navigation, so each admin page and action checks access itself. */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <Container className="pb-20 pt-14 md:pb-28 md:pt-20">{children}</Container>;
}
