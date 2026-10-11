"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

/** inKind rewards pop-up for guests. Never on staff pages, which show guest details. */
export function InkindPopup() {
  if (usePathname().startsWith("/admin")) return null;
  return <Script src="https://inkindscript.com/inkind.js" strategy="afterInteractive" />;
}
