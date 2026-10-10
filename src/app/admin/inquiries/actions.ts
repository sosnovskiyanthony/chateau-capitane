"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/server/auth/session";
import { getPersistenceConfiguration } from "@/lib/server/inquiries/persistence";
import { addInquiryNote, isInquiryId, isStatus, NOTE_MAX, setInquiryStatus } from "@/lib/server/inquiries/staff-inbox";

// Server Functions are public POST endpoints: each re-checks staff access and validates every field.
// Results come back as a ?notice= on the inquiry page (no guest text in the URL).
function back(id: string, notice: string): never {
  redirect(`/admin/inquiries/${id}?notice=${notice}#actions`);
}

function inquiryId(form: FormData) {
  const id = form.get("id");
  if (!isInquiryId(id)) redirect("/admin/inquiries");
  return id;
}

export async function changeStatus(form: FormData): Promise<void> {
  const id = inquiryId(form);
  const staff = await requireStaff(`/admin/inquiries/${id}`);
  const status = form.get("status"), version = Number(form.get("version"));
  if (!isStatus(status) || !Number.isInteger(version) || version < 1) back(id, "invalid");
  const configuration = getPersistenceConfiguration();
  const result = configuration ? await setInquiryStatus(configuration, staff, id, version, status) : { kind: "unavailable" };
  back(id, result.kind === "not_found" ? "unavailable" : result.kind);
}

export async function addNote(form: FormData): Promise<void> {
  const id = inquiryId(form);
  const staff = await requireStaff(`/admin/inquiries/${id}`);
  const raw = form.get("note");
  // Browsers submit line breaks as CRLF; count them as one character like the textarea does.
  const body = typeof raw === "string" ? raw.replace(/\r\n/g, "\n").trim() : "";
  if (!body) back(id, "note-empty");
  if (body.length > NOTE_MAX) back(id, "note-long");
  const configuration = getPersistenceConfiguration();
  const result = configuration ? await addInquiryNote(configuration, staff, id, body) : { kind: "unavailable" };
  back(id, result.kind === "added" ? "note-added" : result.kind === "full" ? "note-full" : "unavailable");
}
