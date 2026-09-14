import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { CtaLink } from "@/components/ui/cta-link";
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
    <Container className="py-16 md:py-20">
      <div className="grid gap-12 md:grid-cols-12">
        <header className="md:col-span-7">
          <h1 className="font-serif text-4xl leading-tight text-stone-900 sm:text-5xl">
            Like father, like son
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-stone-600">
            {site.name} is a bar and grill on Coney Island Avenue, serving
            weekday lunch specials, seafood, and Russian-style banquets in rooms
            we keep for private parties. Locals and visitors both, most nights.
          </p>
        </header>

        <div className="md:col-span-4 md:col-start-9">
          <PlaceholderImage
            label="Chef Stanley in the kitchen"
            aspect="aspect-3/4"
          />
        </div>
      </div>

      <div className="mt-16 grid gap-12 md:grid-cols-12">
        <div className="md:col-span-7">
          <h2 className="font-serif text-2xl text-stone-900 sm:text-3xl">
            Two kitchens, one family
          </h2>
          <div className="mt-5 space-y-5 text-lg leading-8 text-stone-600">
            <p>
              In Brooklyn restaurants, family runs through the kitchen more
              often than not — people cooking the dishes they grew up eating,
              from the people who taught them.
            </p>
            <p>
              Running this one is Stanley, son and protégé of Chef Alik of
              Chateau De Alik. What he took from his father&rsquo;s kitchen
              shows up across the menu, and what he added himself is mostly
              seafood — the raw bar, the whole fish, the lobster and crab that
              anchor our banquet tables.
            </p>
          </div>

          <blockquote className="mt-10 border-l-2 border-wine-700 pl-6">
            <p className="font-serif text-2xl leading-relaxed text-stone-900">
              &ldquo;The emphasis is on the quality of the product, but we
              wanted to present it in an approachable format, so people could
              come in and enjoy a few times a week. We wanted it to be a home
              away from home.&rdquo;
            </p>
            <cite className="mt-4 block text-sm not-italic text-stone-500">
              Chef Stan
            </cite>
          </blockquote>

          <div className="mt-10 space-y-5 text-lg leading-8 text-stone-600">
            <p>
              That&rsquo;s the measure we cook to. Not a room you visit once for
              an occasion, but one you come back to on a Wednesday because the
              soup is good and someone knows your name.
            </p>
            <p>
              Alongside the daily soups and lunch specials, the dinner menu
              keeps Chef Alik&rsquo;s own favorites: pickled tomatoes,
              chalakhach chicken tabaka, and roasted duck in fruit sauce.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <CtaLink href="/menu">See the menu</CtaLink>
            <CtaLink href={site.phone.href} variant="secondary">
              Call {site.phone.display}
            </CtaLink>
          </div>
        </div>

        <aside className="md:col-span-4 md:col-start-9">
          <PlaceholderImage
            label="The dining room on a full night"
            aspect="aspect-4/3"
          />
          <PlaceholderImage
            label="Cold table laid for a banquet"
            aspect="aspect-4/3"
            className="mt-6"
          />
        </aside>
      </div>
    </Container>
  );
}
