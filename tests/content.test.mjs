import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { Script } from "node:vm";
import ts from "typescript";

function loadSource(path, imports = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    fileName: path, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const context = { exports: {}, structuredClone, FormData, TextEncoder, Number, String, JSON, Array, Set, Math, Buffer, File, Uint8Array, crypto: globalThis.crypto,
    require: (name) => { assert.ok(Object.hasOwn(imports, name), `Unexpected dependency: ${name}`); return imports[name]; } };
  new Script(outputText, { filename: path }).runInNewContext(context);
  return context.exports;
}

const menu = loadSource("src/lib/data/menu.ts");
const privateEvents = loadSource("src/lib/data/private-events.ts");
const site = loadSource("src/lib/data/site.ts");
const gallery = loadSource("src/lib/data/gallery.ts");
const sharp = createRequire(import.meta.url)("sharp");
const content = loadSource("src/lib/server/content/document.ts",
  { "@/lib/data/menu": menu, "@/lib/data/private-events": privateEvents, "@/lib/data/site": site, "@/lib/data/gallery": gallery });
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
  assert.deepEqual(rendered.gallery, plain(gallery.getPhotoGroups()));
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

// ---- Gallery photos (B10) ----
const mediaId = "0f8fad5b-d9cb-469f-a165-70867728950e";
const uploaded = (extra = {}) => ({ id: "p-1", alt: "A table", aspect: "aspect-3/2", media: mediaId, sourceDate: "2026-03-02", ...extra });

test("gallery: older versions without one show the built-in gallery; entries are validated", () => {
  const document = plain(content.staticDocument());
  delete document.gallery;
  assert.deepEqual(plain(content.validateDocument(document).gallery), plain(gallery.getPhotoGroups()));
  const withPhoto = (photo) => { const d = plain(content.staticDocument()); d.gallery[0].photos.push(photo); return d; };
  const ok = content.validateDocument(withPhoto(uploaded({ sourceUrl: "https://example.com/p/1", junk: 1 }))).gallery[0].photos.at(-1);
  assert.deepEqual(plain(ok), { id: "p-1", alt: "A table", aspect: "aspect-3/2", media: mediaId, sourceDate: "2026-03-02", sourceUrl: "https://example.com/p/1" });
  const rendered = content.toSiteContent(content.validateDocument(withPhoto(uploaded()))).gallery[0].photos.at(-1);
  assert.equal(rendered.src, `/media/${mediaId}`);
  for (const [bad, pattern] of [
    [uploaded({ aspect: "aspect-9/1" }), /unknown shape/], [uploaded({ media: "../x" }), /invalid picture/],
    [uploaded({ sourceDate: undefined }), /must be a date/], [uploaded({ sourceDate: "2025-12-31" }), /2026 or later/],
    [uploaded({ sourceDate: "2026-02-30" }), /must be a date/], [uploaded({ sourceDate: "2099-01-01" }), /future/],
    [uploaded({ sourceUrl: "http://example.com" }), /https/], [uploaded({ src: "/photos/a.jpg" }), /two pictures/],
    [{ id: "p-2", alt: "x", aspect: "aspect-3/2", src: "//evil.example/a.jpg" }, /invalid picture/],
    [{ id: "p-2", alt: "x", aspect: "aspect-3/2", src: "/photos/../secret" }, /invalid picture/],
    [uploaded({ alt: "" }), /required/], [uploaded({ id: "bad id" }), /invalid ID/], [uploaded({ id: "dining-room-full" }), /duplicates/],
  ]) assert.throws(() => content.validateDocument(withPhoto(bad)), (e) => e instanceof content.ContentError && pattern.test(e.message), JSON.stringify(bad));
});

test("editor: gallery edits keep, replace, remove and add photos without touching anything else", () => {
  const document = content.staticDocument();
  const index = document.gallery.findIndex((g) => g.id === "rooms");
  const section = editor.findSection(document, "gallery-rooms");
  assert.equal(editor.sectionSlug(document, section), "gallery-rooms");
  const group = document.gallery[index];
  const entries = [["name", "The rooms"], ["description", "Where we host."]];
  group.photos.forEach((photo, row) => entries.push([`photo_${row}_alt`, photo.alt], [`photo_${row}_caption`, row === 1 ? "The bar" : ""]));
  const stored = new Map([[0, { media: mediaId, aspect: "aspect-4/3", date: "2026-03-02", url: "https://example.com/p" }]]);
  const next = editor.applySection(document, section, form([...entries, [`photo_${group.photos.length}_alt`, "Added"]]), stored);
  const photos = next.gallery[index].photos;
  // Row 0 was replaced by an upload, row 1 got a caption, the entrance keeps its built-in file, the empty trailing slot adds nothing.
  assert.deepEqual(plain([photos[0].id, photos[0].media, photos[0].aspect]), ["dining-room-full", mediaId, "aspect-4/3"]);
  assert.equal(photos[0].src, undefined);
  assert.equal(photos[0].feature, true);
  assert.equal(photos[1].caption, "The bar");
  assert.equal(photos.find((p) => p.id === "entrance").src, "/photos/entrance-night.jpg");
  assert.equal(photos.length, group.photos.length);
  assert.deepEqual(plain(next.menuCategories), plain(document.menuCategories));
  // A new photo needs its upload; removal drops an entry; a missing description is refused.
  const added = editor.applySection(document, section, form([...entries, ["photo_4_alt", "Added"], ["photo_2_remove", "on"]]), new Map([[4, stored.get(0)]]));
  assert.equal(added.gallery[index].photos.length, group.photos.length);
  assert.equal(added.gallery[index].photos.at(-1).alt, "Added");
  assert.match(added.gallery[index].photos.at(-1).id, /^p-[0-9a-f]{8}$/);
  assert.ok(!added.gallery[index].photos.some((p) => p.id === "dining-room-detail"));
  assert.throws(() => editor.applySection(document, section, form(entries.slice(0, 2)), stored), /required/);
  // Chosen files need a real date and https link before anything is stored.
  const file = new File(["x"], "a.jpg");
  const chosen = (extra) => form([...entries, ["photo_0_file", file], ...extra]);
  assert.throws(() => editor.photoUploads(chosen([]), 6), /date taken/);
  assert.throws(() => editor.photoUploads(chosen([["photo_0_date", "2026-03-02"], ["photo_0_url", "ftp://x"]]), 6), /https/);
  assert.deepEqual(plain(editor.photoUploads(chosen([["photo_0_date", "2026-03-02"]]), 6).map((u) => [u.row, u.date, u.url])), [[0, "2026-03-02", null]]);
  assert.equal(editor.photoUploads(chosen([["photo_0_remove", "on"]]), 6).length, 0);
});

const media = loadSource("src/lib/server/content/media.ts", {
  "server-only": {}, sharp: { default: sharp }, "../inquiries/persistence": {}, "@/lib/data/gallery": gallery, "./document": content,
});
const picture = (width, height, format = "jpeg") => sharp({ create: { width, height, channels: 3, background: "#884400" } })[format]().toBuffer();

test("photo upload: real images are re-encoded as small WebP; disguised, tiny or odd files are refused", async () => {
  const wide = await media.processPhoto(await picture(3000, 2000));
  assert.deepEqual([wide.width, wide.height, wide.aspect], [2000, 1333, "aspect-3/2"]);
  assert.equal((await sharp(wide.data).metadata()).format, "webp");
  assert.equal((await media.processPhoto(await picture(900, 1200, "png"))).aspect, "aspect-3/4");
  assert.equal((await media.processPhoto(await picture(1000, 1000))).aspect, "aspect-square");
  // Camera rotation is applied and no metadata (location, camera) survives re-encoding.
  const rotated = await sharp(await picture(1200, 800)).withMetadata({ orientation: 6, exif: { IFD0: { Make: "SecretCam" } } }).toBuffer();
  assert.equal((await sharp(rotated).metadata()).orientation, 6);
  const turned = await media.processPhoto(rotated);
  assert.deepEqual([turned.width, turned.height], [800, 1200]);
  assert.equal((await sharp(turned.data).metadata()).exif, undefined);
  const refused = async (bytes, pattern) => assert.rejects(media.processPhoto(bytes),
    (e) => e instanceof content.ContentError && pattern.test(e.message));
  await refused(Buffer.from("<script>alert(1)</script>"), /could not be read/);
  await refused(Buffer.from("GIF89a" + "\0".repeat(40)), /could not be read/);
  await refused(await picture(1000, 1000, "gif"), /JPEG, PNG or WebP/);
  await refused(Buffer.concat([await picture(1000, 1000), Buffer.alloc(4 * 1024 * 1024)]), /larger than 3.5 MB/);
  await refused(await picture(300, 300), /too small/);
  await refused(await picture(3000, 600), /too narrow or too wide/);
  await refused(new Uint8Array(), /Choose a photo/);
  assert.equal(media.isMediaId(mediaId), true);
  assert.equal(media.isMediaId(mediaId + "/../x"), false);
});
