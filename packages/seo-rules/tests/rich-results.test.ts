import { describe, expect, it } from "@effect/vitest";
import { validateBlock } from "../src/rich-results/validate.js";

const baseArticle = {
  "@context": "https://schema.org",
  "@type": "Article" as const,
  headline: "Hello, world",
  image: "https://example.com/cover.jpg",
  datePublished: "2026-04-12",
  author: { "@type": "Person" as const, name: "Jane Doe" },
  dateModified: "2026-04-12",
  publisher: {
    "@type": "Organization",
    name: "Example",
    logo: { "@type": "ImageObject", url: "https://example.com/logo.png" },
  },
  mainEntityOfPage: "https://example.com/hello",
  articleSection: "Tech",
  articleBody: "Body text.",
  wordCount: 42,
  keywords: ["hello", "world"],
  inLanguage: "en",
  isAccessibleForFree: true,
  about: "Greetings",
  description: "An example article",
};

describe("validateBlock — Article spec", () => {
  it("reports no required errors when all required fields are present", () => {
    const report = validateBlock(baseArticle, "Article");
    expect(report).not.toBeNull();
    expect(report?.spec).toBe("Article");
    expect(report?.requiredErrors).toHaveLength(0);
    expect(report?.recommendedErrors).toHaveLength(0);
    expect(report?.docUrl).toContain("developers.google.com");
  });

  it("reports a FieldError at /datePublished when the field is missing", () => {
    const { datePublished: _, ...missing } = baseArticle;
    const report = validateBlock(missing, "Article");
    expect(report).not.toBeNull();
    const paths = report?.requiredErrors.map((e) => e.path) ?? [];
    expect(paths).toContain("/datePublished");
  });

  it("matches NewsArticle via registered subtype", () => {
    const news = { ...baseArticle, "@type": "NewsArticle" as const };
    const report = validateBlock(news, "NewsArticle");
    expect(report).not.toBeNull();
    expect(report?.spec).toBe("Article");
    expect(report?.requiredErrors).toHaveLength(0);
  });

  it("returns null for types with no registered spec", () => {
    const report = validateBlock(
      { "@type": "Dataset", name: "Census 2020" },
      "Dataset"
    );
    expect(report).toBeNull();
  });

  it("flags a missing recommended field as a recommendedError", () => {
    const { dateModified: _, ...noDateMod } = baseArticle;
    const report = validateBlock(noDateMod, "Article");
    const paths = report?.recommendedErrors.map((e) => e.path) ?? [];
    expect(paths).toContain("/dateModified");
    expect(report?.requiredErrors).toHaveLength(0);
  });

  it("populates suggestions for missing top-level fields", () => {
    const bare = { "@type": "Article" as const, headline: "Hello" };
    const report = validateBlock(bare, "Article");
    const req = report?.suggestions
      .filter((s) => s.severity === "required")
      .map((s) => s.name);
    const rec = report?.suggestions
      .filter((s) => s.severity === "recommended")
      .map((s) => s.name);
    expect(req).toEqual(
      expect.arrayContaining(["image", "datePublished", "author"])
    );
    expect(req).not.toContain("headline");
    expect(rec).toEqual(expect.arrayContaining(["dateModified", "publisher"]));
  });

  it("leaves suggestions empty when the block is complete", () => {
    const report = validateBlock(baseArticle, "Article");
    expect(report?.suggestions).toHaveLength(0);
  });
});

describe("validateBlock — Product spec", () => {
  const baseProduct = {
    "@type": "Product" as const,
    name: "Acme Widget",
    image: "https://example.com/widget.jpg",
    description: "A widget",
    offers: { "@type": "Offer", price: "9.99", priceCurrency: "USD" },
    brand: { "@type": "Brand", name: "Acme" },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.5",
      reviewCount: 12,
    },
    review: [],
  };

  it("passes when name + image are present", () => {
    const report = validateBlock(baseProduct, "Product");
    expect(report).not.toBeNull();
    expect(report?.spec).toBe("Product");
    expect(report?.requiredErrors).toHaveLength(0);
  });

  it("flags missing image at /image", () => {
    const { image: _, ...noImage } = baseProduct;
    const report = validateBlock(noImage, "Product");
    const paths = report?.requiredErrors.map((e) => e.path) ?? [];
    expect(paths).toContain("/image");
  });
});

describe("validateBlock — BreadcrumbList spec", () => {
  const breadcrumb = {
    "@type": "BreadcrumbList" as const,
    itemListElement: [
      {
        "@type": "ListItem" as const,
        position: 1,
        name: "Home",
        item: "https://example.com/",
      },
      {
        "@type": "ListItem" as const,
        position: 2,
        name: "Shop",
        item: "https://example.com/shop",
      },
    ],
  };

  it("passes for a well-formed breadcrumb list", () => {
    const report = validateBlock(breadcrumb, "BreadcrumbList");
    expect(report).not.toBeNull();
    expect(report?.requiredErrors).toHaveLength(0);
  });

  it("flags missing itemListElement", () => {
    const report = validateBlock(
      { "@type": "BreadcrumbList" },
      "BreadcrumbList"
    );
    const paths = report?.requiredErrors.map((e) => e.path) ?? [];
    expect(paths).toContain("/itemListElement");
  });
});

describe("validateBlock — FAQPage spec", () => {
  const faq = {
    "@type": "FAQPage" as const,
    mainEntity: [
      {
        "@type": "Question" as const,
        name: "What?",
        acceptedAnswer: { "@type": "Answer" as const, text: "An answer." },
      },
    ],
  };

  it("passes when mainEntity has a Question with acceptedAnswer.text", () => {
    const report = validateBlock(faq, "FAQPage");
    expect(report?.requiredErrors).toHaveLength(0);
  });

  it("flags Question without acceptedAnswer.text at the nested path", () => {
    const broken = {
      "@type": "FAQPage" as const,
      mainEntity: [
        {
          "@type": "Question" as const,
          name: "What?",
          acceptedAnswer: { "@type": "Answer" as const },
        },
      ],
    };
    const report = validateBlock(broken, "FAQPage");
    const paths = report?.requiredErrors.map((e) => e.path) ?? [];
    expect(paths).toContain("/mainEntity/0/acceptedAnswer/text");
  });
});

describe("validateBlock — HowTo spec", () => {
  const howTo = {
    "@type": "HowTo" as const,
    name: "Tie a knot",
    step: [
      { "@type": "HowToStep" as const, text: "Loop the rope." },
      { "@type": "HowToStep" as const, text: "Pull tight." },
    ],
    totalTime: "PT5M",
    supply: [],
    tool: [],
    estimatedCost: { "@type": "MonetaryAmount" },
    image: "https://example.com/knot.jpg",
  };

  it("passes when name + step are present", () => {
    const report = validateBlock(howTo, "HowTo");
    expect(report?.requiredErrors).toHaveLength(0);
    expect(report?.recommendedErrors).toHaveLength(0);
  });

  it("flags missing step", () => {
    const { step: _, ...noStep } = howTo;
    const report = validateBlock(noStep, "HowTo");
    const paths = report?.requiredErrors.map((e) => e.path) ?? [];
    expect(paths).toContain("/step");
  });
});

describe("validateBlock — Recipe spec", () => {
  const recipe = {
    "@type": "Recipe" as const,
    name: "Pancakes",
    image: "https://example.com/pancakes.jpg",
    recipeIngredient: ["2 cups flour", "1 egg"],
    recipeInstructions: "Mix and cook.",
    author: { "@type": "Person", name: "Jane" },
    datePublished: "2026-01-01",
    description: "Fluffy pancakes",
    prepTime: "PT5M",
    cookTime: "PT10M",
    totalTime: "PT15M",
    recipeYield: "4 servings",
    nutrition: { "@type": "NutritionInformation" },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5",
      reviewCount: 1,
    },
  };

  it("passes when all required fields are present", () => {
    const report = validateBlock(recipe, "Recipe");
    expect(report?.requiredErrors).toHaveLength(0);
  });

  it("flags missing recipeIngredient", () => {
    const { recipeIngredient: _, ...noIngredients } = recipe;
    const report = validateBlock(noIngredients, "Recipe");
    const paths = report?.requiredErrors.map((e) => e.path) ?? [];
    expect(paths).toContain("/recipeIngredient");
  });
});

describe("validateBlock — Event spec", () => {
  const event = {
    "@type": "Event" as const,
    name: "Concert",
    startDate: "2026-06-01T19:00",
    location: { "@type": "Place", name: "Hall" },
    endDate: "2026-06-01T22:00",
    description: "A concert",
    image: "https://example.com/concert.jpg",
    offers: {},
    performer: {},
    organizer: {},
  };

  it("passes when name + startDate + location are present", () => {
    const report = validateBlock(event, "Event");
    expect(report?.requiredErrors).toHaveLength(0);
  });

  it("flags missing startDate", () => {
    const { startDate: _, ...noStart } = event;
    const report = validateBlock(noStart, "Event");
    const paths = report?.requiredErrors.map((e) => e.path) ?? [];
    expect(paths).toContain("/startDate");
  });

  it("matches MusicEvent via vocab subClassOf walk", () => {
    const musicEvent = { ...event, "@type": "MusicEvent" as const };
    const report = validateBlock(musicEvent, "MusicEvent");
    expect(report).not.toBeNull();
    expect(report?.spec).toBe("Event");
    expect(report?.requiredErrors).toHaveLength(0);
  });
});

describe("validateBlock — LocalBusiness spec", () => {
  const business = {
    "@type": "LocalBusiness" as const,
    name: "Acme Cafe",
    address: {
      "@type": "PostalAddress" as const,
      streetAddress: "1 Main St",
      addressLocality: "Springfield",
    },
    image: "https://example.com/cafe.jpg",
    telephone: "+1-555-0100",
    url: "https://example.com",
    priceRange: "$$",
    openingHoursSpecification: [],
    geo: { "@type": "GeoCoordinates", latitude: 0, longitude: 0 },
  };

  it("passes when name + address are present", () => {
    const report = validateBlock(business, "LocalBusiness");
    expect(report?.requiredErrors).toHaveLength(0);
  });

  it("flags missing address", () => {
    const { address: _, ...noAddress } = business;
    const report = validateBlock(noAddress, "LocalBusiness");
    const paths = report?.requiredErrors.map((e) => e.path) ?? [];
    expect(paths).toContain("/address");
  });

  it("matches Restaurant via vocab subClassOf walk", () => {
    const restaurant = { ...business, "@type": "Restaurant" as const };
    const report = validateBlock(restaurant, "Restaurant");
    expect(report).not.toBeNull();
    expect(report?.spec).toBe("LocalBusiness");
    expect(report?.requiredErrors).toHaveLength(0);
  });
});

describe("validateBlock — VideoObject spec", () => {
  const video = {
    "@type": "VideoObject" as const,
    name: "Demo",
    description: "A demo video",
    thumbnailUrl: "https://example.com/thumb.jpg",
    uploadDate: "2026-01-01",
    contentUrl: "https://example.com/video.mp4",
    embedUrl: "https://example.com/embed",
    duration: "PT1M30S",
    expires: "2027-01-01",
    interactionStatistic: {},
  };

  it("passes when all required fields are present", () => {
    const report = validateBlock(video, "VideoObject");
    expect(report?.requiredErrors).toHaveLength(0);
  });

  it("flags missing uploadDate", () => {
    const { uploadDate: _, ...noUpload } = video;
    const report = validateBlock(noUpload, "VideoObject");
    const paths = report?.requiredErrors.map((e) => e.path) ?? [];
    expect(paths).toContain("/uploadDate");
  });
});

describe("validateBlock — JobPosting spec", () => {
  const job = {
    "@type": "JobPosting" as const,
    title: "Engineer",
    description: "Build things",
    datePosted: "2026-04-01",
    hiringOrganization: { "@type": "Organization" as const, name: "Acme" },
    jobLocation: {
      "@type": "Place" as const,
      address: { "@type": "PostalAddress", addressLocality: "Springfield" },
    },
    baseSalary: {},
    employmentType: "FULL_TIME",
    validThrough: "2026-12-31",
    identifier: {},
  };

  it("passes when all required fields are present", () => {
    const report = validateBlock(job, "JobPosting");
    expect(report?.requiredErrors).toHaveLength(0);
  });

  it("flags missing hiringOrganization.name nested path", () => {
    const broken = {
      ...job,
      hiringOrganization: { "@type": "Organization" as const },
    };
    const report = validateBlock(broken, "JobPosting");
    const paths = report?.requiredErrors.map((e) => e.path) ?? [];
    expect(paths).toContain("/hiringOrganization/name");
  });
});
