export type Weekday =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type OpeningHours = {
  days: readonly Weekday[];
  /** 24-hour "HH:MM", schema.org compatible */
  opens: string;
  closes: string;
};

const street = "2570 Coney Island Ave";
const city = "Brooklyn";
const state = "NY";
const zip = "11223";
const fullAddress = `${street}, ${city}, ${state} ${zip}`;

export const site = {
  name: "Château Capitaine",
  shortName: "Château Capitaine",
  /** Placeholder until the production domain is confirmed; every absolute URL derives from this. */
  url: "https://www.chateaucapitaine.com",
  tagline: "Continuing a family tradition of excellence",
  description:
    "A Brooklyn bar and grill serving seafood, Russian-style banquets, and weekday lunch specials on Coney Island Avenue.",

  address: {
    street,
    city,
    state,
    zip,
    full: fullAddress,
  },

  /** The building's surveyed position, from OpenStreetMap. */
  geo: {
    latitude: 40.594149,
    longitude: -73.9612306,
    display: "40°35′39″N 73°57′40″W",
  },

  phone: {
    display: "(718) 339-2800",
    href: "tel:+17183392800",
    international: "+1-718-339-2800",
  },

  email: "chateaudecapitaine4@gmail.com",

  hours: {
    dining: {
      days: ["Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "11:00",
      closes: "23:00",
    } satisfies OpeningHours,
    lunchSpecial: {
      days: ["Wednesday", "Thursday", "Friday"],
      opens: "12:00",
      closes: "16:30",
    } satisfies OpeningHours,
  },

  lunchSpecialPrice: 25,

  /** Verified booking destination used by the current restaurant website. */
  reservationUrl:
    "https://www.opentable.com/r/chateau-capitaine-reservations-brooklyn?restref=1023577&lang=en-US&ot_source=Restaurantebsite",

  social: {
    facebook: "https://www.facebook.com/chateaudecapitaine",
    instagram: "https://www.instagram.com/chateau_capitaine/",
    yelp: "https://www.yelp.com/biz/chateau-de-capitaine-brooklyn-2",
  },

  /** Keyless Google Maps embed; no API key or billing account required. */
  mapEmbedUrl: `https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`,
  mapLinkUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `Chateau Capitaine ${fullAddress}`,
  )}`,
} as const;

export const navLinks = [
  { href: "/menu", label: "Menu" },
  { href: "/private-events", label: "Private Events" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

/** Secondary links, footer only, matching how the old site treated testimonials. */
export const footerLinks = [
  { href: "/testimonials", label: "Testimonials" },
] as const;

const SHORT_DAY: Record<Weekday, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

function formatTime(time: string): string {
  const [rawHour, rawMinute] = time.split(":").map(Number);
  const period = rawHour >= 12 ? "pm" : "am";
  const hour = rawHour % 12 || 12;
  return rawMinute === 0
    ? `${hour}${period}`
    : `${hour}:${String(rawMinute).padStart(2, "0")}${period}`;
}

/** "Wed to Sun, 11am to 11pm" */
export function formatHours(hours: OpeningHours): string {
  const first = SHORT_DAY[hours.days[0]];
  const last = SHORT_DAY[hours.days[hours.days.length - 1]];
  const range = hours.days.length === 1 ? first : `${first} to ${last}`;
  return `${range}, ${formatTime(hours.opens)} to ${formatTime(hours.closes)}`;
}
