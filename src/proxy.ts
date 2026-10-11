import { NextResponse, type NextRequest } from "next/server";

/**
 * English is served at the site root and Russian under /ru, both from the app/[lang] folder:
 * "/menu" is rewritten to the internal "/en/menu", and a visible "/en/..." is sent back to the root
 * so each page has one English address.
 */
export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname } = url;

  if (pathname === "/ru" || pathname.startsWith("/ru/")) return NextResponse.next();

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  url.pathname = pathname === "/" ? "/en" : `/en${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Everything except API routes, Next internals, public media, metadata files and anything with a file extension.
  matcher: ["/((?!api|_next|media|icon\\.svg|apple-icon|opengraph-image|robots\\.txt|sitemap\\.xml|.*\\..*).*)"],
};
