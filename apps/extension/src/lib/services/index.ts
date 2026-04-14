import { Layer } from "effect";
import { LoggerLive } from "../logger";
import { Auditor } from "./auditor";
import { BrowserApi } from "./browser-api";
import { AuditBus } from "./bus";
import { AuditCache } from "./cache";
import { Extractor } from "./extractor";
import { siteServicesLayer } from "./site";

export { Auditor } from "./auditor";
export { BrowserApi, type TabEvent, type TabInfo } from "./browser-api";
export { AuditBus } from "./bus";
export { AuditCache, type CacheEntry } from "./cache";
export { type ExtractedPage, Extractor } from "./extractor";
export { Fetcher } from "./fetcher";
export {
  FaviconService,
  type FaviconServiceShape,
  FeedService,
  type FeedServiceShape,
  HostProbeService,
  type HostProbeServiceShape,
  LlmsTxtService,
  type LlmsTxtServiceShape,
  ManifestService,
  type ManifestServiceShape,
  RobotsService,
  type RobotsServiceShape,
  SecurityTxtService,
  type SecurityTxtServiceShape,
  SitemapService,
  type SitemapServiceShape,
  SiteSignalsService,
  type SiteSignalsServiceShape,
  SoftFourOhFourService,
  type SoftFourOhFourServiceShape,
  siteServicesLayer,
} from "./site";

export const appLayer = Layer.mergeAll(
  AuditBus.layer,
  AuditCache.layer,
  Auditor.layer,
  Extractor.layer.pipe(Layer.provide(BrowserApi.layer)),
  BrowserApi.layer,
  siteServicesLayer,
  LoggerLive
);
