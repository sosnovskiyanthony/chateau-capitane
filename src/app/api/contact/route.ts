import { site } from "@/lib/data/site";
import { handleContact } from "@/lib/server/contact";
import { getSiteContent } from "@/lib/server/content/content";
import { requestLogger } from "@/lib/server/ops";
import { checkContactLimit } from "@/lib/server/inquiries/abuse-limit";
import { getPersistenceConfiguration, recordContactInquiry } from "@/lib/server/inquiries/persistence";

/** Keeps configuration and storage server-side, with settings read per request. */
export async function POST(request: Request) {
  return handleContact(request, {
    getConfiguration: () => ({
      persistence: getPersistenceConfiguration(),
      from: process.env.CONTACT_FROM_EMAIL,
      to: process.env.CONTACT_TO_EMAIL || site.email,
    }),
    limit: checkContactLimit,
    record: recordContactInquiry,
    logError: requestLogger("contact_intake", request),
    packages: async () => (await getSiteContent()).packages,
  });
}
