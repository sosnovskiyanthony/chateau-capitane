import { requireStaff } from "@/lib/server/auth/session";
import { getPersistenceConfiguration } from "@/lib/server/inquiries/persistence";
import { isMediaId, readMedia } from "@/lib/server/content/media";

/** Any uploaded photo, published or not, for staff editing and previews. */
export async function GET(_request: Request, { params }: RouteContext<"/[lang]/admin/media/[id]">) {
  const { id } = await params;
  const staff = await requireStaff(`/admin/media/${id.slice(0, 40)}`);
  const configuration = getPersistenceConfiguration();
  if (!isMediaId(id) || !configuration) return new Response(null, { status: 404 });
  const photo = await readMedia(configuration, id, staff);
  if (photo === undefined) return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  if (photo === null) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(photo.data), {
    headers: { "Content-Type": photo.type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
