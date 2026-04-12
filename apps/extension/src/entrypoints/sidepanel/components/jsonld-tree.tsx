import type {
  JsonLdArrayNode,
  JsonLdBlock,
  JsonLdNode,
  JsonLdObjectNode,
  JsonLdPrimitiveNode,
} from "@workspace/seo-rules";
import { ChevronRight } from "lucide-react";
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

export function JsonLdTree({ blocks }: JsonLdTreeProps) {
  if (blocks.length === 0) {
    return null;
  }
  return (
    <ul className="mt-3 flex flex-col gap-2">
      {blocks.map((block) => (
        <li
          className={`overflow-hidden rounded-md border bg-card ${
            block.typeValid
              ? "border-border"
              : "border-destructive/50 ring-1 ring-destructive/20"
          }`}
          key={block.id}
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
          <div className="px-3 py-2">
            <RootBody root={block.root} />
          </div>
        </li>
      ))}
    </ul>
  );
}
