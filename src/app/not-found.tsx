import { Container } from "@/components/layout/container";
import { CtaLink } from "@/components/ui/cta-link";
import { site } from "@/lib/data/site";

export default function NotFound() {
  return (
    <Container className="py-24 md:py-32">
      <div className="max-w-xl">
        <h1 className="font-serif text-4xl text-stone-900 sm:text-5xl">
          This page has moved on
        </h1>
        <p className="mt-6 text-lg leading-8 text-stone-600">
          The page you were after isn&rsquo;t here. The menu and our banquet
          packages are the two people usually want.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <CtaLink href="/menu">See the menu</CtaLink>
          <CtaLink href="/private-events" variant="secondary">
            Banquet menus
          </CtaLink>
          <CtaLink href={site.phone.href} variant="secondary">
            Call {site.phone.display}
          </CtaLink>
        </div>
      </div>
    </Container>
  );
}
