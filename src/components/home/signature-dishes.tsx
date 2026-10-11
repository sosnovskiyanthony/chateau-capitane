import { Container } from "@/components/layout/container";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { SectionHeading } from "@/components/ui/section-heading";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/get-locale";

const photos = [
  "/photos/roasted-duck.jpg",
  "/photos/chicken-tabaka.jpg",
  "/photos/mixed-pickles.jpg",
];

export async function SignatureDishes() {
  const t = getDictionary(await getLocale()).home.signature;
  const [featured, ...others] = t.dishes.map((dish, index) => ({ ...dish, src: photos[index] }));
  return (
    <section>
      <Container className="py-20 md:py-24">
        <SectionHeading
          eyebrow={t.eyebrow}
          intro={t.intro}
        >
          {t.title}
        </SectionHeading>

        <ul className="mt-14 grid gap-x-8 gap-y-14 md:grid-cols-12 md:gap-y-12">
          <li className="md:col-span-7 md:row-span-2">
            <PlaceholderImage
              label={featured.photo}
              aspect="aspect-4/5"
              src={featured.src}
              priority
            />
            <h3 className="mt-6 font-serif text-3xl tracking-tight text-ivory">
              {featured.name}
            </h3>
            <p className="mt-3 max-w-md leading-7 text-ivory-muted">
              {featured.note}
            </p>
          </li>
          {others.map((dish, index) => (
            <li
              key={dish.name}
              // The last card drops to the bottom so its caption lines up with the featured one.
              className={`md:col-span-5 ${index === others.length - 1 ? "md:self-end" : ""}`}
            >
              <PlaceholderImage
                label={dish.photo}
                aspect="aspect-4/3"
                src={dish.src}
              />
              <h3 className="mt-5 font-serif text-2xl tracking-tight text-ivory">
                {dish.name}
              </h3>
              <p className="mt-2 leading-7 text-ivory-muted">{dish.note}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
