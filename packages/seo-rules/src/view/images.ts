import type { PageData } from "../schema";

export interface ImageView {
  alt: string | null;
  filename: string;
  missingAlt: boolean;
  src: string;
}

function basename(src: string): string {
  const clean = src.split("?")[0] ?? src;
  return clean.split("/").at(-1) ?? src;
}

export function deriveImageGallery(page: PageData): ImageView[] {
  return page.images.map((img) => ({
    alt: img.alt,
    filename: basename(img.src),
    missingAlt: img.alt === null,
    src: img.src,
  }));
}
