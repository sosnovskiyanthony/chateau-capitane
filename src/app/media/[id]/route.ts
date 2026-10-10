import { getPersistenceConfiguration } from "@/lib/server/inquiries/persistence";
import { isMediaId, readMedia } from "@/lib/server/content/media";

/** A gallery photo, only while the live version of the gallery lists it. */
export async function GET(_request: Request, { params }: RouteContext<"/media/[id]">) {
  const { id } = await params;
  const configuration = getPersistenceConfiguration();
  if (!isMediaId(id) || !configuration) return new Response(null, { status: 404 });
  const photo = await readMedia(configuration, id);
  if (photo === undefined) return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  if (photo === null) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(photo.data), {
    // An hour (the image optimizer matches it in next.config.ts): a photo taken off the gallery stops being served within about two.
    headers: { "Content-Type": photo.type, "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
