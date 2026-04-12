import type {
  FieldSuggestion,
  JsonLdArrayNode,
  JsonLdBlock,
  JsonLdNode,
  JsonLdObjectNode,
  JsonLdPrimitiveNode,
  RichResultsReport,
} from "@workspace/seo-rules";
import { ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { CopyButton } from "./copy-button";

interface JsonLdTreeProps {
  readonly blocks: readonly JsonLdBlock[];
}

type PrimitiveValue = string | number | boolean | null;

const MAX_STRING_LEN = 180;

const nodeToJson = (node: JsonLdNode): unknown => {
  if (node.kind === "primitive") {
    return node.value;
  }
  if (node.kind === "array") {
    return node.items.map(nodeToJson);
  }
  const obj: Record<string, unknown> = {};
  if (node.type) {
    obj["@type"] = node.type;
  }
  for (const child of node.children) {
    const key = child.kind === "object" ? (child.key ?? "") : child.key;
    if (key) {
      obj[key] = nodeToJson(child);
    }
  }
  return obj;
};

const stringifyNode = (node: JsonLdNode): string =>
  JSON.stringify(nodeToJson(node), null, 2);

const truncate = (s: string): string =>
  s.length > MAX_STRING_LEN ? `${s.slice(0, MAX_STRING_LEN)}…` : s;

const primitiveToken = (
  value: PrimitiveValue
): { text: string; full: string; tone: string } => {
  if (value === null) {
    return {
      text: "null",
      full: "null",
      tone: "text-muted-foreground/70 italic",
    };
  }
  if (typeof value === "string") {
    const quoted = `"${value}"`;
    return {
      text: truncate(quoted),
      full: quoted,
      tone: "text-foreground",
    };
  }
  if (typeof value === "number") {
    return {
      text: String(value),
      full: String(value),
      tone: "text-primary tabular-nums",
    };
  }
  return {
    text: String(value),
    full: String(value),
    tone: "text-secondary-foreground",
  };
};

interface KeyLabelProps {
  readonly name: string;
  readonly note?: string;
  readonly warn: boolean;
}

const KeyLabel = ({ name, warn, note }: KeyLabelProps) => (
  <span
    className={`shrink-0 font-mono text-[10.5px] ${
      warn
        ? "text-amber-500 underline decoration-amber-500/60 decoration-dotted underline-offset-2"
        : "text-muted-foreground"
    }`}
    title={warn ? note : undefined}
  >
    {name}
  </span>
);

const Colon = () => (
  <span aria-hidden className="text-muted-foreground/40">
    :
  </span>
);

const TypePill = ({ type }: { type: string }) => (
  <span className="inline-flex shrink-0 items-center rounded-sm border border-primary/30 bg-primary/5 px-1 font-mono text-[9px] text-primary uppercase tracking-wider">
    {type}
  </span>
);

const arrayBracketLabel = (empty: boolean, open: boolean, count: number) => {
  if (empty) {
    return "[ ]";
  }
  if (open) {
    return "[";
  }
  return `[ ${count} ]`;
};

const objectBracketLabel = (empty: boolean, open: boolean) => {
  if (empty) {
    return "{ }";
  }
  if (open) {
    return "{";
  }
  return "{ … }";
};

interface HoverCopyProps {
  readonly label: string;
  readonly payload: string;
}

const HoverCopy = ({ label, payload }: HoverCopyProps) => (
  <div className="absolute top-0 right-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover/row:opacity-100">
    <CopyButton label={label} payload={payload} size="sm" stopPropagation />
  </div>
);

interface NodeProps {
  readonly node: JsonLdNode;
}

const PrimitiveRow = ({ node }: { node: JsonLdPrimitiveNode }) => {
  const warn = node.validity.status === "unknown-property";
  const token = primitiveToken(node.value);
  return (
    <div className="group/row relative flex min-h-[18px] items-baseline gap-1.5 py-px pr-8">
      <KeyLabel name={node.key} note={node.validity.note} warn={warn} />
      <Colon />
      <span
        className={`truncate font-mono text-[10.5px] ${token.tone}`}
        title={token.full}
      >
        {token.text}
      </span>
      <HoverCopy label="Copy value" payload={JSON.stringify(node.value)} />
    </div>
  );
};

const ArrayRow = ({ node }: { node: JsonLdArrayNode }) => {
  const [open, setOpen] = useState(true);
  const empty = node.items.length === 0;
  return (
    <div className="group/row relative pr-8">
      <button
        aria-expanded={open}
        className="flex w-full items-center gap-1 py-px text-left hover:text-foreground"
        disabled={empty}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <ChevronRight
          aria-hidden
          className={`size-3 shrink-0 text-muted-foreground/60 transition-transform ${
            empty ? "opacity-0" : ""
          } ${open ? "rotate-90" : ""}`}
        />
        <KeyLabel name={node.key} warn={false} />
        <Colon />
        <span className="font-mono text-[10.5px] text-muted-foreground/60">
          {arrayBracketLabel(empty, open, node.items.length)}
        </span>
      </button>
      {!empty && open && (
        <>
          <div className="ml-[5px] border-border/50 border-l pl-3">
            {node.items.map((item) => (
              <TreeNode key={item.path} node={item} />
            ))}
          </div>
          <div className="pl-4 font-mono text-[10.5px] text-muted-foreground/60">
            ]
          </div>
        </>
      )}
      <HoverCopy label="Copy array" payload={stringifyNode(node)} />
    </div>
  );
};

const ObjectRow = ({ node }: { node: JsonLdObjectNode }) => {
  const [open, setOpen] = useState(true);
  const warn = node.validity.status === "unknown-property";
  const empty = node.children.length === 0;
  const keyName = node.key ?? "";
  return (
    <div className="group/row relative pr-8">
      <button
        aria-expanded={open}
        className="flex w-full items-center gap-1 py-px text-left hover:text-foreground"
        disabled={empty && !node.type}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <ChevronRight
          aria-hidden
          className={`size-3 shrink-0 text-muted-foreground/60 transition-transform ${
            empty ? "opacity-0" : ""
          } ${open ? "rotate-90" : ""}`}
        />
        <KeyLabel name={keyName} note={node.validity.note} warn={warn} />
        <Colon />
        {node.type && <TypePill type={node.type} />}
        <span className="font-mono text-[10.5px] text-muted-foreground/60">
          {objectBracketLabel(empty, open)}
        </span>
      </button>
      {!empty && open && (
        <>
          <div className="ml-[5px] border-border/50 border-l pl-3">
            {node.children.map((child) => (
              <TreeNode key={child.path} node={child} />
            ))}
          </div>
          <div className="pl-4 font-mono text-[10.5px] text-muted-foreground/60">
            {"}"}
          </div>
        </>
      )}
      <HoverCopy label="Copy subtree" payload={stringifyNode(node)} />
    </div>
  );
};

function TreeNode({ node }: NodeProps) {
  if (node.kind === "primitive") {
    return <PrimitiveRow node={node} />;
  }
  if (node.kind === "array") {
    return <ArrayRow node={node} />;
  }
  return <ObjectRow node={node} />;
}

type RichResultsTone = "ok" | "error" | "warn";

interface RichResultsSummary {
  readonly glyph: string;
  readonly message: string;
  readonly tone: RichResultsTone;
}

const formatPaths = (errors: RichResultsReport["requiredErrors"]): string =>
  errors.map((e) => e.path || "/").join(", ");

const summarize = (report: RichResultsReport): RichResultsSummary => {
  if (report.requiredErrors.length > 0) {
    return {
      tone: "error",
      glyph: "✕",
      message: `missing: ${formatPaths(report.requiredErrors)}`,
    };
  }
  if (report.recommendedErrors.length > 0) {
    return {
      tone: "warn",
      glyph: "⚠",
      message: `recommended missing: ${formatPaths(report.recommendedErrors)}`,
    };
  }
  return {
    tone: "ok",
    glyph: "✓",
    message: "all required fields present",
  };
};

const TONE_CLASSES: Record<RichResultsTone, string> = {
  ok: "border-primary/20 bg-primary/5 text-primary",
  error: "border-destructive/30 bg-destructive/[0.06] text-destructive",
  warn: "border-amber-500/30 bg-amber-500/[0.06] text-amber-600 dark:text-amber-400",
};

interface RichResultsBarProps {
  readonly onToggleSuggestions: () => void;
  readonly report: RichResultsReport;
  readonly showSuggestions: boolean;
}

const RichResultsBar = ({
  report,
  showSuggestions,
  onToggleSuggestions,
}: RichResultsBarProps) => {
  const summary = summarize(report);
  const suggestionCount = report.suggestions.length;
  return (
    <div
      className={`flex items-center gap-2 border-b px-3 py-1.5 font-mono text-[10px] ${TONE_CLASSES[summary.tone]}`}
    >
      <span aria-hidden className="shrink-0 text-[11px] leading-none">
        {summary.glyph}
      </span>
      <span className="shrink-0 font-semibold uppercase tracking-wider">
        SEO fields
      </span>
      <span aria-hidden className="shrink-0 opacity-40">
        ·
      </span>
      <span className="min-w-0 flex-1 truncate" title={summary.message}>
        <span className="opacity-80">{report.spec}</span>
        <span aria-hidden className="opacity-40">
          {" "}
          —{" "}
        </span>
        {summary.message}
      </span>
      {suggestionCount > 0 && (
        <button
          aria-pressed={showSuggestions}
          className="shrink-0 underline decoration-dotted underline-offset-2 opacity-70 transition-opacity hover:opacity-100"
          onClick={onToggleSuggestions}
          type="button"
        >
          {showSuggestions
            ? "hide suggestions"
            : `+ ${suggestionCount} suggestion${suggestionCount === 1 ? "" : "s"}`}
        </button>
      )}
      <a
        className="shrink-0 underline decoration-dotted underline-offset-2 opacity-70 transition-opacity hover:opacity-100"
        href={report.docUrl}
        rel="noreferrer"
        target="_blank"
      >
        docs
      </a>
    </div>
  );
};

interface SpecNoticeProps {
  readonly kind: "deprecated" | "restricted";
  readonly reason: string;
  readonly since: string;
}

const NOTICE_LABEL: Record<SpecNoticeProps["kind"], string> = {
  deprecated: "rich result removed",
  restricted: "rich result restricted",
};

const SpecNotice = ({ kind, reason, since }: SpecNoticeProps) => (
  <div className="border-muted-foreground/20 border-b bg-muted/40 px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
    <span className="font-semibold uppercase tracking-wider">
      {NOTICE_LABEL[kind]}
    </span>
    <span aria-hidden className="opacity-40">
      {" "}
      · since {since} —{" "}
    </span>
    <span className="opacity-90">{reason}</span>
  </div>
);

const SUGGESTION_TONE: Record<FieldSuggestion["severity"], string> = {
  required: "text-destructive/80",
  recommended: "text-amber-600 dark:text-amber-400",
};

const SUGGESTION_DOT: Record<FieldSuggestion["severity"], string> = {
  required: "bg-destructive/70",
  recommended: "bg-amber-500/80",
};

const SuggestionRow = ({
  suggestion,
}: {
  readonly suggestion: FieldSuggestion;
}) => (
  <div className="group/row relative flex min-h-[18px] items-center gap-1.5 py-px pr-8">
    <Plus
      aria-hidden
      className="size-3 shrink-0 text-muted-foreground/50"
      strokeWidth={2.5}
    />
    <span
      aria-hidden
      className={`size-1.5 shrink-0 rounded-full ${SUGGESTION_DOT[suggestion.severity]}`}
    />
    <span
      className={`shrink-0 font-mono text-[10.5px] italic underline decoration-dotted underline-offset-2 ${SUGGESTION_TONE[suggestion.severity]}`}
      title={`${suggestion.severity} · not present in this block`}
    >
      {suggestion.name}
    </span>
    <span className="font-mono text-[10.5px] text-muted-foreground/50">
      {suggestion.severity === "required" ? "required" : "recommended"}
    </span>
    <HoverCopy
      label={`Copy ${suggestion.name} stub`}
      payload={`"${suggestion.name}": ""`}
    />
  </div>
);

const SuggestionList = ({
  suggestions,
}: {
  readonly suggestions: readonly FieldSuggestion[];
}) => {
  if (suggestions.length === 0) {
    return null;
  }
  return (
    <div className="mt-1 border-border/50 border-l pl-3">
      <div className="pb-1 font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider">
        could add
      </div>
      {suggestions.map((s) => (
        <SuggestionRow key={s.name} suggestion={s} />
      ))}
    </div>
  );
};

interface RootBodyProps {
  readonly root: JsonLdNode;
}

/**
 * Render the block body as `{` + children + `}` without duplicating the
 * root-level `@type` pill, which is already shown in the block header.
 */
const RootBody = ({ root }: RootBodyProps) => {
  if (root.kind !== "object") {
    return <TreeNode node={root} />;
  }
  if (root.children.length === 0) {
    return (
      <div className="font-mono text-[10.5px] text-muted-foreground/60">
        {"{ }"}
      </div>
    );
  }
  return (
    <>
      <div className="font-mono text-[10.5px] text-muted-foreground/60">
        {"{"}
      </div>
      <div className="ml-[5px] border-border/50 border-l pl-3">
        {root.children.map((child) => (
          <TreeNode key={child.path} node={child} />
        ))}
      </div>
      <div className="font-mono text-[10.5px] text-muted-foreground/60">
        {"}"}
      </div>
    </>
  );
};

const BlockCard = ({ block }: { readonly block: JsonLdBlock }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestions = block.richResults?.suggestions ?? [];
  return (
    <li
      className={`overflow-hidden rounded-md border bg-card ${
        block.typeValid
          ? "border-border"
          : "border-destructive/50 ring-1 ring-destructive/20"
      }`}
    >
      <div className="flex items-center gap-2 border-border/60 border-b px-3 py-2">
        <span
          className={`font-mono text-[9px] uppercase tracking-wider ${
            block.typeValid ? "text-primary" : "text-destructive"
          }`}
        >
          {block.typeValid ? "schema.org ✓" : "schema.org ✕"}
        </span>
        <span
          className={`font-display text-[12px] ${
            block.typeValid ? "text-foreground" : "text-destructive"
          }`}
        >
          {block.type}
        </span>
        {block.typeSuggestion && (
          <span className="ml-auto font-mono text-[9px] text-destructive/90 italic">
            Did you mean {block.typeSuggestion}?
          </span>
        )}
      </div>
      {block.richResults && (
        <RichResultsBar
          onToggleSuggestions={() => setShowSuggestions((v) => !v)}
          report={block.richResults}
          showSuggestions={showSuggestions}
        />
      )}
      {block.richResults?.deprecated && (
        <SpecNotice
          kind="deprecated"
          reason={block.richResults.deprecated.reason}
          since={block.richResults.deprecated.since}
        />
      )}
      {block.richResults?.restricted && (
        <SpecNotice
          kind="restricted"
          reason={block.richResults.restricted.reason}
          since={block.richResults.restricted.since}
        />
      )}
      <div className="px-3 py-2">
        <RootBody root={block.root} />
        {showSuggestions && <SuggestionList suggestions={suggestions} />}
      </div>
    </li>
  );
};

export function JsonLdTree({ blocks }: JsonLdTreeProps) {
  if (blocks.length === 0) {
    return null;
  }
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {blocks.map((block) => (
        <BlockCard block={block} key={block.id} />
      ))}
    </ul>
  );
}
