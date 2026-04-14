# Changelog

All notable changes to the SEO Lens extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2026-04-14

Initial release. Chrome side panel extension that audits the active tab's SEO metadata from fetched HTML.

### Added

- Side panel UI with two tabs: Audit and Metadata.
- Audit tab — overall score, severity counts, per-category scores, filterable findings list with per-finding copy (grep-able snippets), Markdown/JSON export.
- Metadata tab — meta, social preview, heading tree, JSON-LD blocks, breadcrumbs, indexing dashboard, image gallery.
- Audit engine (`@workspace/seo-rules`) covering title, meta description, headings, image alt, structured data, social OG/Twitter, canonical, robots directives.
- JSON-LD support — schema.org vocab recognition, rich-results validation, page-kind-aware recommendations (article, product, homepage, breadcrumb).
- Site-level static signals — `robots.txt`, `sitemap.xml`, `.well-known/security.txt` folded into the current-page report.
- Copy-for-AI — per-finding copy, per-section copy in Inspect, full-report exports.
- Reactive audit triggers — tab switch, window focus, full load, SPA soft-nav, manual refresh; per-tab debouncing via Effect `Queue` + `Stream.groupByKey`.
- Cross-origin image rendering in the Inspect gallery.
