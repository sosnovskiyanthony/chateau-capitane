import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { CallCta } from "@/components/ui/call-cta";
import { CtaLink } from "@/components/ui/cta-link";
import { PageHeader } from "@/components/ui/page-header";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { site } from "@/lib/data/site";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Chef Stanley & Our Family Kitchen",
  description:
    "Chef Stanley learned to cook from his father, Alik of Chateau De Alik. The story behind the seafood, the banquets, and the Brooklyn dining room.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <Container className="pb-20 pt-14 md:pb-28 md:pt-20">
      <div className="grid gap-12 md:grid-cols-12 md:items-center">
        <PageHeader
          eyebrow="About"
          title="Like father, like son"
          intro={
            <>
              {site.name} is a bar and grill on Coney Island Avenue, serving
              weekday lunch specials, seafood, and Russian-style banquets in
              rooms we keep for private parties. Locals and visitors both, most
              nights.
            </>
          }
          className="md:col-span-7"
        />

        <div className="md:col-span-4 md:col-start-9">
          <PlaceholderImage
            label="Chef Stanley in the kitchen"
            aspect="aspect-3/4"
          />
        </div>
      </div>

      <div className="mt-20 grid gap-12 md:mt-28 md:grid-cols-12">
        <div className="md:col-span-7">
          <h2 className="font-serif text-3xl leading-tight tracking-tight text-ivory sm:text-4xl">
            Two kitchens, one family
          </h2>
          <div className="mt-6 space-y-6 text-lg leading-8 text-ivory-muted">
            <p>
              In Brooklyn restaurants, family runs through the kitchen more
              often than not: people cooking the dishes they grew up eating,
              taught by the people who made them first.
            </p>
            <p>
              Running this one is Stanley, son and protégé of Chef Alik of
              Chateau De Alik. What he took from his father&rsquo;s kitchen
              shows up across the menu, and what he added himself is mostly
              seafood: the raw bar, the whole fish, and the lobster and crab on
              our banquet tables.
            </p>
          </div>
        </div>

        <aside className="grid min-w-0 gap-6 md:col-span-4 md:col-start-9">
          <PlaceholderImage
            label="The dining room on a full night"
            aspect="aspect-4/3"
          />
          <PlaceholderImage
            label="Red caviar served with blini and accompaniments at a banquet table"
            aspect="aspect-4/5"
            src="/photos/caviar-service-instagram.jpg"
          />
        </aside>
      </div>

      <figure className="mt-20 bg-ink-800 px-6 py-14 sm:px-14 sm:py-20 md:mt-28">
        <blockquote>
          <p className="max-w-4xl font-serif text-2xl italic leading-snug tracking-tight text-ivory sm:text-4xl">
            &ldquo;The emphasis is on the quality of the product, but we wanted
            to present it in an approachable format, so people could come in and
            enjoy a few times a week. We wanted it to be a home away from
            home.&rdquo;
          </p>
        </blockquote>
        <figcaption className="mt-8 text-xs font-semibold uppercase tracking-caps text-gold">
          Chef Stan
        </figcaption>
      </figure>

      <div className="mt-20 max-w-2xl space-y-6 text-lg leading-8 text-ivory-muted md:mt-28">
        <p>
          That&rsquo;s the measure we cook to. Not a room you visit once for an
          occasion, but one you come back to on a Wednesday because the soup is
          good and someone knows your name.
        </p>
        <p>
          Alongside the daily soups and lunch specials, the dinner menu keeps
          Chef Alik&rsquo;s own favorites: pickled tomatoes, chalakhach chicken
          tabaka, and roasted duck in fruit sauce.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <CtaLink href="/menu">See the menu</CtaLink>
        <CallCta variant="secondary" />
      </div>
    </Container>
  );
}
