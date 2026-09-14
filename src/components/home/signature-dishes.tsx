import { Container } from "@/components/layout/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { PlaceholderImage } from "@/components/ui/placeholder-image";

const dishes = [
  {
    name: "Pickled tomatoes",
    note: "Cured in-house, served cold — the way Alik always started a table.",
    photo: "Pickled tomatoes on a serving plate",
  },
  {
    name: "Chalakhach chicken tabaka",
    note: "Flattened, pressed, and crisped skin-side down, with garlic.",
    photo: "Chicken tabaka pressed flat in a pan",
  },
  {
    name: "Roasted duck in fruit sauce",
    note: "Slow-roasted, finished with dried fruit — a banquet centerpiece.",
    photo: "Roasted duck carved on a platter",
  },
];

export function SignatureDishes() {
  return (
    <section className="border-b border-stone-200">
      <Container className="py-16 md:py-20">
        <SectionHeading intro="Three of Chef Alik’s favorites, still on his son’s menu.">
          What the family cooks
        </SectionHeading>

        <ul className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {dishes.map((dish) => (
            <li key={dish.name}>
              <PlaceholderImage label={dish.photo} />
              <h3 className="mt-4 font-serif text-xl text-stone-900">
                {dish.name}
              </h3>
              <p className="mt-2 leading-7 text-stone-600">{dish.note}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
