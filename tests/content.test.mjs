import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Script } from "node:vm";
import ts from "typescript";

function loadSource(path, imports = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const context = { exports: {}, structuredClone, FormData, TextEncoder, Number, String, JSON, Array, Set, Math,
    require: (name) => { assert.ok(Object.hasOwn(imports, name), `Unexpected dependency: ${name}`); return imports[name]; } };
  new Script(outputText, { filename: path }).runInNewContext(context);
  return context.exports;
}

const menu = loadSource("src/lib/data/menu.ts");
const privateEvents = loadSource("src/lib/data/private-events.ts");
const site = loadSource("src/lib/data/site.ts");
const content = loadSource("src/lib/server/content/document.ts",
  { "@/lib/data/menu": menu, "@/lib/data/private-events": privateEvents, "@/lib/data/site": site });
const editor = loadSource("src/lib/server/content/editor.ts", { "./document": content });
const plain = (value) => JSON.parse(JSON.stringify(value));
const invalid = (change, pattern) => {
  const document = plain(content.staticDocument());
  change(document);
  assert.throws(() => content.validateDocument(document), (error) => error instanceof content.ContentError && pattern.test(error.message));
};

test("the built-in content is a valid document and renders exactly as the static data", () => {
  const rendered = plain(content.toSiteContent(content.staticDocument()));
  assert.deepEqual(rendered.menuCategories, plain(menu.getMenuCategories()));
  assert.deepEqual(rendered.packages, plain(privateEvents.getPrivateEventTiers()));
  assert.deepEqual(rendered.lunchCourses, plain(menu.getLunchSpecialCourses()));
  assert.deepEqual(rendered.hours, plain(site.site.hours));
  assert.deepEqual(rendered.menuNotes, [...menu.menuNotes]);
  assert.equal(rendered.lunchSpecialPrice, site.site.lunchSpecialPrice);
  // Prices are stored as integer cents: $2.50 oysters are 250.
  const oysters = content.staticDocument().menuCategories.flatMap((c) => c.items).find((i) => i.name === "Oysters Blue Point");
  assert.equal(oysters.priceCents, 250);
});

test("validation keeps only known fields", () => {
  const document = plain(content.staticDocument());
  document.phone = "+1 000"; document.reservationUrl = "https://evil.example"; document.packages[0].html = "<b>x</b>";
  const clean = plain(content.validateDocument(document));
  assert.equal(clean.phone, undefined);
  assert.equal(clean.reservationUrl, undefined);
  assert.equal(clean.packages[0].html, undefined);
});

test("invalid prices, schedules, text and shapes cannot be saved or published", () => {
  invalid((d) => { d.menuCategories[0].items[0].priceCents = 0; }, /between/);
  invalid((d) => { d.menuCategories[0].items[0].priceCents = 12.5; }, /between/);
  invalid((d) => { d.menuCategories[0].items[0].priceCents = "18"; }, /between/);
  invalid((d) => { d.menuCategories[0].items[0].priceCents = 1_000_001; }, /between/);
  invalid((d) => { d.packages[0].pricePerPersonCents = 7550; }, /whole dollars/);
  invalid((d) => { d.lunchSpecialPriceCents = 2550; }, /whole dollars/);
  invalid((d) => { delete d.menuCategories[0].items[0].priceCents; delete d.menuCategories[0].items[0].priceNote; }, /price or a price note/);
  invalid((d) => { d.hours.dining.days = ["Wednesday", "Friday"]; }, /consecutive/);
  invalid((d) => { d.hours.dining.days = ["Sunday", "Monday"]; }, /consecutive/);
  invalid((d) => { d.hours.dining.days = ["Funday"]; }, /unknown day/);
  invalid((d) => { d.hours.dining.days = []; }, /days needs/);
  invalid((d) => { d.hours.dining.closes = "10:00"; }, /close after/);
  invalid((d) => { d.hours.dining.opens = "24:00"; }, /times/);
  invalid((d) => { d.hours.lunchSpecial.days = ["Monday"]; }, /within dining/);
  invalid((d) => { d.hours.lunchSpecial.closes = "23:30"; }, /within dining/);
  invalid((d) => { d.lunchOptions = d.lunchOptions.slice(0, 2); }, /Lunch courses needs 3/);
  invalid((d) => { d.lunchOptions[0] = []; }, /Lunch Soup/);
  invalid((d) => { d.menuCategories[0].name = " Salads"; }, /extra spaces/);
  invalid((d) => { d.menuCategories[0].items[0].name = "Line\nbreak"; }, /line breaks/);
  invalid((d) => { d.menuCategories[0].items[0].name = "Sep arator"; }, /line breaks/);
  invalid((d) => { d.menuCategories[0].items[0].name = ""; }, /required/);
  invalid((d) => { d.menuCategories[0].items[0].name = "x".repeat(121); }, /longer than 120/);
  invalid((d) => { d.menuCategories[1].id = d.menuCategories[0].id; }, /duplicates/);
  invalid((d) => { d.packages[0].id = "Not A Slug"; }, /invalid ID/);
  invalid((d) => { d.packages[0].courses.push({ ...d.packages[0].courses[0] }); }, /duplicates/);
  invalid((d) => { d.packages[0].minGuests = 0; }, /minimum guests/);
  invalid((d) => { d.menuNotes = Array(11).fill("Note"); }, /0 to 10/);
  invalid((d) => { d.padding = "x".repeat(200_001); }, /too large/);
  // Counted in UTF-8 bytes like the database: 110,000 Cyrillic letters are 220,000 bytes.
  invalid((d) => { d.padding = "ж".repeat(110_000); }, /too large/);
  assert.throws(() => content.validateDocument(null), content.ContentError);
  assert.throws(() => content.validateDocument([]), content.ContentError);
});

function form(entries) {
  const data = new FormData();
  for (const [name, value] of entries) data.append(name, value);
  return data;
}

test("editor: dollars parse exactly to cents", () => {
  assert.deepEqual(["18", "2.5", "2.50", "$ 14", "0.07", ""].map((v) => editor.parseDollars(v, "x")), [1800, 250, 250, 1400, 7, undefined]);
  for (const bad of ["1,000", "2.505", "-3", "abc", "123456"]) assert.throws(() => editor.parseDollars(bad, "x"), content.ContentError);
  assert.deepEqual([1800, 250, 7, undefined].map(editor.formatDollars), ["18", "2.50", "0.07", ""]);
});

test("editor: a menu section edit changes, removes and adds dishes without touching anything else", () => {
  const document = content.staticDocument();
  const section = editor.findSection(document, "menu-oysters-tartare-ceviche");
  const category = document.menuCategories[section.index];
  const n = category.items.length;
  const entries = [["name", "Oysters & Tartare"], ["description", ""]];
  category.items.forEach((item, row) => entries.push([`item_${row}_name`, item.name], [`item_${row}_description`, item.description ?? ""],
    [`item_${row}_price`, editor.formatDollars(item.priceCents)], [`item_${row}_note`, item.priceNote ?? ""]));
  entries.push(["item_0_price", "2.75"], ["item_1_remove", "on"], [`item_${n}_name`, " Caviar Blini "], [`item_${n}_price`, "$30"]);
  // FormData.get returns the first value; replace rather than append for row 0's price.
  const data = form(entries.filter(([name], i, all) => all.findLastIndex(([other]) => other === name) === i));
  const next = editor.applySection(document, section, data);
  const items = next.menuCategories[section.index].items;
  assert.equal(next.menuCategories[section.index].name, "Oysters & Tartare");
  assert.equal(items[0].priceCents, 275);
  assert.ok(!items.some((item) => item.name === category.items[1].name));
  assert.deepEqual(plain(items.at(-1)), { name: "Caviar Blini", priceCents: 3000 });
  assert.equal(items.length, n);
  assert.deepEqual(plain({ ...next, menuCategories: [] }), plain({ ...document, menuCategories: [] }));
  assert.equal(editor.sectionSlug(next, section), "menu-oysters-tartare-ceviche");
  // A typo is refused with a message naming the dish.
  assert.throws(() => editor.applySection(document, section, form([...entries, ["item_0_price", "2,75"]].reverse())),
    (error) => /Oysters Blue Point: enter a price/.test(error.message));
});

test("editor: hours, lunch and package edits; IDs stay fixed; unknown sections are refused", () => {
  const document = content.staticDocument();
  const hours = editor.applySection(document, { kind: "hours" }, form([
    ...["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => ["dining_days", day]),
    ["dining_opens", "11:00"], ["dining_closes", "22:00"], ["lunch_days", "Wednesday"], ["lunch_opens", "12:00"], ["lunch_closes", "16:00"],
    ["lunch_price", "27"], ["lunch_0", "Borsh\r\n\r\n  Pea  \r\n"], ["lunch_1", "Caesar"], ["lunch_2", "Dolma"], ["notes", ""],
  ]));
  assert.deepEqual(plain(hours.hours.dining), { days: ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: "11:00", closes: "22:00" });
  assert.deepEqual(plain([hours.lunchSpecialPriceCents, hours.lunchOptions[0], hours.menuNotes]), [2700, ["Borsh", "Pea"], []]);
  assert.equal(content.toSiteContent(hours).lunchCourses[2].label, "Entrée");

  const section = editor.findSection(document, "package-banquet-140");
  const tier = document.packages[section.index];
  const entries = [["name", "Banquet"], ["price", "145"], ["summary", tier.summary]];
  tier.courses.forEach((course, slot) => entries.push([`course_${slot}_label`, slot === 0 ? "" : course.label], [`course_${slot}_items`, slot === 0 ? "" : course.items.join("\n")]));
  entries.push([`course_${tier.courses.length}_label`, "Late snack"], [`course_${tier.courses.length}_items`, "Blini"]);
  const next = editor.applySection(document, section, form(entries));
  const edited = next.packages[section.index];
  assert.deepEqual([edited.id, edited.pricePerPersonCents, edited.courses.length, edited.courses.at(-1).label], ["banquet-140", 14500, tier.courses.length, "Late snack"]);
  assert.equal(privateEvents.packageLabel(content.toSiteContent(next).packages[section.index]), "Banquet, $145 per person");
  assert.throws(() => editor.applySection(document, section, form([...entries.slice(0, 1), ["price", "145.50"], ...entries.slice(2)])), /whole dollars/);
  assert.throws(() => editor.applySection(document, section, form([["name", "Banquet"], ["price", "145"], ["summary", "x"], ["course_0_label", "Only a name"]])), /needs 1 to 40/);
  for (const slug of ["menu-", "package-nope", "menu-../hours", "constructor", ""]) assert.equal(editor.findSection(document, slug), null);
});
