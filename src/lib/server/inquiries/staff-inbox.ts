import "server-only";
import type { Staff } from "../auth/staff-auth";
import { callRpc, type Configuration } from "./persistence";

// Every call passes the staff member from requireStaff(); the database re-checks membership.
export const STATUSES = ["new", "in_progress", "resolved"] as const;
export type Status = (typeof STATUSES)[number];
export const STATUS_LABELS: Record<Status, string> = { new: "New", in_progress: "In progress", resolved: "Resolved" };
export const PAGE_SIZE = 25;
export const NOTE_MAX = 2000;
export const SEARCH_MAX = 100;

export type Notification = { state: string; attempts: number; lastError: string | null; delivery: string | null } | null;
export type InquirySummary = {
  id: string; name: string; email: string; status: Status; requestedDate: string | null;
  guests: number | null; createdAt: string; notification: Notification;
};
export type InquiryDetail = InquirySummary & {
  phone: string; message: string; version: number; updatedAt: string;
  notes: { author: string; body: string; createdAt: string }[];
  history: { actor: string | null; from: Status; to: Status; at: string }[];
};
export type StatusResult = { kind: "updated" | "stale" | "invalid" | "not_found" | "unavailable"; status?: Status };
export type NoteResult = { kind: "added" | "full" | "not_found" | "unavailable" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isStatus = (value: unknown): value is Status => STATUSES.includes(value as Status);
export const isInquiryId = (value: unknown): value is string => typeof value === "string" && UUID.test(value);

/** Page cursor: the last row's "createdAt|id". Anything malformed means the first page. */
export function parseCursor(value: unknown): { at: string; id: string } | null {
  if (typeof value !== "string" || value.length > 80) return null;
  const [at, id, extra] = value.split("|");
  return extra === undefined && isInquiryId(id) && !Number.isNaN(Date.parse(at)) ? { at, id } : null;
}
export const cursorOf = (row: InquirySummary) => `${row.createdAt}|${row.id}`;

/** One page plus one extra row to know whether an older page exists. Undefined when unavailable. */
export async function listInquiries(configuration: Configuration, staff: Staff,
  filter: { status: Status | null; search: string; before: { at: string; id: string } | null }) {
  const rows = await callRpc(configuration, "staff_list_inquiries", {
    p_staff: staff.userId, p_status: filter.status, p_search: Array.from(filter.search).slice(0, SEARCH_MAX).join("") || null,
    p_before_at: filter.before?.at ?? null, p_before_id: filter.before?.id ?? null, p_limit: PAGE_SIZE + 1,
  }, 512 * 1024);
  if (!Array.isArray(rows)) return undefined;
  const page = rows as InquirySummary[];
  return { rows: page.slice(0, PAGE_SIZE), older: page.length > PAGE_SIZE ? cursorOf(page[PAGE_SIZE - 1]) : null };
}

/** Null when no such inquiry; undefined when storage is unavailable. */
export async function getInquiry(configuration: Configuration, staff: Staff, id: string) {
  const result = await callRpc(configuration, "staff_get_inquiry", { p_staff: staff.userId, p_id: id }, 4 * 1024 * 1024);
  if (result === null) return null;
  return result && typeof result === "object" && "version" in result ? result as InquiryDetail : undefined;
}

export async function setInquiryStatus(configuration: Configuration, staff: Staff, id: string,
  version: number, status: Status): Promise<StatusResult> {
  const result = await callRpc(configuration, "staff_set_inquiry_status",
    { p_staff: staff.userId, p_email: staff.email, p_id: id, p_version: version, p_status: status }, 1024);
  return kindOf(result, ["updated", "stale", "invalid", "not_found"]) as StatusResult;
}

export async function addInquiryNote(configuration: Configuration, staff: Staff, id: string, body: string): Promise<NoteResult> {
  const result = await callRpc(configuration, "staff_add_inquiry_note",
    { p_staff: staff.userId, p_email: staff.email, p_id: id, p_body: body }, 1024);
  return kindOf(result, ["added", "full", "not_found"]) as NoteResult;
}

function kindOf(result: unknown, kinds: string[]) {
  const kind = result && typeof result === "object" && "kind" in result ? result.kind : undefined;
  return typeof kind === "string" && kinds.includes(kind) ? result as { kind: string } : { kind: "unavailable" };
}

/** Plain-English notification state, so delivery problems stand out from normal progress. */
export function describeNotification(notification: Notification): { label: string; problem: boolean } {
  if (!notification) return { label: "No staff email", problem: true };
  const delivery = notification.delivery?.replace("email.", "");
  if (delivery === "delivered") return { label: "Staff email delivered", problem: false };
  if (delivery === "bounced" || delivery === "failed" || delivery === "suppressed" || delivery === "complained") {
    return { label: `Staff email ${delivery}`, problem: true };
  }
  if (delivery === "delivery_delayed") return { label: "Staff email delayed", problem: true };
  switch (notification.state) {
    case "accepted": return { label: "Staff email sent", problem: false };
    case "pending": return { label: notification.attempts ? "Staff email retrying" : "Staff email queued", problem: notification.attempts > 0 };
    case "leased": return { label: "Staff email sending", problem: false };
    case "uncertain": return { label: "Staff email may not have sent", problem: true };
    default: return { label: "Staff email failed", problem: true };
  }
}

const timeFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" });
/** Restaurant-local (Brooklyn) time for staff screens. */
export const formatTime = (iso: string) => timeFormat.format(new Date(iso));
