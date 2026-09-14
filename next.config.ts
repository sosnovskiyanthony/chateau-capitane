import type { NextConfig } from "next";

/**
 * Permanent redirects from the previous WordPress site's URLs. These only take
 * effect if the existing domain is pointed at this site; they're harmless
 * otherwise. Banquet pages collapse into /private-events, anchored to their
 * tier where it still exists.
 */
const legacyRedirects = [
  { source: "/food-and-restaurant-menu", destination: "/menu" },
  { source: "/food-and-restaurant-lunch-specials", destination: "/menu#lunch-special" },
  { source: "/food-and-restaurant-about-us", destination: "/about" },
  { source: "/food-and-restaurant-contact-us", destination: "/contact" },
  { source: "/food-and-restaurant-gallery", destination: "/gallery" },
  { source: "/food-and-restaurant-testimonials", destination: "/testimonials" },
  { source: "/kids-banquet-75", destination: "/private-events#kids" },
  { source: "/memorial-banquet-90", destination: "/private-events#memorial" },
  { source: "/banquet-100", destination: "/private-events#sunday-brunch" },
  { source: "/food-and-restaurant-banquet-135", destination: "/private-events" },
  { source: "/banquet-140", destination: "/private-events#banquet-140" },
  { source: "/banquet-170", destination: "/private-events#banquet-170" },
  { source: "/banquet-185", destination: "/private-events#banquet-185" },
  { source: "/banquet-230", destination: "/private-events#banquet-230" },
  { source: "/sitemap", destination: "/" },
  { source: "/sitemap.html", destination: "/" },
];

const nextConfig: NextConfig = {
  async redirects() {
    return legacyRedirects.map((redirect) => ({ ...redirect, permanent: true }));
  },
};

export default nextConfig;
