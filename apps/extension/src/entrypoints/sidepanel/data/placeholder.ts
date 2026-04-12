// Placeholder data — wire to real audit later.

export type Severity = "error" | "warning" | "info" | "pass";

export interface Finding {
  category: Category;
  context?: { label: string; value: string }[];
  grep?: string;
  id: string;
  message: string;
  ruleId: string;
  severity: Severity;
  title: string;
}

export type Category =
  | "meta"
  | "headings"
  | "social"
  | "structured"
  | "images"
  | "indexing";

export const categoryLabels: Record<Category, string> = {
  meta: "Meta tags",
  headings: "Heading hierarchy",
  social: "Social previews",
  structured: "Structured data",
  images: "Images",
  indexing: "Indexing",
};

export const audit = {
  url: "https://acme.studio/products/aurora-lamp",
  score: 72,
  counts: { error: 3, warning: 5, info: 2, pass: 18 },
  categories: [
    { id: "meta" as Category, score: 80 },
    { id: "headings" as Category, score: 55 },
    { id: "social" as Category, score: 90 },
    { id: "structured" as Category, score: 40 },
    { id: "images" as Category, score: 65 },
    { id: "indexing" as Category, score: 100 },
  ],
};

export const findings: Finding[] = [
  {
    id: "f1",
    ruleId: "headings.single-h1",
    category: "headings",
    severity: "error",
    title: "Multiple H1 elements found",
    message: "A page should have exactly one H1. Found 3.",
    context: [
      { label: "H1 #1", value: "Welcome to Acme Studio" },
      { label: "H1 #2", value: "About Us" },
      { label: "H1 #3", value: "Contact" },
    ],
    grep: "<h1>About Us</h1>",
  },
  {
    id: "f2",
    ruleId: "meta.description-length",
    category: "meta",
    severity: "warning",
    title: "Meta description too long",
    message: "186 characters — Google typically truncates at ~160.",
    context: [
      {
        label: "content",
        value:
          "The Aurora Lamp is a hand-blown borosilicate desk lamp with adjustable warm-white LEDs, milled from solid brass and assembled by hand in our Lisbon studio for collectors.",
      },
    ],
    grep: '<meta name="description"',
  },
  {
    id: "f3",
    ruleId: "structured.unknown-type",
    category: "structured",
    severity: "error",
    title: "Unrecognized JSON-LD type",
    message: 'Type "Organziation" is not a valid schema.org type.',
    context: [
      { label: "@type", value: "Organziation" },
      { label: "did you mean", value: "Organization" },
      { label: "block", value: "ld+json #2" },
    ],
    grep: '"@type": "Organziation"',
  },
  {
    id: "f4",
    ruleId: "images.missing-alt",
    category: "images",
    severity: "warning",
    title: "4 images missing alt text",
    message: 'Decorative images should use alt="" — content images need text.',
    context: [
      { label: "src", value: "/img/hero-aurora.jpg" },
      { label: "src", value: "/img/studio-1.jpg" },
      { label: "src", value: "/img/studio-2.jpg" },
      { label: "src", value: "/img/team.jpg" },
    ],
  },
  {
    id: "f5",
    ruleId: "social.og-image",
    category: "social",
    severity: "info",
    title: "Open Graph image is small",
    message:
      "1024×512 — recommended is at least 1200×630 for crisp social cards.",
    context: [
      { label: "og:image", value: "/og/aurora-lamp.png" },
      { label: "size", value: "1024×512" },
    ],
  },
  {
    id: "f6",
    ruleId: "headings.skip-level",
    category: "headings",
    severity: "warning",
    title: "Heading level skipped",
    message: "An H4 follows an H2 — H3 is missing in between.",
    context: [
      { label: "after", value: "H2 — Specifications" },
      { label: "found", value: "H4 — Materials" },
    ],
  },
  {
    id: "f7",
    ruleId: "meta.title-length",
    category: "meta",
    severity: "pass",
    title: "Title length is optimal",
    message: "58 characters — within the 50–60 sweet spot.",
  },
  {
    id: "f8",
    ruleId: "indexing.canonical",
    category: "indexing",
    severity: "pass",
    title: "Canonical URL is set",
    message: "Self-referential canonical present and matches the page URL.",
  },
];

export const meta = {
  title: "Aurora Lamp — Hand-blown desk lamp · Acme Studio",
  description:
    "The Aurora Lamp is a hand-blown borosilicate desk lamp with adjustable warm-white LEDs, milled from solid brass and assembled by hand in our Lisbon studio for collectors.",
  canonical: "https://acme.studio/products/aurora-lamp",
  robots: "index, follow",
  viewport: "width=device-width, initial-scale=1",
  lang: "en",
  charset: "UTF-8",
};

export const social = {
  ogTitle: "Aurora Lamp — A desk lamp you'll keep forever",
  ogDescription: "Hand-blown borosilicate. Solid brass. Made in Lisbon.",
  ogImage: "/og/aurora-lamp.png",
  ogType: "product",
  twitterCard: "summary_large_image",
  domain: "acme.studio",
};

export const headings = [
  { level: 1, text: "Welcome to Acme Studio" },
  { level: 2, text: "Featured" },
  { level: 3, text: "Aurora Lamp" },
  { level: 3, text: "Helios Sconce" },
  { level: 2, text: "Specifications" },
  { level: 4, text: "Materials" },
  { level: 1, text: "About Us" },
  { level: 1, text: "Contact" },
];

export const jsonld = `{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Aurora Lamp",
  "brand": {
    "@type": "Organziation",
    "name": "Acme Studio"
  },
  "offers": {
    "@type": "Offer",
    "price": "320.00",
    "priceCurrency": "EUR"
  }
}`;

export const images = [
  { src: "/img/hero-aurora.jpg", alt: null, w: 1600, h: 900 },
  {
    src: "/img/aurora-detail.jpg",
    alt: "Brass joint of the Aurora lamp",
    w: 800,
    h: 800,
  },
  { src: "/img/studio-1.jpg", alt: null, w: 1200, h: 800 },
  {
    src: "/img/lamp-on.jpg",
    alt: "Aurora lamp lit on a walnut desk",
    w: 1200,
    h: 800,
  },
];
