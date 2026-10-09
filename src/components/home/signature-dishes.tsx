import { Container } from "@/components/layout/container";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { SectionHeading } from "@/components/ui/section-heading";

const [featured, ...others] = [
  {
    name: "Roasted duck in fruit sauce",
    note: "Roasted and sauced with dried fruit. It anchors the $140 banquet table too.",
    photo: "Roasted duck carved on a platter",
    src: "/photos/roasted-duck.jpg",
  },
  {
    name: "Chalakhach chicken tabaka",
    note: "Chicken pressed flat and pan-fried until the skin crisps.",
    photo: "Chicken tabaka pressed flat in a pan",
    src: "/photos/chicken-tabaka.jpg",
  },
  {
    name: "Pickled tomatoes",
    note: "Russian-style pickled tomatoes, served cold.",
    photo: "Pickled tomatoes on a serving plate",
    src: "/photos/mixed-pickles.jpg",
  },
];

export function SignatureDishes() {
  return (
    <section>
      <Container className="py-20 md:py-24">
        <SectionHeading
          eyebrow="Signature dishes"
          intro="Three of Chef Alik’s favorites, still on his son’s menu."
        >
          What the family cooks
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
