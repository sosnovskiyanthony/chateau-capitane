import { site } from "@/lib/data/site";
import { handleContact } from "@/lib/server/contact";

/** Keeps configuration and delivery server-side, with settings read per request. */
export async function POST(request: Request) {
  return handleContact(request, {
    getConfiguration: () => ({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.CONTACT_FROM_EMAIL,
      to: process.env.CONTACT_TO_EMAIL || site.email,
    }),
    fetch,
    logError: (code, status) => console.error("Contact delivery:", code, status ?? ""),
  });
}
