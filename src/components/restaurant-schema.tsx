import { site, type OpeningHours } from "@/lib/data/site";
import { getLayoutContent } from "@/lib/server/content/content";

const photos = ["entrance-night.jpg", "red-caviar.jpg", "roasted-duck.jpg", "lobster-platter-instagram.jpg"];

function toSpecification(hours: OpeningHours) {
  return {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: hours.days.map((day) => `https://schema.org/${day}`),
    opens: hours.opens,
    closes: hours.closes,
  };
}

/**
 * Restaurant structured data: address and phone from `site.ts`, hours from the
 * published content, the same sources the pages render.
 */
export async function RestaurantSchema() {
  const { hours, lunchSpecialPrice } = await getLayoutContent();
  const schema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${site.url}/#restaurant`,
    name: site.name,
    alternateName: ["Chateau Capitaine", "Chateau De Capitaine"],
    url: site.url,
    description: site.description,
    telephone: site.phone.international,
    servesCuisine: ["Russian", "Seafood", "Eastern European"],
    priceRange: "$$$",
    hasMenu: `${site.url}/menu`,
    acceptsReservations: site.reservationUrl,
    potentialAction: {
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: site.reservationUrl,
        actionPlatform: [
          "https://schema.org/DesktopWebPlatform",
          "https://schema.org/MobileWebPlatform",
        ],
      },
      result: { "@type": "Reservation", name: `Reserve a table at ${site.name}` },
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      addressLocality: site.address.city,
      addressRegion: site.address.state,
      postalCode: site.address.zip,
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: site.geo.latitude,
      longitude: site.geo.longitude,
    },
    image: photos.map((photo) => `${site.url}/photos/${photo}`),
    logo: `${site.url}/apple-icon`,
    // Lunch-special hours fall inside dining hours; they are published on the lunch offer, not as opening hours.
    openingHoursSpecification: [toSpecification(hours.dining)],
    makesOffer: {
      "@type": "Offer",
      name: "Weekday three-course lunch special (soup, salad, entrée; beverages not included)",
      price: lunchSpecialPrice.toFixed(2),
      priceCurrency: "USD",
      hoursAvailable: toSpecification(hours.lunchSpecial),
    },
    sameAs: [site.social.facebook, site.social.instagram, site.social.yelp, site.reservationUrl.split("?")[0]],
    hasMap: site.mapLinkUrl,
  };

  return (
    <script
      type="application/ld+json"
      // Escaping "<" keeps any future data from closing the script tag early.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
      }}
    />
  );
}
