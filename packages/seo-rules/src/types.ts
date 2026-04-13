import type {
  AuditFinding,
  Category,
  PageData,
  PageSignals,
  RuleId,
} from "./schema";

export interface AuditRule {
  readonly category: Category;
  readonly description: string;
  readonly id: RuleId;
  readonly name: string;
  readonly run: (
    page: PageData,
    signals: PageSignals
  ) => readonly AuditFinding[];
  readonly weight: number;
}
