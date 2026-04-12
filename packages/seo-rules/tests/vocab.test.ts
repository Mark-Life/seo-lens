import { describe, expect, it } from "@effect/vitest";
import { schemaVocab } from "../src/generated/schema-vocab.js";
import {
  isClass,
  isSubClassOf,
  propertiesOf,
  propertyValidFor,
  suggestClass,
} from "../src/vocab/query.js";

describe("schemaVocab", () => {
  it("has the expected shape and size", () => {
    expect(schemaVocab.classes.size).toBeGreaterThan(800);
    expect(schemaVocab.properties.size).toBeGreaterThan(1000);
  });
});

describe("isClass", () => {
  it("accepts known classes", () => {
    expect(isClass("Article")).toBe(true);
    expect(isClass("NewsArticle")).toBe(true);
    expect(isClass("Product")).toBe(true);
    expect(isClass("Thing")).toBe(true);
  });

  it("rejects unknown / misspelled classes", () => {
    expect(isClass("Artikel")).toBe(false);
    expect(isClass("")).toBe(false);
    expect(isClass("article")).toBe(false);
  });
});

describe("isSubClassOf", () => {
  it("walks the subclass chain", () => {
    expect(isSubClassOf("NewsArticle", "Article")).toBe(true);
    expect(isSubClassOf("NewsArticle", "CreativeWork")).toBe(true);
    expect(isSubClassOf("NewsArticle", "Thing")).toBe(true);
    expect(isSubClassOf("BlogPosting", "Article")).toBe(true);
    expect(isSubClassOf("Restaurant", "LocalBusiness")).toBe(true);
  });

  it("treats a class as its own ancestor", () => {
    expect(isSubClassOf("Article", "Article")).toBe(true);
  });

  it("rejects non-ancestors", () => {
    expect(isSubClassOf("Article", "Product")).toBe(false);
    expect(isSubClassOf("Article", "NewsArticle")).toBe(false);
    expect(isSubClassOf("Nonsense", "Thing")).toBe(false);
  });
});

describe("propertiesOf", () => {
  it("includes inherited properties from ancestors", () => {
    const props = propertiesOf("NewsArticle");
    expect(props.has("headline")).toBe(true);
    expect(props.has("author")).toBe(true);
    expect(props.has("name")).toBe(true);
  });

  it("returns empty set for unknown types", () => {
    expect(propertiesOf("Nonsense").size).toBe(0);
  });
});

describe("propertyValidFor", () => {
  it("accepts inherited properties", () => {
    expect(propertyValidFor("headline", "Article")).toBe(true);
    expect(propertyValidFor("headline", "NewsArticle")).toBe(true);
    expect(propertyValidFor("name", "NewsArticle")).toBe(true);
  });

  it("rejects properties defined on unrelated domains", () => {
    expect(propertyValidFor("price", "Article")).toBe(false);
    expect(propertyValidFor("recipeIngredient", "Product")).toBe(false);
  });

  it("passes unknown properties through (no signal)", () => {
    expect(propertyValidFor("notARealProp", "Article")).toBe(true);
  });
});

describe("suggestClass", () => {
  it("suggests the closest class for common typos", () => {
    expect(suggestClass("Organziation")).toBe("Organization");
    expect(suggestClass("Artcle")).toBe("Article");
  });

  it("returns null when the input is already a class", () => {
    expect(suggestClass("Article")).toBe(null);
  });

  it("returns null when no candidate is close enough", () => {
    expect(suggestClass("CompletelyUnrelatedWord")).toBe(null);
  });
});
