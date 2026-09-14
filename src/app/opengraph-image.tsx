import { ImageResponse } from "next/og";

import { site } from "@/lib/data/site";
import { shareImage } from "@/lib/metadata";

export const alt = shareImage.alt;
export const size = { width: shareImage.width, height: shareImage.height };
export const contentType = "image/png";

// Satori reads neither Tailwind nor next/font, so these colors are copied from globals.css and Tailwind's stone scale.
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
          background: "#fafaf9",
          color: "#1c1917",
        }}
      >
        <div style={{ display: "flex", width: 96, height: 6, background: "#7a2b3a" }} />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 88, letterSpacing: "-0.02em" }}>{site.name}</div>
          <div style={{ fontSize: 36, color: "#57534e", marginTop: 24 }}>
            Seafood, Russian banquets, and weekday lunch in Brooklyn
          </div>
        </div>

        <div style={{ display: "flex", gap: 40, fontSize: 28, color: "#78716c" }}>
          <div>{site.address.full}</div>
          <div>{site.phone.display}</div>
        </div>
      </div>
    ),
    size,
  );
}
