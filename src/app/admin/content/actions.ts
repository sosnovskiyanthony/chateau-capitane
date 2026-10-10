"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/server/auth/session";
import {
  CONTENT_TAG, draftDocument, getContentState, getRevision, publishRevision, saveDraft,
} from "@/lib/server/content/content";
import { ContentError, validateDocument } from "@/lib/server/content/document";
import { applySection, findSection } from "@/lib/server/content/editor";
import { getPersistenceConfiguration } from "@/lib/server/inquiries/persistence";

// Server Functions are public POST endpoints: each re-checks staff access and validates every field.
export type SaveState = { error: string } | undefined;

const UNAVAILABLE = "That could not be saved right now. Please try again shortly.";
const STALE = "Someone else saved changes while you were editing. Nothing was saved; copy anything you need, then reload this page.";

const revisionId = (value: FormDataEntryValue | null) => {
  const id = typeof value === "string" && /^\d{1,15}$/.test(value) ? Number(value) : 0;
  return id >= 1 ? id : null;
};

/** Saves one editor page as a new draft. Errors return to the form so the typed edits stay on screen. */
export async function saveSection(_state: SaveState, form: FormData): Promise<SaveState> {
  const slug = String(form.get("section") ?? "").slice(0, 80);
  const staff = await requireStaff(`/admin/content/${encodeURIComponent(slug)}`);
  const base = revisionId(form.get("base"));
  const configuration = getPersistenceConfiguration();
  const state = configuration ? await getContentState(configuration, staff) : undefined;
  if (!configuration || !state) return { error: UNAVAILABLE };
  if ((state.draft?.id ?? null) !== base) return { error: STALE };
  let result: string;
  try {
    const current = draftDocument(state);
    const section = findSection(current, slug);
    if (!section) return { error: "This section no longer exists." };
    result = await saveDraft(configuration, staff, base, applySection(current, section, form));
  } catch (error) {
    if (error instanceof ContentError) return { error: error.message };
    throw error;
  }
  if (result === "stale") return { error: STALE };
  if (result !== "saved") return { error: UNAVAILABLE };
  redirect("/admin/content?notice=saved");
}

/** Makes a revision live: the draft, or an older revision to roll back. */
export async function publish(form: FormData): Promise<void> {
  const staff = await requireStaff("/admin/content");
  const id = revisionId(form.get("revision"));
  const configuration = getPersistenceConfiguration();
  if (!id || !configuration) redirect("/admin/content?notice=unavailable");
  const revision = await getRevision(configuration, staff, id);
  if (!revision) redirect(`/admin/content?notice=${revision === null ? "not-found" : "unavailable"}`);
  // Re-check before going live; a revision that no longer passes validation is never published.
  try { validateDocument(revision.document); } catch { redirect("/admin/content?notice=invalid"); }
  const result = await publishRevision(configuration, staff, id);
  if (result !== "published") redirect(`/admin/content?notice=${result === "not_found" ? "not-found" : "unavailable"}`);
  // Every public page that shows content re-renders on its next visit.
  updateTag(CONTENT_TAG);
  redirect("/admin/content?notice=published");
}

/** Copies an older revision into a new draft, so editing continues from it. */
export async function restore(form: FormData): Promise<void> {
  const staff = await requireStaff("/admin/content");
  const id = revisionId(form.get("revision"));
  const base = revisionId(form.get("base"));
  const configuration = getPersistenceConfiguration();
  if (!id || !configuration) redirect("/admin/content?notice=unavailable");
  const revision = await getRevision(configuration, staff, id);
  if (!revision) redirect(`/admin/content?notice=${revision === null ? "not-found" : "unavailable"}`);
  let result: string;
  try { result = await saveDraft(configuration, staff, base, validateDocument(revision.document)); }
  catch (error) {
    if (error instanceof ContentError) redirect("/admin/content?notice=invalid");
    throw error;
  }
  redirect(`/admin/content?notice=${result === "saved" ? "restored" : result}`);
}
