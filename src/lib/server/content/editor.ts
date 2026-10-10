import type { Weekday } from "@/lib/data/site";
import { ContentError, LUNCH_COURSES, validateDocument, WEEKDAYS, type ContentDocument } from "./document";

/** One editor page: "hours" (hours, lunch special, dining policies), "menu-<section id>" or "package-<package id>". */
export type Section = { kind: "hours" } | { kind: "menu"; index: number } | { kind: "package"; index: number };
/** Blank dish rows / course slots offered for additions on each editor page. */
export const BLANK_ROWS = 5;

export function findSection(document: ContentDocument, slug: string): Section | null {
  if (slug === "hours") return { kind: "hours" };
  const menu = slug.startsWith("menu-") ? document.menuCategories.findIndex((c) => c.id === slug.slice(5)) : -1;
  if (menu >= 0) return { kind: "menu", index: menu };
  const tier = slug.startsWith("package-") ? document.packages.findIndex((p) => p.id === slug.slice(8)) : -1;
  return tier >= 0 ? { kind: "package", index: tier } : null;
}

export const sectionSlug = (document: ContentDocument, section: Section) =>
  section.kind === "hours" ? "hours"
    : section.kind === "menu" ? `menu-${document.menuCategories[section.index].id}`
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

/** Returns a validated copy of `document` with one section replaced from the submitted form. Throws ContentError. */
export function applySection(document: ContentDocument, section: Section, form: FormData): ContentDocument {
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
