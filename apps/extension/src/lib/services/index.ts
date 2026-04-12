import { Layer } from "effect";
import { Auditor } from "./auditor";
import { BrowserApi } from "./browser-api";
import { AuditBus } from "./bus";
import { AuditCache } from "./cache";
import { Extractor } from "./extractor";
import { Fetcher } from "./fetcher";
import { HtmlExtractor } from "./html-extractor";

export { Auditor } from "./auditor";
export { BrowserApi, type TabEvent, type TabInfo } from "./browser-api";
export { AuditBus } from "./bus";
export { AuditCache, type CacheEntry } from "./cache";
export { Extractor } from "./extractor";
export { Fetcher } from "./fetcher";
export { HtmlExtractor } from "./html-extractor";

export const appLayer = Layer.mergeAll(
  AuditBus.layer,
  AuditCache.layer,
  Auditor.layer,
  Extractor.layer.pipe(
    Layer.provide([BrowserApi.layer, Fetcher.layer, HtmlExtractor.layer])
  ),
  BrowserApi.layer
);
