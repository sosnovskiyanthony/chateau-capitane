import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { LogoMark } from "@/components/ui/logo-mark";
import { site } from "@/lib/data/site";
import { shareImage } from "@/lib/metadata";

export const alt = shareImage.alt;
export const size = { width: shareImage.width, height: shareImage.height };
export const contentType = "image/png";

// Satori reads neither Tailwind nor next/font, so the site's two faces load from
// assets/fonts and these colors are copied from the tokens in globals.css.
const [bodoniModa, albertSans] = await Promise.all([
  readFile(join(process.cwd(), "assets/fonts/BodoniModa-Display.ttf")),
  readFile(join(process.cwd(), "assets/fonts/AlbertSans-Regular.ttf")),
]);

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#0d0d0d",
          color: "#efe7d6",
          fontFamily: "Albert Sans",
        }}
      >
        {/* Satori fills currentColor from the inherited CSS color (not the svg's color attribute) and needs
            explicit dimensions; 70x120 keeps the mark's 7:12 viewBox. */}
        <div style={{ display: "flex", color: "#c6a15b" }}>
          <LogoMark width={70} height={120} />
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontFamily: "Bodoni Moda",
              fontSize: 104,
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            {site.name}
          </div>
          <div style={{ fontSize: 36, color: "#b7b3a8", marginTop: 32 }}>
            Seafood, Russian banquets, and weekday lunch in Brooklyn
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 40,
            fontSize: 22,
            color: "#c6a15b",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          <div>{site.address.full}</div>
          <div>{site.phone.display}</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bodoni Moda", data: bodoniModa, style: "normal", weight: 400 },
        { name: "Albert Sans", data: albertSans, style: "normal", weight: 400 },
      ],
    },
  );
}
