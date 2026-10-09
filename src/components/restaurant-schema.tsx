import { site, type OpeningHours } from "@/lib/data/site";
import { shareImage } from "@/lib/metadata";

function toSpecification(hours: OpeningHours) {
  return {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: hours.days.map((day) => `https://schema.org/${day}`),
    opens: hours.opens,
    closes: hours.closes,
  };
}

/**
 * Restaurant structured data, sourced from `site.ts` so the address, phone,
 * and hours can never drift from what the page renders.
 */
export function RestaurantSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${site.url}/#restaurant`,
    name: site.name,
    alternateName: "Chateau Capitaine",
    url: site.url,
    description: site.description,
    telephone: site.phone.international,
    servesCuisine: ["Russian", "Seafood", "Eastern European"],
    priceRange: "$$$",
    hasMenu: `${site.url}/menu`,
    acceptsReservations: true,
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
    // Until real photography exists, the generated share card stands in as the image.
    image: `${site.url}${shareImage.url}`,
    logo: `${site.url}/apple-icon`,
    // Lunch-special hours fall inside dining hours; listing them here would read as separate opening hours.
    openingHoursSpecification: [toSpecification(site.hours.dining)],
    sameAs: [site.social.facebook, site.social.instagram, site.social.yelp],
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
