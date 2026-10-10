"use client";

import { useState } from "react";

const MAX_SIDE = 2400;
const MAX_BYTES = 3.5 * 1024 * 1024;
const SHRINK_ABOVE = 2.5 * 1024 * 1024;

/** A photo picker that shrinks large phone photos in the browser first: the server accepts at most 3.5 MB
 * per photo and rejects anything bigger. Without JavaScript the file is sent as chosen.
 */
export function PhotoFileInput({ id, name, className }: { id: string; name: string; className: string }) {
  const [note, setNote] = useState("");
  async function shrink(input: HTMLInputElement) {
    const file = input.files?.[0];
    setNote("");
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
      if (scale === 1 && file.size <= SHRINK_ABOVE) return;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext("2d");
      if (context) { context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height); }
      context?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((done) => canvas.toBlob(done, "image/jpeg", 0.88));
      if (!blob) return;
      if (blob.size > MAX_BYTES) { setNote("This photo is still over 3.5 MB after shrinking. Choose a smaller one."); return; }
      const transfer = new DataTransfer();
      transfer.items.add(new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }));
      input.files = transfer.files;
      setNote(`Resized to ${canvas.width} × ${canvas.height} pixels before upload.`);
    } catch {
      // Not readable here (for example a format this browser cannot decode): the server explains.
    }
  }
  return (
    <>
      <input id={id} name={name} type="file" accept="image/jpeg,image/png,image/webp" className={className}
        onChange={(event) => void shrink(event.currentTarget)} />
      <p role="status" className="mt-1.5 text-xs text-ivory-muted">{note}</p>
    </>
  );
}
