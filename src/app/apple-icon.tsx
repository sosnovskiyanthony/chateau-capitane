import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Rasterizes the tab icon for iOS home screens, so icon.svg stays the one source for the mark.
const mark = await readFile(join(process.cwd(), "src/app/icon.svg"));

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain img elements, not next/image. */}
        <img
          src={`data:image/svg+xml;base64,${mark.toString("base64")}`}
          width={size.width}
          height={size.height}
          alt=""
        />
      </div>
    ),
    size,
  );
}
