import type { Locale } from "./locales";

/**
 * Every fixed sentence and label on the public site, in English. ru.ts must provide the same keys
 * (the type below enforces it). Menu, banquet and gallery text lives in src/lib/data and is translated
 * through content-ru.ts instead. Functions take the live values (prices, names) so they stay correct
 * when staff edit them. Client components only receive plain strings from their server parents.
 */
export const en = {
  htmlLang: "en",
  ogLocale: "en_US",
  /** What the language button offers, shown on the English pages. */
  otherLanguage: { code: "ru" as Locale, short: "RU", name: "Русский", title: "Читать по-русски" },

  skipToContent: "Skip to content",
  nav: {
    menu: "Menu",
    privateEvents: "Private Events",
    gallery: "Gallery",
    about: "About",
    contact: "Contact",
    testimonials: "Testimonials",
  },
  aria: { main: "Main", mobile: "Mobile", footer: "Footer", openMenu: "Open menu", closeMenu: "Close menu" },
  header: {
    call: "Call",
    callAria: (phone: string) => `Call ${phone}`,
  },
  cta: {
    bookNow: "Book now",
    bookSr: " on OpenTable (opens in a new tab)",
    call: (phone: string) => `Call ${phone}`,
    seeMenu: "See the menu",
    seeBanquets: "See banquet menus",
  },
  footer: { hours: "Hours", explore: "Explore", copyright: (year: number, name: string) => `© ${year} ${name}` },
  info: {
    findUs: "Find us",
    getDirections: "Get directions",
    hours: "Hours",
    dining: "Dining",
    lunchSpecial: "Lunch special",
  },
  mapTitle: (name: string, address: string) => `Map showing ${name} at ${address}`,
  photoToCome: (label: string) => `Photo to come: ${label}`,

  home: {
    eyebrow: "Russian & seafood restaurant, Coney Island Avenue, Brooklyn",
    titleLine1: "A father’s recipes,",
    titleLine2: "a son’s kitchen.",
    intro:
      "Chef Stanley learned to cook in his father Alik’s kitchen. Oysters and caviar, grilled fish, pelmeni and borscht, Russian banquets, and a weekday lunch special.",
    lunch: {
      eyebrow: "Lunch special",
      titleBefore: "Three courses for",
      note: "One from each course. Beverages not included.",
      andMore: (count: number) => `and ${count} more`,
      fullMenu: "Full lunch menu",
    },
    signature: {
      eyebrow: "Signature dishes",
      intro: "Three of Chef Alik’s favorites, still on his son’s menu.",
      title: "What the family cooks",
      dishes: [
        {
          name: "Roasted duck in fruit sauce",
          note: "Roasted and sauced with dried fruit. It anchors the $140 banquet table too.",
          photo: "Roasted duck carved on a platter",
        },
        {
          name: "Chalakhach chicken tabaka",
          note: "Chicken pressed flat and pan-fried until the skin crisps.",
          photo: "Chicken tabaka pressed flat in a pan",
        },
        {
          name: "Pickled tomatoes",
          note: "Russian-style pickled tomatoes, served cold.",
          photo: "Pickled tomatoes on a serving plate",
        },
      ],
    },
    teaser: {
      eyebrow: "Private events",
      intro: (lowest: number, highest: number) =>
        `All-inclusive set menus from $${lowest} to $${highest} a head, brought out course by course in our private rooms.`,
      title: "Your party, our rooms.",
    },
    visit: {
      eyebrow: "Hours & location",
      intro: "Open Wednesday through Sunday. Call ahead for larger parties.",
      title: "Visit us",
    },
  },

  menu: {
    title: "Menu",
    intro:
      "Seafood from the raw bar to the grill, the Russian dishes Chef Alik passed down, and steaks cut to order. A few prices change with the season, and we’ll always tell you before you order.",
    lunchTitle: "Lunch special",
    lunchNote: "Three courses. Choose one from each. Beverages not included.",
    sections: "Menu sections",
    policies: "Dining policies",
  },

  events: {
    eyebrow: "Private events",
    title: "Banquets in our own rooms",
    intro: (lowest: number, highest: number) =>
      `Birthdays, anniversaries, memorials, christenings. Every package is all-inclusive and priced per person, from $${lowest} to $${highest}, with the cold table, hot appetizers, entrées, and dessert brought out course by course.`,
    sendDetails: "Send us the details",
    roomPhoto: "Private dining room set for a banquet",
    bookingTitle: "Booking your date",
    booking:
      "Room capacity, minimum guest counts, and the deposit depend on the date and the room, so we handle those on the phone rather than publishing one number that won’t fit your party. Call us with your date and headcount and we’ll tell you what fits. Banquets are exempt from the corkage fee.",
    packages: "Banquet packages",
    elseTitle: "Something else in mind?",
    else: "These are the packages we run most often, not a closed list. If your party needs something different, such as dietary restrictions, a smaller group, or a menu built around one dish, tell us and we’ll put it together.",
    perPerson: "Per person, all-inclusive",
    minGuests: (count: number) => `Minimum ${count} guests.`,
    ask: "Ask about this package",
    packageLabel: (name: string, price: number) => `${name}, $${price} per person`,
  },

  about: {
    eyebrow: "About",
    title: "Like father, like son",
    intro: (name: string) =>
      `${name} is a bar and grill on Coney Island Avenue, serving weekday lunch specials, seafood, and Russian-style banquets in rooms we keep for private parties. Locals and visitors both, most nights.`,
    chefPhoto: "Chef Stanley in the kitchen",
    twoKitchens: "Two kitchens, one family",
    p1: "In Brooklyn restaurants, family runs through the kitchen more often than not: people cooking the dishes they grew up eating, taught by the people who made them first.",
    p2: "Running this one is Stanley, son and protégé of Chef Alik of Chateau De Alik. What he took from his father’s kitchen shows up across the menu, and what he added himself is mostly seafood: the raw bar, the whole fish, and the lobster and crab on our banquet tables.",
    roomPhoto: "The dining room on a full night",
    caviarPhoto: "Red caviar served with blini and accompaniments at a banquet table",
    quote:
      "“The emphasis is on the quality of the product, but we wanted to present it in an approachable format, so people could come in and enjoy a few times a week. We wanted it to be a home away from home.”",
    quoteBy: "Chef Stan",
    p3: "That’s the measure we cook to. Not a room you visit once for an occasion, but one you come back to on a Wednesday because the soup is good and someone knows your name.",
    p4: "Alongside the daily soups and lunch specials, the dinner menu keeps Chef Alik’s own favorites: pickled tomatoes, chalakhach chicken tabaka, and roasted duck in fruit sauce.",
  },

  contact: {
    eyebrow: "Reservations & directions",
    title: "Contact",
    intro:
      "Book your table on OpenTable. For banquets or other enquiries, call us or send a note and we’ll come back to you.",
    sendTitle: "Send a message",
    visitTitle: "Visit or call",
    faqTitle: "Good to know before you come",
    faqLunchQ: "Is there a weekday lunch special?",
    faqLunchA: (price: number, hours: string) =>
      `Yes: three courses for $${price}, ${hours}. Beverages are not included.`,
    faqPartiesQ: "Do you host private parties?",
    faqPartiesBefore: "Yes, in private rooms with all-inclusive Russian-style banquet packages. See ",
    faqPartiesLink: "banquets",
    faqPartiesAfter: (phone: string) => `, or call ${phone}.`,
    faqMinimumsQ: "Minimums and corkage",
    form: {
      name: "Name",
      email: "Email",
      phone: "Phone",
      optional: "(optional)",
      event: "Private event",
      eventNone: "No, a general message",
      eventUndecided: "Yes, package not chosen yet",
      date: "Date",
      guests: "Guests",
      message: "What can we help with?",
      send: "Send message",
      sending: "Sending…",
      sent: "Thank you. Your message has been recorded for our team to follow up, and we’ll reply by email. This does not confirm a booking.",
      invalid: "Some details didn’t look right. Please check the form and try again.",
      failedBefore: "Your message didn’t go through. Please call us at ",
      failedAfter: " and we’ll sort it out.",
    },
  },

  gallery: {
    eyebrow: "Photographs",
    title: "Gallery",
    intro: "The rooms, the tables we set for parties, and what comes out of the kitchen.",
  },

  testimonials: {
    eyebrow: "Testimonials",
    title: "What guests say",
    intro: "Collected from guests who have eaten here and celebrated here. The most recent reviews live on Yelp.",
    note: "",
    recentTitle: "Eaten with us recently?",
    recent:
      "We read everything. Leaving a review on Yelp is the quickest way to reach us and anyone deciding where to eat tonight.",
    writeReview: "Write a review on Yelp",
    tellUs: "Tell us directly",
  },

  notFound: {
    title: "Page not found",
    heading: "This page has moved on",
    intro:
      "The page you were after isn’t here. The menu and our banquet packages are the two people usually want.",
  },

  meta: {
    defaultTitle: (name: string) => `Russian Seafood Restaurant in Brooklyn | ${name}`,
    siteDescription:
      "Russian and seafood restaurant on Coney Island Avenue in Brooklyn: oysters, caviar, grilled fish, pelmeni, a weekday lunch special, and private Russian-style banquets.",
    homeDescription: (price: number, lunchHours: string) =>
      `Oysters, caviar, grilled fish and Russian banquets on Coney Island Ave, Brooklyn. $${price} three-course lunch, ${lunchHours}. Reserve online.`,
    menuTitle: "Brooklyn Seafood & Russian Menu",
    menuDescription: (price: number, lunchHours: string) =>
      `Oysters, red caviar, smoked sturgeon, pelmeni, borscht and grilled meats. Brooklyn menu with prices and a $${price} three-course lunch, ${lunchHours}.`,
    eventsTitle: (lowest: number, highest: number) => `Banquet Hall in Brooklyn, $${lowest} to $${highest}`,
    eventsDescription: (lowest: number, highest: number) =>
      `All-inclusive Russian-style banquets in private rooms on Coney Island Ave, Brooklyn. Birthdays, memorials, christenings. $${lowest} to $${highest} per person.`,
    contactTitle: "Reservations, Hours & Directions",
    contactDescription: (address: string, hours: string, phone: string) =>
      `${address}. Open ${hours}. Reserve on OpenTable or call ${phone} for banquets and large parties.`,
    aboutTitle: "Chef Stanley & Our Family Kitchen",
    aboutDescription:
      "Chef Stanley learned to cook from his father, Alik of Chateau De Alik. The story behind the seafood, the banquets, and the Brooklyn dining room.",
    galleryTitle: "Gallery",
    galleryDescription:
      "Photographs of the dining room, the private banquet rooms, and the food at Château Capitaine in Brooklyn.",
    testimonialsTitle: "Guest Reviews of Dinners & Banquets",
    testimonialsDescription:
      "Guest reviews of dinners, birthdays, anniversaries, and banquets at Château Capitaine in Brooklyn, plus where to read our latest reviews on Yelp.",
    notFoundTitle: "Page not found",
    shareAlt: (name: string) =>
      `${name}, seafood and Russian-style banquets on Coney Island Avenue in Brooklyn`,
  },

  schema: {
    description:
      "Russian and seafood restaurant on Coney Island Avenue in Brooklyn: oysters, caviar, grilled fish, pelmeni, a weekday lunch special, and private Russian-style banquets.",
    lunchOffer: "Weekday three-course lunch special (soup, salad, entrée; beverages not included)",
    reserve: (name: string) => `Reserve a table at ${name}`,
  },
};

export type Dictionary = typeof en;
