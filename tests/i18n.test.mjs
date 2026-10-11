import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Script } from "node:vm";
import ts from "typescript";

function loadSource(path, imports = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const context = { exports: {}, Number, String, Object, Intl,
    require: (name) => { assert.ok(Object.hasOwn(imports, name), `Unexpected dependency: ${name}`); return imports[name]; } };
  new Script(outputText, { filename: path }).runInNewContext(context);
  return context.exports;
}

const menu = loadSource("src/lib/data/menu.ts");
const privateEvents = loadSource("src/lib/data/private-events.ts");
const gallery = loadSource("src/lib/data/gallery.ts");
const site = loadSource("src/lib/data/site.ts");
const locales = loadSource("src/lib/i18n/locales.ts");
const { contentRu } = loadSource("src/lib/i18n/content-ru.ts");
const { en } = loadSource("src/lib/i18n/en.ts", {});
const { ru } = loadSource("src/lib/i18n/ru.ts", {});

/** Every menu, banquet and gallery sentence a visitor can read. */
function builtInStrings() {
  const found = new Set();
  const add = (text) => text && found.add(text);
  for (const category of menu.getMenuCategories()) {
    add(category.name);
    add(category.description);
    for (const item of category.items) [item.name, item.description, item.priceNote].forEach(add);
  }
  for (const course of menu.getLunchSpecialCourses()) [course.label, ...course.options].forEach(add);
  menu.menuNotes.forEach(add);
  for (const tier of privateEvents.getPrivateEventTiers()) {
    add(tier.name);
    add(tier.summary);
    for (const course of tier.courses) [course.label, ...course.items].forEach(add);
  }
  for (const group of gallery.getPhotoGroups()) {
    add(group.name);
    add(group.description);
    for (const photo of group.photos) [photo.alt, photo.caption].forEach(add);
  }
  return [...found];
}

function shape(value) {
  if (typeof value === "function") return "function";
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]));
  return typeof value;
}

test("every built-in menu, banquet and gallery string has a Russian translation, and none are stray", () => {
  const strings = builtInStrings();
  assert.deepEqual(strings.filter((text) => !(text in contentRu)), []);
  assert.deepEqual(Object.keys(contentRu).filter((text) => !strings.includes(text)), []);
});

test("the Russian dictionary has exactly the English keys and kinds of value", () => {
  assert.equal(JSON.stringify(shape(ru)), JSON.stringify(shape(en)));
});

test("Russian meta descriptions fit a search snippet", () => {
  const hours = "Ср–Вс, 11:00–23:00";
  const descriptions = [
    ru.meta.homeDescription(25, hours), ru.meta.menuDescription(25, hours), ru.meta.eventsDescription(75, 230),
    ru.meta.contactDescription("2900 Coney Island Ave, Brooklyn, NY 11235", hours, "(718) 555-0100"),
    ru.meta.aboutDescription, ru.meta.galleryDescription, ru.meta.testimonialsDescription,
  ];
  for (const text of descriptions) assert.ok(text.length <= 175, `${text.length} chars: ${text}`);
});

test("language paths: English stays at the root, Russian is under /ru", () => {
  const { localePath, stripLocale, hasLocale } = locales;
  assert.equal(localePath("en", "/menu"), "/menu");
  assert.equal(localePath("ru", "/menu"), "/ru/menu");
  assert.equal(localePath("ru", "/"), "/ru");
  assert.equal(localePath("ru", "https://yelp.com"), "https://yelp.com");
  assert.equal(stripLocale("/ru/menu"), "/menu");
  assert.equal(stripLocale("/ru"), "/");
  assert.equal(stripLocale("/menu"), "/menu");
  assert.equal(stripLocale("/en/menu"), "/menu");
  assert.equal(stripLocale("/en"), "/");
  assert.ok(hasLocale("ru") && hasLocale("en") && !hasLocale("fr"));
});

test("hours read naturally in Russian", () => {
  const text = site.formatHours(site.site.hours.dining, "ru");
  assert.match(text, /Ср/);
  assert.match(text, /\d{2}:\d{2}/);
  assert.doesNotMatch(text, /AM|PM/);
});
