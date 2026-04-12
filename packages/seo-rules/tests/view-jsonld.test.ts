import { describe, expect, it } from "@effect/vitest";
import { AuditRootInfo, PageData, PageUrl } from "../src/schema.js";
import {
  deriveJsonLdBlocks,
  type JsonLdArrayNode,
  type JsonLdNode,
  type JsonLdObjectNode,
  type JsonLdPrimitiveNode,
} from "../src/view/jsonld.js";

const makePage = (jsonLd: readonly unknown[]): PageData =>
  PageData.make({
    url: PageUrl.make("https://example.com/"),
    title: "",
    metaDescription: "",
    canonical: null,
    robotsMeta: null,
    headings: [],
    images: [],
    links: [],
    openGraph: {},
    twitterCard: {},
    jsonLd,
    auditRoot: AuditRootInfo.make({ selector: "body", source: "body" }),
  });

const asObject = (n: JsonLdNode): JsonLdObjectNode => {
  if (n.kind !== "object") {
    throw new Error(`expected object node, got ${n.kind}`);
  }
  return n;
};

const asArray = (n: JsonLdNode): JsonLdArrayNode => {
  if (n.kind !== "array") {
    throw new Error(`expected array node, got ${n.kind}`);
  }
  return n;
};

const asPrimitive = (n: JsonLdNode): JsonLdPrimitiveNode => {
  if (n.kind !== "primitive") {
    throw new Error(`expected primitive node, got ${n.kind}`);
  }
  return n;
};

const childByKey = (parent: JsonLdObjectNode, key: string): JsonLdNode => {
  const found = parent.children.find((c) => "key" in c && c.key === key);
  if (!found) {
    throw new Error(`no child with key ${key}`);
  }
  return found;
};

describe("deriveJsonLdBlocks tree model", () => {
  it("builds nested object subtrees instead of stringified placeholders", () => {
    const product = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: "Widget",
      brand: { "@type": "Brand", name: "Acme" },
      offers: [
        { "@type": "Offer", price: "9.99", priceCurrency: "USD" },
        { "@type": "Offer", price: "19.99", priceCurrency: "EUR" },
      ],
    };
    const [block] = deriveJsonLdBlocks(makePage([product]));
    expect(block?.type).toBe("Product");
    expect(block?.typeValid).toBe(true);
    expect(block?.typeSuggestion).toBeNull();
    expect(block?.richResults).toBeNull();

    const root = asObject(block!.root);
    expect(root.type).toBe("Product");
    expect(root.path).toBe("");

    const brand = asObject(childByKey(root, "brand"));
    expect(brand.type).toBe("Brand");
    expect(brand.path).toBe("/brand");
    const brandName = asPrimitive(childByKey(brand, "name"));
    expect(brandName.value).toBe("Acme");
    expect(brandName.path).toBe("/brand/name");

    const offers = asArray(childByKey(root, "offers"));
    expect(offers.items).toHaveLength(2);
    expect(offers.path).toBe("/offers");
    const firstOffer = asObject(offers.items[0]!);
    expect(firstOffer.type).toBe("Offer");
    expect(firstOffer.path).toBe("/offers/0");
    const price = asPrimitive(childByKey(firstOffer, "price"));
    expect(price.value).toBe("9.99");
    expect(price.path).toBe("/offers/0/price");
  });

  it("flags properties not valid for the parent @type", () => {
    const article = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Hello",
      sku: "ABC-123",
    };
    const [block] = deriveJsonLdBlocks(makePage([article]));
    const root = asObject(block!.root);
    const sku = asPrimitive(childByKey(root, "sku"));
    expect(sku.validity.status).toBe("unknown-property");
    expect(sku.validity.note).toContain("Article");
    const headline = asPrimitive(childByKey(root, "headline"));
    expect(headline.validity.status).toBe("ok");
  });

  it("suggests a class for typo'd @type", () => {
    const [block] = deriveJsonLdBlocks(
      makePage([{ "@context": "https://schema.org", "@type": "Organziation" }])
    );
    expect(block?.typeValid).toBe(false);
    expect(block?.typeSuggestion).toBe("Organization");
  });

  it("handles non-object JSON-LD blocks defensively", () => {
    const [block] = deriveJsonLdBlocks(makePage(["not an object"]));
    expect(block?.type).toBe("unknown");
    expect(block?.typeValid).toBe(false);
    const root = asObject(block!.root);
    expect(root.children).toHaveLength(0);
  });
});
