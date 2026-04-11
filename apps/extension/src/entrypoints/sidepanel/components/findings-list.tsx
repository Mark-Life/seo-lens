import type { AuditFinding, Severity } from "@workspace/seo-rules";

interface FindingsListProps {
  findings: AuditFinding[];
}

const severityConfig: Record<Severity, { label: string; className: string }> = {
  error: { label: "Error", className: "bg-red-100 text-red-800" },
  warning: { label: "Warning", className: "bg-yellow-100 text-yellow-800" },
  info: { label: "Info", className: "bg-blue-100 text-blue-800" },
  pass: { label: "Pass", className: "bg-green-100 text-green-800" },
};

function copyReport(findings: AuditFinding[]): void {
  const lines = findings.map(
    (f) => `[${f.severity.toUpperCase()}] ${f.ruleId}: ${f.message}`
  );
  navigator.clipboard.writeText(lines.join("\n"));
}

export function FindingsList({ findings }: FindingsListProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-sm">Findings</h2>
        <button
          className="text-muted-foreground text-xs hover:text-foreground"
          onClick={() => copyReport(findings)}
          type="button"
        >
          Copy report
        </button>
      </div>
      <ul className="flex flex-col gap-1.5">
        {findings.map((finding, i) => {
          const config = severityConfig[finding.severity];
          return (
            <li
              className="rounded-md border p-2.5 text-sm"
              key={`${finding.ruleId}-${i}`}
            >
              <span
                className={`mr-2 inline-block rounded px-1.5 py-0.5 font-medium text-xs ${config.className}`}
              >
                {config.label}
              </span>
              {finding.message}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
