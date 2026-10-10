import { getPhotoGroups, PHOTO_ASPECTS, type PhotoGroup } from "@/lib/data/gallery";
import { getLunchSpecialCourses, getMenuCategories, menuNotes, type MenuCategory, type PrixFixeCourse } from "@/lib/data/menu";
import { getPrivateEventTiers, type BanquetTier } from "@/lib/data/private-events";
import { site, type OpeningHours, type Weekday } from "@/lib/data/site";

/** Editable restaurant content as stored in a revision: prices are integer US cents.
 * Phone, OpenTable link and the lunch rules (three courses, beverages excluded) are not part of it.
 */
export type ContentDocument = {
  hours: { dining: OpeningHours; lunchSpecial: OpeningHours };
  lunchSpecialPriceCents: number;
  /** Options for the three fixed lunch courses, in LUNCH_COURSES order. */
  lunchOptions: string[][];
  menuCategories: { id: string; name: string; description?: string;
    items: { name: string; description?: string; priceCents?: number; priceNote?: string }[] }[];
  menuNotes: string[];
  packages: { id: string; name: string; pricePerPersonCents: number; summary: string; minGuests?: number;
    courses: { label: string; items: string[] }[] }[];
  gallery: { id: string; name: string; description?: string; photos: GalleryPhoto[] }[];
};

/** A gallery entry: a built-in photo (`src`), an uploaded one (`media` + where it came from), or a placeholder (neither). */
export type GalleryPhoto = { id: string; alt: string; caption?: string; aspect: string; feature?: boolean;
  src?: string; media?: string; sourceDate?: string; sourceUrl?: string };

/** What pages render: the existing data shapes, prices in dollars. */
export type SiteContent = {
  hours: { dining: OpeningHours; lunchSpecial: OpeningHours };
  lunchSpecialPrice: number;
  lunchCourses: PrixFixeCourse[];
  menuCategories: MenuCategory[];
  menuNotes: string[];
  packages: BanquetTier[];
  gallery: PhotoGroup[];
};

export const WEEKDAYS: readonly Weekday[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
/** Fixed in code: the lunch special is always these three courses. */
export const LUNCH_COURSES = ["Soup", "Salad", "Entrée"] as const;
/** UTF-8 bytes; the database allows 262,144 bytes of stored JSON, which adds spacing. */
export const MAX_DOCUMENT_BYTES = 200_000;
const MAX_CENTS = 1_000_000;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
// Control characters and Unicode line/paragraph separators: every field is a single line.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const BUILT_IN_PHOTO = /^\/photos\/[a-z0-9][a-z0-9._-]{0,80}$/;
/** New photos must come from 2026 or later. */
export const EARLIEST_PHOTO_DATE = "2026-01-01";
const CONTROL = /[\p{Cc}\p{Zl}\p{Zp}]/u;

export class ContentError extends Error {}
const fail = (message: string): never => { throw new ContentError(message); };
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function text(value: unknown, max: number, label: string): string {
  if (typeof value !== "string" || !value.trim()) fail(`${label} is required.`);
  const result = value as string;
  if (result !== result.trim() || CONTROL.test(result)) fail(`${label} has extra spaces or line breaks.`);
  if (Array.from(result).length > max) fail(`${label} is longer than ${max} characters.`);
  return result;
}
const optionalText = (value: unknown, max: number, label: string) =>
  value === undefined ? undefined : text(value, max, label);

function cents(value: unknown, label: string, wholeDollars = false): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > MAX_CENTS) {
    fail(`${label} must be between $0.01 and $${MAX_CENTS / 100}.`);
  }
  if (wholeDollars && (value as number) % 100) fail(`${label} must be whole dollars.`);
  return value as number;
}

function list<T>(value: unknown, min: number, max: number, label: string, each: (item: unknown, index: number) => T): T[] {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    fail(`${label} needs ${min === max ? min : `${min} to ${max}`} entries.`);
  }
  return (value as unknown[]).map(each);
}

function unique(values: string[], label: string) {
  if (new Set(values).size !== values.length) fail(`${label} has duplicates.`);
}

/** A real calendar date, YYYY-MM-DD, from 2026 up to two days ahead (UTC, allowing for time zones). */
export function photoDate(value: unknown, label: string): string {
  const result = typeof value === "string" ? value : "";
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(result) ? new Date(`${result}T00:00:00Z`) : null;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== result) fail(`${label} must be a date.`);
  if (result < EARLIEST_PHOTO_DATE) fail(`${label} must be in 2026 or later.`);
  if (parsed!.getTime() > Date.now() + 2 * 86_400_000) fail(`${label} cannot be in the future.`);
  return result;
}

export function photoUrl(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  const result = text(value, 500, label);
  if (!/^https:\/\/[^\s]+$/.test(result)) fail(`${label} must start with https://.`);
  return result;
}

const builtInGallery = () => getPhotoGroups().map((group) => ({ ...group,
  photos: group.photos.map((photo) => ({ ...photo })) }));

function gallery(value: unknown): ContentDocument["gallery"] {
  return list(value, 1, 10, "Gallery sections", (raw) => {
    if (!isObject(raw)) return fail("A gallery section is missing.");
    const name = text(raw.name, 80, "Gallery section name");
    return {
      id: typeof raw.id === "string" && SLUG.test(raw.id) && raw.id.length <= 60 ? raw.id : fail(`${name} has an invalid ID.`),
      name,
      description: optionalText(raw.description, 400, `${name} description`),
      photos: list(raw.photos, 0, 60, `${name} photos`, (photo): GalleryPhoto => {
        if (!isObject(photo)) return fail(`A photo in ${name} is missing.`);
        const alt = text(photo.alt, 200, `A photo description in ${name}`);
        const aspect = PHOTO_ASPECTS.includes(photo.aspect as never) ? photo.aspect as string : fail(`${alt} has an unknown shape.`);
        if (photo.feature !== undefined && typeof photo.feature !== "boolean") fail(`${alt} has an invalid layout.`);
        if (photo.src !== undefined && photo.media !== undefined) fail(`${alt} has two pictures.`);
        const entry: GalleryPhoto = {
          id: typeof photo.id === "string" && SLUG.test(photo.id) && photo.id.length <= 60 ? photo.id : fail(`${alt} has an invalid ID.`),
          alt, caption: optionalText(photo.caption, 160, `${alt} caption`), aspect, feature: photo.feature as boolean | undefined,
        };
        if (photo.src !== undefined) {
          entry.src = typeof photo.src === "string" && BUILT_IN_PHOTO.test(photo.src) ? photo.src : fail(`${alt} has an invalid picture.`);
        } else if (photo.media !== undefined) {
          entry.media = typeof photo.media === "string" && UUID.test(photo.media) ? photo.media : fail(`${alt} has an invalid picture.`);
          entry.sourceDate = photoDate(photo.sourceDate, `${alt}: the date taken`);
          entry.sourceUrl = photoUrl(photo.sourceUrl, `${alt}: the source link`);
        }
        return entry;
      }),
    };
  });
}

function hours(value: unknown, label: string): OpeningHours {
  if (!isObject(value)) return fail(`${label} are missing.`);
  const days = list(value.days, 1, 7, `${label} days`, (day) =>
    WEEKDAYS.includes(day as Weekday) ? day as Weekday : fail(`${label} has an unknown day.`));
  // Shown as a range ("Wed to Sun"), so the days must be consecutive within Monday..Sunday.
  const first = WEEKDAYS.indexOf(days[0]);
  if (days.some((day, index) => WEEKDAYS.indexOf(day) !== first + index)) {
    fail(`${label} days must be consecutive, Monday to Sunday.`);
  }
  if (typeof value.opens !== "string" || !TIME.test(value.opens) || typeof value.closes !== "string" || !TIME.test(value.closes)) {
    fail(`${label} need opening and closing times.`);
  }
  const opens = value.opens as string, closes = value.closes as string;
  if (opens >= closes) fail(`${label} must close after they open, on the same day.`);
  return { days, opens, closes };
}

/** Validates any input and returns a fresh document holding only known fields. Throws ContentError. */
export function validateDocument(input: unknown): ContentDocument {
  if (!isObject(input)) return fail("The content is missing.");
  if (new TextEncoder().encode(JSON.stringify(input)).length > MAX_DOCUMENT_BYTES) fail("The content is too large.");
  if (!isObject(input.hours)) return fail("Opening hours are missing.");
  const dining = hours(input.hours.dining, "Dining hours");
  const lunchSpecial = hours(input.hours.lunchSpecial, "Lunch special hours");
  if (lunchSpecial.days.some((day) => !dining.days.includes(day)) ||
      lunchSpecial.opens < dining.opens || lunchSpecial.closes > dining.closes) {
    fail("Lunch special hours must fall within dining hours.");
  }
  const document: ContentDocument = {
    hours: { dining, lunchSpecial },
    lunchSpecialPriceCents: cents(input.lunchSpecialPriceCents, "Lunch special price", true),
    lunchOptions: list(input.lunchOptions, 3, 3, "Lunch courses", (options, course) =>
      list(options, 1, 30, `Lunch ${LUNCH_COURSES[course]}`, (option) => text(option, 80, `A lunch ${LUNCH_COURSES[course]} option`))),
    menuCategories: list(input.menuCategories, 1, 30, "Menu sections", (raw) => {
      if (!isObject(raw)) return fail("A menu section is missing.");
      const name = text(raw.name, 80, "Menu section name");
      return {
        id: typeof raw.id === "string" && SLUG.test(raw.id) && raw.id.length <= 60 ? raw.id : fail(`${name} has an invalid ID.`),
        name,
        description: optionalText(raw.description, 400, `${name} description`),
        items: list(raw.items, 1, 100, `${name} dishes`, (item) => {
          if (!isObject(item)) return fail(`A dish in ${name} is missing.`);
          const dish = text(item.name, 120, `A dish name in ${name}`);
          const result = {
            name: dish,
            description: optionalText(item.description, 300, `${dish} description`),
            priceCents: item.priceCents === undefined ? undefined : cents(item.priceCents, `${dish} price`),
            priceNote: optionalText(item.priceNote, 40, `${dish} price note`),
          };
          if (result.priceCents === undefined && result.priceNote === undefined) fail(`${dish} needs a price or a price note.`);
          return result;
        }),
      };
    }),
    menuNotes: list(input.menuNotes, 0, 10, "Dining policies", (note) => text(note, 200, "A dining policy")),
    packages: list(input.packages, 1, 20, "Banquet packages", (raw) => {
      if (!isObject(raw)) return fail("A banquet package is missing.");
      const name = text(raw.name, 80, "Package name");
      return {
        id: typeof raw.id === "string" && SLUG.test(raw.id) && raw.id.length <= 60 ? raw.id : fail(`${name} has an invalid ID.`),
        name,
        pricePerPersonCents: cents(raw.pricePerPersonCents, `${name} price`, true),
        summary: text(raw.summary, 200, `${name} summary`),
        minGuests: raw.minGuests === undefined ? undefined
          : Number.isInteger(raw.minGuests) && (raw.minGuests as number) >= 1 && (raw.minGuests as number) <= 1000
            ? raw.minGuests as number : fail(`${name} minimum guests must be 1 to 1000.`),
        courses: list(raw.courses, 1, 8, `${name} courses`, (course) => {
          if (!isObject(course)) return fail(`A course in ${name} is missing.`);
          const label = text(course.label, 60, `A course name in ${name}`);
          return { label, items: list(course.items, 1, 40, `${name} ${label}`, (item) => text(item, 160, `A dish in ${name} ${label}`)) };
        }),
      };
    }),
    // Revisions saved before the gallery was editable have no gallery: they show the built-in one.
    gallery: gallery(input.gallery === undefined ? builtInGallery() : input.gallery),
  };
  unique(document.gallery.map((group) => group.id), "Gallery section IDs");
  unique(document.gallery.flatMap((group) => group.photos.map((photo) => photo.id)), "Gallery photo IDs");
  unique(document.menuCategories.map((category) => category.id), "Menu section IDs");
  unique(document.packages.map((tier) => tier.id), "Package IDs");
  for (const tier of document.packages) unique(tier.courses.map((course) => course.label), `${tier.name} course names`);
  for (const [index, options] of document.lunchOptions.entries()) unique(options, `Lunch ${LUNCH_COURSES[index]} options`);
  return document;
}

// Cents are exact integers; dollars are only for display (e.g. 250 → 2.5, shown as "$2.50").
const dollars = (value: number) => value / 100;
const toCents = (value: number) => Math.round(value * 100);

/** The built-in content from src/lib/data/: the first draft, and what the site shows before any publication. */
export function staticDocument(): ContentDocument {
  const courses = getLunchSpecialCourses();
  return validateDocument({
    hours: site.hours,
    lunchSpecialPriceCents: toCents(site.lunchSpecialPrice),
    lunchOptions: LUNCH_COURSES.map((label) => courses.find((course) => course.label === label)?.options),
    menuCategories: getMenuCategories().map((category) => ({ ...category,
      items: category.items.map(({ price, ...item }) => ({ ...item, priceCents: price === undefined ? undefined : toCents(price) })) })),
    menuNotes: [...menuNotes],
    packages: getPrivateEventTiers().map(({ pricePerPerson, ...tier }) => ({ ...tier, pricePerPersonCents: toCents(pricePerPerson) })),
    gallery: builtInGallery(),
  });
}

export function toSiteContent(document: ContentDocument): SiteContent {
  return {
    hours: document.hours,
    lunchSpecialPrice: dollars(document.lunchSpecialPriceCents),
    lunchCourses: LUNCH_COURSES.map((label, index) => ({ label, options: document.lunchOptions[index] })),
    menuCategories: document.menuCategories.map((category) => ({ ...category,
      items: category.items.map(({ priceCents, ...item }) => ({ ...item, price: priceCents === undefined ? undefined : dollars(priceCents) })) })),
    menuNotes: document.menuNotes,
    packages: document.packages.map(({ pricePerPersonCents, ...tier }) => ({ ...tier, pricePerPerson: dollars(pricePerPersonCents) })),
    gallery: document.gallery.map((group) => ({ ...group, photos: group.photos.map((photo) => (
      { id: photo.id, alt: photo.alt, caption: photo.caption, aspect: photo.aspect, feature: photo.feature,
        src: photo.media ? `/media/${photo.media}` : photo.src })) })),
  };
}
