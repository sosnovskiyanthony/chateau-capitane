import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import type { Staff } from "../auth/staff-auth";
import { callRpc, getPersistenceConfiguration, type Configuration } from "../inquiries/persistence";
import { ContentError, staticDocument, toSiteContent, validateDocument, type ContentDocument, type SiteContent } from "./document";

/** Cache tag on every page that shows editable content; publishing expires it. */
export const CONTENT_TAG = "site-content";
const DOCUMENT_BYTES = 512 * 1024;

// Refreshed on every publication (updateTag) and hourly, so a change made directly in the database
// (recovery) still reaches the site. A failed read or a document that fails validation throws, so
// nothing is cached and Next.js keeps serving the last page it rendered from the last published content.
const readPublished = unstable_cache(async (): Promise<ContentDocument | null> => {
  const configuration = getPersistenceConfiguration();
  if (!configuration) return null;
  const result = await callRpc(configuration, "published_content", {}, DOCUMENT_BYTES);
  if (result === undefined) throw new Error("content_unavailable");
  if (result === null) return null;
  return validateDocument(typeof result === "object" && "document" in result ? result.document : undefined);
}, ["published-content"], { tags: [CONTENT_TAG], revalidate: 3600 });

/** Published content for public pages; the built-in content until something is published or when
 * storage is not configured (local builds). Throws when storage is configured but unreadable.
 */
export const getSiteContent = cache(async (): Promise<SiteContent> =>
  toSiteContent(await readPublished() ?? staticDocument()));

/** For the shared layout (footer, structured data): a content outage must not take down every page,
 * including the staff pages, so it falls back to the built-in hours.
 */
export const getLayoutContent = cache(async (): Promise<SiteContent> =>
  getSiteContent().catch(() => toSiteContent(staticDocument())));

export type Revision = { id: number; document: unknown; author: string; createdAt: string };
export type ContentState = {
  draft: Revision | null;
  publishedId: number | null;
  revisions: { id: number; author: string; createdAt: string }[];
  publications: { revision: number; by: string; at: string }[];
};

/** Undefined when storage is unavailable. */
export async function getContentState(configuration: Configuration, staff: Staff): Promise<ContentState | undefined> {
  const result = await callRpc(configuration, "staff_content_state", { p_staff: staff.userId }, 2 * DOCUMENT_BYTES);
  return result && typeof result === "object" && "revisions" in result ? result as ContentState : undefined;
}

/** Null when no such revision; undefined when storage is unavailable. */
export async function getRevision(configuration: Configuration, staff: Staff, id: number): Promise<Revision | null | undefined> {
  const result = await callRpc(configuration, "staff_content_revision", { p_staff: staff.userId, p_id: id }, DOCUMENT_BYTES);
  if (result === null) return null;
  return result && typeof result === "object" && "document" in result ? result as Revision : undefined;
}

/** The document an editor starts from: the working draft, or the built-in content before the first save.
 * A draft that no longer passes validation (stricter rules, a direct database edit) also starts from
 * the built-in content, so the editor and its version history stay usable for recovery.
 */
export function draftDocument(state: ContentState): ContentDocument {
  try { return state.draft ? validateDocument(state.draft.document) : staticDocument(); }
  catch (error) { if (error instanceof ContentError) return staticDocument(); throw error; }
}

export async function saveDraft(configuration: Configuration, staff: Staff, base: number | null, document: ContentDocument) {
  const result = await callRpc(configuration, "staff_save_content_draft",
    { p_staff: staff.userId, p_email: staff.email, p_base: base, p_document: validateDocument(document) }, 1024);
  return kindOf(result, ["saved", "stale"]);
}

export async function publishRevision(configuration: Configuration, staff: Staff, id: number) {
  const result = await callRpc(configuration, "staff_publish_content", { p_staff: staff.userId, p_email: staff.email, p_revision: id }, 1024);
  return kindOf(result, ["published", "not_found"]);
}

function kindOf(result: unknown, kinds: string[]): string {
  const kind = result && typeof result === "object" && "kind" in result ? result.kind : undefined;
  return typeof kind === "string" && kinds.includes(kind) ? kind : "unavailable";
}
