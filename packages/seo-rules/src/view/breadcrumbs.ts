import type { JsonLdBlock } from "./jsonld";

export interface Breadcrumb {
  name: string;
  url: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function extractItem(element: unknown): { name: string; url: string } | null {
  if (!isRecord(element)) {
    return null;
  }
  const name = element.name;
  const item = element.item;
  if (typeof name !== "string") {
    return null;
  }
  if (typeof item === "string") {
    return { name, url: item };
  }
  if (isRecord(item) && typeof item["@id"] === "string") {
    return { name, url: item["@id"] };
  }
  return null;
}

export function deriveBreadcrumbs(blocks: JsonLdBlock[]): Breadcrumb[] {
  for (const block of blocks) {
    if (block.type !== "BreadcrumbList" || !isRecord(block.raw)) {
      continue;
    }
    const list = block.raw.itemListElement;
    if (!Array.isArray(list)) {
      continue;
    }
    const crumbs: Breadcrumb[] = [];
    for (const element of list) {
      const item = extractItem(element);
      if (item !== null) {
        crumbs.push(item);
      }
    }
    if (crumbs.length > 0) {
      return crumbs;
    }
  }
  return [];
}
