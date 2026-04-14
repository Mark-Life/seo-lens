import { PageUrl } from "@workspace/seo-rules/schema";
import { describe, expect, it } from "vitest";
import { parseWebManifest } from "../../src/lib/services/site/manifest";

const url = PageUrl.make("https://example.com/site.webmanifest");

describe("parseWebManifest", () => {
  it("parses a well-formed manifest", () => {
    const body = JSON.stringify({
      name: "Example Site",
      short_name: "Example",
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512" },
      ],
    });
    const parsed = parseWebManifest(url, body);
    expect(parsed).not.toBeNull();
    expect(parsed?.name).toBe("Example Site");
    expect(parsed?.shortName).toBe("Example");
    expect(parsed?.icons.length).toBe(2);
    expect(parsed?.icons[0]).toMatchObject({
      src: "/icon-192.png",
      sizes: "192x192",
      type: "image/png",
    });
    expect(parsed?.icons[1]).toMatchObject({
      src: "/icon-512.png",
      sizes: "512x512",
      type: null,
    });
  });

  it("returns null fields when name/short_name are absent", () => {
    const parsed = parseWebManifest(url, JSON.stringify({ icons: [] }));
    expect(parsed?.name).toBeNull();
    expect(parsed?.shortName).toBeNull();
    expect(parsed?.icons).toEqual([]);
  });

  it("drops icon entries that lack a src", () => {
    const body = JSON.stringify({
      icons: [{ sizes: "96x96" }, { src: "/ok.png" }, { src: 42 }],
    });
    const parsed = parseWebManifest(url, body);
    expect(parsed?.icons.length).toBe(1);
    expect(parsed?.icons[0].src).toBe("/ok.png");
  });

  it("returns null for malformed JSON without throwing", () => {
    expect(parseWebManifest(url, "{ not json")).toBeNull();
    expect(parseWebManifest(url, "")).toBeNull();
  });

  it("returns null for JSON null without throwing (malformed fall-through)", () => {
    expect(parseWebManifest(url, "null")).toBeNull();
  });
});
