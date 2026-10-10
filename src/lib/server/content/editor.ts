import type { Weekday } from "@/lib/data/site";
import { ContentError, LUNCH_COURSES, photoDate, photoUrl, validateDocument, WEEKDAYS, type ContentDocument } from "./document";

/** One editor page: "hours" (hours, lunch special, dining policies), "menu-<section id>", "package-<package id>" or "gallery-<section id>". */
export type Section = { kind: "hours" } | { kind: "menu"; index: number } | { kind: "package"; index: number } | { kind: "gallery"; index: number };
/** Blank dish rows / course slots offered for additions on each editor page. */
export const BLANK_ROWS = 5;
/** Empty photo slots offered for additions on each gallery page. */
export const BLANK_PHOTOS = 2;

export function findSection(document: ContentDocument, slug: string): Section | null {
  if (slug === "hours") return { kind: "hours" };
  const menu = slug.startsWith("menu-") ? document.menuCategories.findIndex((c) => c.id === slug.slice(5)) : -1;
  if (menu >= 0) return { kind: "menu", index: menu };
  const tier = slug.startsWith("package-") ? document.packages.findIndex((p) => p.id === slug.slice(8)) : -1;
  if (tier >= 0) return { kind: "package", index: tier };
  const photos = slug.startsWith("gallery-") ? document.gallery.findIndex((g) => g.id === slug.slice(8)) : -1;
  return photos >= 0 ? { kind: "gallery", index: photos } : null;
}

export const sectionSlug = (document: ContentDocument, section: Section) =>
  section.kind === "hours" ? "hours"
    : section.kind === "menu" ? `menu-${document.menuCategories[section.index].id}`
      : section.kind === "gallery" ? `gallery-${document.gallery[section.index].id}`
        : `package-${document.packages[section.index].id}`;

/** "12.50" → 1250. Empty → undefined. Throws on anything else. */
export function parseDollars(value: string, label: string): number | undefined {
  const match = /^\$?\s*(\d{1,5})(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!value.trim()) return undefined;
  if (!match) throw new ContentError(`${label}: enter a price like 18 or 2.50.`);
  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}

const formatter = (cents: number) => cents % 100 ? (cents / 100).toFixed(2) : String(cents / 100);
/** 1250 → "12.50", 1800 → "18" (editor field values). */
export const formatDollars = (cents: number | undefined) => cents === undefined ? "" : formatter(cents);

function reader(form: FormData) {
  const get = (name: string) => {
    const value = form.get(name);
    // Browsers send CRLF in textareas; bound every field before parsing.
    return typeof value === "string" ? value.replace(/\r\n?/g, "\n").slice(0, 20_000) : "";
  };
  return {
    text: (name: string) => get(name).trim(),
    optional: (name: string) => get(name).trim() || undefined,
    /** One entry per non-empty line. */
    lines: (name: string) => get(name).split("\n").map((line) => line.trim()).filter(Boolean),
    days: (name: string) => WEEKDAYS.filter((day) => form.getAll(name).includes(day)) as Weekday[],
    checked: (name: string) => form.get(name) === "on",
  };
}

/** A photo file chosen on a gallery page, with where it came from. Row numbers match the form fields `photo_<row>_*`. */
export type PhotoUpload = { row: number; file: File; date: string; url?: string };
/** A chosen file after it was processed and stored. */
export type StoredPhoto = { media: string; aspect: string; date: string; url?: string };

/** The files chosen on a gallery page (rows marked for removal are ignored). Throws ContentError for missing or invalid provenance. */
export function photoUploads(form: FormData, rows: number): PhotoUpload[] {
  const field = reader(form);
  const uploads: PhotoUpload[] = [];
  for (let row = 0; row < rows; row++) {
    const file = form.get(`photo_${row}_file`);
    if (!(file instanceof File) || file.size === 0 || field.checked(`photo_${row}_remove`)) continue;
    uploads.push({ row, file,
      date: photoDate(field.text(`photo_${row}_date`), `Photo ${row + 1}: the date taken`),
      url: photoUrl(field.optional(`photo_${row}_url`), `Photo ${row + 1}: the source link`) });
  }
  return uploads;
}

/** Returns a validated copy of `document` with one section replaced from the submitted form. Throws ContentError.
 * `stored` holds the photos uploaded for a gallery page, by row.
 */
export function applySection(document: ContentDocument, section: Section, form: FormData, stored = new Map<number, StoredPhoto>()): ContentDocument {
  const field = reader(form);
  const next = structuredClone(document);
  if (section.kind === "hours") {
    next.hours = {
      dining: { days: field.days("dining_days"), opens: field.text("dining_opens"), closes: field.text("dining_closes") },
      lunchSpecial: { days: field.days("lunch_days"), opens: field.text("lunch_opens"), closes: field.text("lunch_closes") },
    };
    next.lunchSpecialPriceCents = parseDollars(field.text("lunch_price"), "Lunch special price") ?? 0;
    next.lunchOptions = LUNCH_COURSES.map((_, index) => field.lines(`lunch_${index}`));
    next.menuNotes = field.lines("notes");
  } else if (section.kind === "gallery") {
    const group = next.gallery[section.index];
    const photos = group.photos;
    group.name = field.text("name");
    group.description = field.optional("description");
    group.photos = [];
    // Rows after the existing photos are the blank slots; an existing photo keeps its picture unless a file was chosen.
    for (let row = 0; row < photos.length + BLANK_PHOTOS; row++) {
      const upload = stored.get(row);
      const current = photos[row];
      if (field.checked(`photo_${row}_remove`) || (!current && !upload)) continue;
      const photo = { ...(current ?? { id: `p-${globalThis.crypto.randomUUID().slice(0, 8)}`, aspect: "aspect-4/3" }),
        alt: field.text(`photo_${row}_alt`), caption: field.optional(`photo_${row}_caption`) };
      if (upload) {
        delete photo.src;
        Object.assign(photo, { media: upload.media, aspect: upload.aspect, sourceDate: upload.date, sourceUrl: upload.url });
      }
      group.photos.push(photo);
    }
  } else if (section.kind === "menu") {
    const category = next.menuCategories[section.index];
    const rows = category.items.length + BLANK_ROWS;
    category.name = field.text("name");
    category.description = field.optional("description");
    category.items = [];
    for (let row = 0; row < rows; row++) {
      const name = field.text(`item_${row}_name`);
      if (field.checked(`item_${row}_remove`) || !name) continue;
      category.items.push({
        name,
        description: field.optional(`item_${row}_description`),
        priceCents: parseDollars(field.text(`item_${row}_price`), name),
        priceNote: field.optional(`item_${row}_note`),
      });
    }
  } else {
    const tier = next.packages[section.index];
    const slots = tier.courses.length + 1;
    tier.name = field.text("name");
    tier.pricePerPersonCents = parseDollars(field.text("price"), `${tier.name || "Package"} price`) ?? 0;
    tier.summary = field.text("summary");
    tier.courses = [];
    for (let slot = 0; slot < slots; slot++) {
      const label = field.text(`course_${slot}_label`), items = field.lines(`course_${slot}_items`);
      // A course with neither a name nor dishes is removed.
      if (label || items.length) tier.courses.push({ label, items });
    }
  }
  return validateDocument(next);
}
