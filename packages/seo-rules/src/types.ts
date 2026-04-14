import type {
  AuditFinding,
  Category,
  PageData,
  PageSignals,
  RuleId,
  SiteSignals,
} from "./schema";

export interface AuditRule {
  readonly category: Category;
  readonly description: string;
  readonly id: RuleId;
  readonly name: string;
  readonly run: (
    page: PageData,
    signals: PageSignals,
    siteSignals?: SiteSignals
  ) => readonly AuditFinding[];
  readonly weight: number;
}
