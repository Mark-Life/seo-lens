/**
 * Minimal JSON-LD templates shown in recommendation findings. Each template
 * carries `@context`, `@type`, and only the fields the matching
 * `RichResultSpec.required` schema demands — nothing else. Users copy + fill;
 * they should never have to delete cruft. Kept as indented JSON strings so
 * each field is grep-friendly on its own line.
 */

export const ARTICLE_TEMPLATE = `{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "",
  "image": [""],
  "datePublished": "",
  "author": { "@type": "Person", "name": "" }
}`;

export const PRODUCT_TEMPLATE = `{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "",
  "image": [""]
}`;

export const WEBSITE_TEMPLATE = `{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "",
  "url": ""
}`;

export const ORGANIZATION_TEMPLATE = `{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "",
  "url": ""
}`;

export const BREADCRUMB_TEMPLATE = `{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "", "item": "" }
  ]
}`;
