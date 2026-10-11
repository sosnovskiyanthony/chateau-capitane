import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentEditorForm } from "@/components/admin/content-editor-form";
import { PhotoFileInput } from "@/components/admin/photo-file-input";
import { PlaceholderImage } from "@/components/ui/placeholder-image";
import { PageHeader } from "@/components/ui/page-header";
import { labelClasses, linkClasses } from "@/components/ui/styles";
import { requireStaff } from "@/lib/server/auth/session";
import { draftDocument, getContentState } from "@/lib/server/content/content";
import { LUNCH_COURSES, WEEKDAYS, type ContentDocument } from "@/lib/server/content/document";
import { BLANK_PHOTOS, BLANK_ROWS, findSection, formatDollars } from "@/lib/server/content/editor";
import { getPersistenceConfiguration } from "@/lib/server/inquiries/persistence";

const fieldClasses = "mt-2 w-full border border-ivory/45 bg-ink-950 px-3 py-2.5 text-ivory focus-visible:border-gold focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold";
const legendClasses = "font-serif text-2xl text-ivory";
// Same as the server check: 18, 2.50 or $18.
const PRICE = String.raw`\$?\s*\d{1,5}(\.\d{1,2})?`;
const WHOLE_PRICE = String.raw`\$?\s*\d{1,5}`;

type FieldProps = { name: string; label: string; value?: string; max: number; required?: boolean; hint?: string };

function Text({ name, label, value, max, required, hint }: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className={labelClasses}>{label}</label>
      <input id={name} name={name} defaultValue={value} maxLength={max} required={required} className={fieldClasses}
        aria-describedby={hint ? `${name}-hint` : undefined} />
      {hint ? <p id={`${name}-hint`} className="mt-1.5 text-xs text-ivory-muted">{hint}</p> : null}
    </div>
  );
}

function Price({ name, label, value, required, whole }: { name: string; label: string; value?: number; required?: boolean; whole?: boolean }) {
  return (
    <div>
      <label htmlFor={name} className={labelClasses}>{label}</label>
      <input id={name} name={name} defaultValue={formatDollars(value)} inputMode="decimal" required={required}
        pattern={whole ? WHOLE_PRICE : PRICE} maxLength={12} title={whole ? "Whole dollars, for example 140" : "For example 18 or 2.50"}
        className={fieldClasses} />
    </div>
  );
}

/** One entry per line, for lists of dishes or options. */
function Lines({ name, label, values, rows = 6 }: { name: string; label: string; values: string[]; rows?: number }) {
  return (
    <div>
      <label htmlFor={name} className={labelClasses}>{label}</label>
      <p id={`${name}-hint`} className="mt-1 text-xs text-ivory-muted">One per line. Empty lines are ignored.</p>
      <textarea id={name} name={name} defaultValue={values.join("\n")} rows={rows} maxLength={8000}
        aria-describedby={`${name}-hint`} className={fieldClasses} />
    </div>
  );
}

function Hours({ prefix, legend, hours }: { prefix: string; legend: string; hours: ContentDocument["hours"]["dining"] }) {
  return (
    <fieldset className="grid gap-5">
      <legend className={legendClasses}>{legend}</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {WEEKDAYS.map((day) => (
          <label key={day} className="inline-flex min-h-11 items-center gap-2 text-ivory">
            <input type="checkbox" name={`${prefix}_days`} value={day} defaultChecked={hours.days.includes(day)}
              className="size-5 accent-gold" />
            {day}
          </label>
        ))}
      </div>
      <p className="text-xs text-ivory-muted">Choose consecutive days; they are shown as a range, for example &ldquo;Wed to Sun&rdquo;.</p>
      <div className="grid gap-5 sm:grid-cols-2">
        {(["opens", "closes"] as const).map((key) => (
          <div key={key}>
            <label htmlFor={`${prefix}_${key}`} className={labelClasses}>{key === "opens" ? "Opens" : "Closes"}</label>
            <input id={`${prefix}_${key}`} name={`${prefix}_${key}`} type="time" required defaultValue={hours[key]} className={fieldClasses} />
          </div>
        ))}
      </div>
    </fieldset>
  );
}

export default async function ContentSectionPage({ params }: PageProps<"/[lang]/admin/content/[section]">) {
  const { section: slug } = await params;
  const staff = await requireStaff(`/admin/content/${encodeURIComponent(slug)}`);
  const configuration = getPersistenceConfiguration();
  const state = configuration ? await getContentState(configuration, staff) : undefined;
  const back = <p className="mt-6 text-sm"><Link href="/admin/content" className={linkClasses}>Back to website content</Link></p>;
  if (!state) {
    return (
      <>
        <PageHeader eyebrow="Staff" title="Edit content" />
        <p role="alert" className="mt-10 text-ivory-muted">Content editing is unavailable right now. Please try again shortly.</p>
        {back}
      </>
    );
  }
  const document = draftDocument(state);
  const section = findSection(document, slug);
  if (!section) notFound();
  const base = state.draft?.id ?? null;

  let title: string, fields: React.ReactNode;
  if (section.kind === "hours") {
    title = "Hours and lunch special";
    fields = (
      <>
        <Hours prefix="dining" legend="Dining hours" hours={document.hours.dining} />
        <Hours prefix="lunch" legend="Lunch special hours" hours={document.hours.lunchSpecial} />
        <fieldset className="grid gap-5">
          <legend className={legendClasses}>Lunch special</legend>
          <p className="text-sm text-ivory-muted">Always three courses, one from each; beverages not included. Those rules are fixed.</p>
          <Price name="lunch_price" label="Price (whole dollars)" value={document.lunchSpecialPriceCents} required whole />
          {LUNCH_COURSES.map((course, index) => (
            <Lines key={course} name={`lunch_${index}`} label={`${course} options`} values={document.lunchOptions[index]} />
          ))}
        </fieldset>
        <fieldset className="grid gap-5">
          <legend className={legendClasses}>Dining policies</legend>
          <Lines name="notes" label="Policies shown under the menu" values={document.menuNotes} rows={4} />
        </fieldset>
      </>
    );
  } else if (section.kind === "menu") {
    const category = document.menuCategories[section.index];
    const rows = [...category.items, ...Array.from({ length: BLANK_ROWS }, () => undefined)];
    title = `Menu: ${category.name}`;
    fields = (
      <>
        <Text name="name" label="Section name" value={category.name} max={80} required />
        <Text name="description" label="Section note (optional)" value={category.description} max={400} />
        {rows.map((item, row) => (
          <fieldset key={row} className="grid gap-4 border-t border-ivory/15 pt-6 sm:grid-cols-2">
            <legend className="text-sm font-semibold text-gold">{item ? `Dish ${row + 1}` : "New dish (fill in to add)"}</legend>
            <Text name={`item_${row}_name`} label="Name" value={item?.name} max={120} required={Boolean(item)} />
            <Text name={`item_${row}_description`} label="Description (optional)" value={item?.description} max={300} />
            <Price name={`item_${row}_price`} label="Price in dollars" value={item?.priceCents} />
            <Text name={`item_${row}_note`} label="Price note (optional)" value={item?.priceNote} max={40}
              hint="For example “each” or “Market price”. Needed when there is no price." />
            {item ? (
              <label className="inline-flex min-h-11 items-center gap-2 text-sm text-ivory">
                <input type="checkbox" name={`item_${row}_remove`} className="size-5 accent-gold" />
                Remove this dish
              </label>
            ) : null}
          </fieldset>
        ))}
      </>
    );
  } else if (section.kind === "gallery") {
    const group = document.gallery[section.index];
    title = `Gallery: ${group.name}`;
    fields = (
      <>
        <Text name="name" label="Section name" value={group.name} max={80} required />
        <Text name="description" label="Section note (optional)" value={group.description} max={400} />
        <p className="text-sm text-ivory-muted">
          Photos you add are private until you publish the draft. Photos must be from 2026 or later; enter when each was
          taken or posted, and a link to the original post if there is one.
        </p>
        {[...group.photos, ...Array.from({ length: BLANK_PHOTOS }, () => undefined)].map((photo, row) => (
          <fieldset key={row} className="grid gap-4 border-t border-ivory/15 pt-6 sm:grid-cols-2">
            <legend className="text-sm font-semibold text-gold">{photo ? `Photo ${row + 1}` : "New photo (choose a file to add)"}</legend>
            {photo ? (
              <div className="sm:col-span-2">
                <PlaceholderImage label={photo.alt} aspect={photo.aspect} className="max-w-48"
                  src={photo.media ? `/admin/media/${photo.media}` : photo.src} />
                <p className="mt-2 text-xs text-ivory-muted">
                  {photo.media ? `Uploaded photo, from ${photo.sourceDate}${photo.sourceUrl ? ` · ${photo.sourceUrl}` : ""}`
                    : photo.src ? "Photo from the original site" : "No photo yet; the page shows a labelled placeholder."}
                </p>
              </div>
            ) : null}
            <Text name={`photo_${row}_alt`} label="Description for screen readers" value={photo?.alt} max={200} required={Boolean(photo)}
              hint="What the photo shows." />
            <Text name={`photo_${row}_caption`} label="Caption (optional)" value={photo?.caption} max={160}
              hint="Shown under the photo." />
            <div className="sm:col-span-2">
              <label htmlFor={`photo_${row}_file`} className={labelClasses}>{photo ? "Replace the photo (optional)" : "Photo"}</label>
              <PhotoFileInput id={`photo_${row}_file`} name={`photo_${row}_file`} className={`${fieldClasses} file:mr-4 file:border-0 file:bg-gold file:px-3 file:py-1.5 file:text-ink-950`} />
              <p className="text-xs text-ivory-muted">JPEG, PNG or WebP. Large photos are shrunk automatically. Add one or two photos per save.</p>
            </div>
            <div>
              <label htmlFor={`photo_${row}_date`} className={labelClasses}>Date taken or posted</label>
              <input id={`photo_${row}_date`} name={`photo_${row}_date`} type="date" min="2026-01-01" className={fieldClasses} />
              <p className="mt-1.5 text-xs text-ivory-muted">Needed when you choose a file.</p>
            </div>
            <Text name={`photo_${row}_url`} label="Link to the original post (optional)" max={500} />
            {photo ? (
              <label className="inline-flex min-h-11 items-center gap-2 text-sm text-ivory">
                <input type="checkbox" name={`photo_${row}_remove`} className="size-5 accent-gold" />
                Remove this photo from the gallery
              </label>
            ) : null}
          </fieldset>
        ))}
      </>
    );
  } else {
    const tier = document.packages[section.index];
    title = `Banquet: ${tier.name}`;
    fields = (
      <>
        <div className="grid gap-5 sm:grid-cols-2">
          <Text name="name" label="Package name" value={tier.name} max={80} required />
          <Price name="price" label="Price per person (whole dollars)" value={tier.pricePerPersonCents} required whole />
        </div>
        <Text name="summary" label="Summary" value={tier.summary} max={200} required />
        <p className="text-sm text-ivory-muted">
          Event inquiries keep the package name and price the guest saw, so changing them here does not alter past inquiries.
        </p>
        {[...tier.courses, undefined].map((course, slot) => (
          <fieldset key={slot} className="grid gap-4 border-t border-ivory/15 pt-6">
            <legend className="text-sm font-semibold text-gold">{course ? `Course ${slot + 1}` : "New course (fill in to add)"}</legend>
            <Text name={`course_${slot}_label`} label="Course name" value={course?.label} max={60}
              hint={course ? "Clear the name and dishes to remove this course." : undefined} />
            <Lines name={`course_${slot}_items`} label="Dishes" values={course?.items ?? []} />
          </fieldset>
        ))}
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Staff · Draft" title={title}
        intro="Saving changes the draft only. Preview and publish from the website content page." />
      {back}
      <ContentEditorForm section={slug} base={base}>{fields}</ContentEditorForm>
    </>
  );
}
