import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { CallCta } from "@/components/ui/call-cta";
import { CtaLink } from "@/components/ui/cta-link";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <Container className="py-24 md:py-32">
      <PageHeader
        eyebrow="Page not found"
        title="This page has moved on"
        intro={
          <>
            The page you were after isn&rsquo;t here. The menu and our banquet
            packages are the two people usually want.
          </>
        }
      >
        <CtaLink href="/menu">See the menu</CtaLink>
        <CtaLink href="/private-events" variant="secondary">
          See banquet menus
        </CtaLink>
        <CallCta variant="secondary" />
      </PageHeader>
    </Container>
  );
}
