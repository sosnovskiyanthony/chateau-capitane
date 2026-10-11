import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/container";
import { getLocale } from "@/lib/i18n/get-locale";

export const metadata: Metadata = {
  title: "Staff",
  robots: { index: false, follow: false },
};

/** Layouts do not re-run on every navigation, so each admin page and action checks access itself. */
export default async function AdminLayout({ children }: LayoutProps<"/[lang]/admin">) {
  // Staff pages are English only, so /ru/admin does not exist.
  if ((await getLocale()) !== "en") notFound();
  return <Container className="pb-20 pt-14 md:pb-28 md:pt-20">{children}</Container>;
}
