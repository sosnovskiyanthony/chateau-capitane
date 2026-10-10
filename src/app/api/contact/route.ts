import { site } from "@/lib/data/site";
import { handleContact } from "@/lib/server/contact";
import { getPersistenceConfiguration, recordContactInquiry } from "@/lib/server/inquiries/persistence";

/** Keeps configuration and storage server-side, with settings read per request. */
export async function POST(request: Request) {
  return handleContact(request, {
    getConfiguration: () => ({
      persistence: getPersistenceConfiguration(),
      from: process.env.CONTACT_FROM_EMAIL,
      to: process.env.CONTACT_TO_EMAIL || site.email,
    }),
    record: recordContactInquiry,
    logError: (code) => console.error("Contact intake:", code),
  });
}
