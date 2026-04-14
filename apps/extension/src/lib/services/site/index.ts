import { Layer } from "effect";
import { FaviconService } from "./favicon";
import { FeedService } from "./feed";
import { HostProbeService } from "./host-probe";
import { LlmsTxtService } from "./llms-txt";
import { ManifestService } from "./manifest";
import { RobotsService } from "./robots";
import { SecurityTxtService } from "./security-txt";
import { SiteSignalsService } from "./site-signals";
import { SitemapService } from "./sitemap";
import { SoftFourOhFourService } from "./soft-404";

export { FaviconService, type FaviconServiceShape } from "./favicon";
export { FeedService, type FeedServiceShape } from "./feed";
export { HostProbeService, type HostProbeServiceShape } from "./host-probe";
export { LlmsTxtService, type LlmsTxtServiceShape } from "./llms-txt";
export {
  ManifestService,
  type ManifestServiceShape,
  parseWebManifest,
} from "./manifest";
export {
  makeOriginCache,
  type OriginCache,
  withOriginCache,
} from "./origin-cache";
export {
  type ParsedRobotsTxt,
  parseRobotsTxt,
  RobotsService,
  type RobotsServiceShape,
} from "./robots";
export {
  type ParsedSecurityTxt,
  parseSecurityTxt,
  SecurityTxtService,
  type SecurityTxtServiceShape,
} from "./security-txt";
export {
  SiteSignalsService,
  type SiteSignalsServiceShape,
} from "./site-signals";
export {
  type ParsedSitemap,
  parseSitemapXml,
  SitemapService,
  type SitemapServiceShape,
} from "./sitemap";
export {
  SoftFourOhFourService,
  type SoftFourOhFourServiceShape,
} from "./soft-404";

const baseSiteServicesLayer = Layer.mergeAll(
  RobotsService.layer,
  SitemapService.layer,
  SecurityTxtService.layer,
  FaviconService.layer,
  ManifestService.layer,
  FeedService.layer,
  LlmsTxtService.layer,
  HostProbeService.layer,
  SoftFourOhFourService.layer
);

/**
 * Merged layer of every site-level service plus the composite SiteSignals
 * service. SiteSignals depends on the individual services — provided via
 * Layer.provideMerge so both the composite and the individual services
 * remain available to downstream consumers.
 */
export const siteServicesLayer = SiteSignalsService.layer.pipe(
  Layer.provideMerge(baseSiteServicesLayer)
);
