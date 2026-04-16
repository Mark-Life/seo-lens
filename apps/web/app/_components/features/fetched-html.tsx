import type { ReactNode } from "react";

export function FetchedHtmlDemo() {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-neutral-800 bg-[#0a0a0a] shadow-2xl shadow-black/40"
      style={{ aspectRatio: "16/10" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(71,209,205,0.06),transparent_70%)]"
      />

      <div className="grid h-full grid-cols-[1.15fr_1fr]">
        <SourcePane />
        <RenderedPane />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#47d1cd]/25 to-transparent" />
    </div>
  );
}

function SourcePane() {
  return (
    <div className="relative flex min-w-0 flex-col border-neutral-900 border-r bg-[#0a0a0a]">
      <PaneHeader>
        <span className="text-[#47d1cd]">GET</span>
        <span className="truncate text-neutral-400">
          devblog.com/react-2026
        </span>
        <span className="ml-auto text-neutral-600">200 · text/html</span>
      </PaneHeader>

      <div className="relative flex-1 overflow-hidden">
        <pre className="h-full overflow-hidden px-2.5 py-3 font-mono text-[10px] leading-[1.55] md:text-[11px]">
          {CODE_LINES.map((line, i) => (
            <CodeLine
              highlight={line.highlight}
              // biome-ignore lint/suspicious/noArrayIndexKey: static list
              key={i}
              lineNo={i + 1}
            >
              {line.children}
            </CodeLine>
          ))}
        </pre>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-t from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent" />
      </div>

      <PaneFooter>
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#47d1cd]" />
        what Google reads
      </PaneFooter>
    </div>
  );
}

function RenderedPane() {
  return (
    <div className="relative flex min-w-0 flex-col bg-[#0c0c0c]">
      <PaneHeader>
        <span className="inline-flex items-center gap-1 text-neutral-500">
          <span className="inline-block size-2 rounded-full bg-neutral-700" />
          <span className="inline-block size-2 rounded-full bg-neutral-700" />
          <span className="inline-block size-2 rounded-full bg-neutral-700" />
        </span>
        <span className="ml-1 truncate rounded-sm bg-neutral-900 px-2 py-0.5 text-[10px] text-neutral-500">
          devblog.com/react-2026
        </span>
      </PaneHeader>

      <div className="relative flex-1 overflow-hidden px-5 py-5">
        <div className="max-w-[32ch] font-mono text-[9px] text-neutral-600 uppercase tracking-[0.18em]">
          devblog · engineering
        </div>
        <h4
          className="mt-2 font-medium text-[17px] text-neutral-100 leading-[1.15] tracking-[-0.02em] md:text-[19px]"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Build a React app in 2026
        </h4>
        <div className="mt-3 space-y-1.5">
          <div className="h-1.5 w-[88%] rounded-sm bg-neutral-800/80" />
          <div className="h-1.5 w-[72%] rounded-sm bg-neutral-800/80" />
          <div className="h-1.5 w-[80%] rounded-sm bg-neutral-800/60" />
          <div className="h-1.5 w-[58%] rounded-sm bg-neutral-800/60" />
        </div>
        <div className="mt-4 h-px bg-neutral-900" />
        <div className="mt-4 space-y-1.5">
          <div className="h-1.5 w-[82%] rounded-sm bg-neutral-800/50" />
          <div className="h-1.5 w-[66%] rounded-sm bg-neutral-800/50" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-[#0c0c0c] to-transparent" />
      </div>

      <PaneFooter>
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutral-600" />
        what users see
      </PaneFooter>
    </div>
  );
}

function PaneHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-neutral-900 border-b bg-[#080808]/80 px-3 py-2 font-mono text-[9px] text-neutral-500 uppercase tracking-[0.14em] md:text-[10px]">
      {children}
    </div>
  );
}

function PaneFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 border-neutral-900 border-t bg-[#080808]/80 px-3 py-2 font-mono text-[9px] text-neutral-500 uppercase tracking-[0.18em]">
      {children}
    </div>
  );
}

function CodeLine({
  children,
  highlight,
  lineNo,
}: {
  children: ReactNode;
  highlight?: boolean;
  lineNo: number;
}) {
  return (
    <div
      className={`relative flex gap-3 ${highlight ? "bg-[#47d1cd]/4.5" : ""}`}
    >
      {highlight ? (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-[2px] bg-[#47d1cd]/60"
        />
      ) : null}
      <span className="w-5 select-none text-right text-neutral-700 tabular-nums">
        {lineNo}
      </span>
      <span
        className={`min-w-0 whitespace-pre ${
          highlight ? "text-neutral-200" : "text-neutral-500"
        }`}
      >
        {children}
      </span>
    </div>
  );
}

const Tag = ({ children }: { children: ReactNode }) => (
  <span className="text-[#47d1cd]">{children}</span>
);
const Attr = ({ children }: { children: ReactNode }) => (
  <span className="text-[#e5c07b]">{children}</span>
);
const Str = ({ children }: { children: ReactNode }) => (
  <span className="text-[#98c379]">{children}</span>
);
const Punct = ({ children }: { children: ReactNode }) => (
  <span className="text-neutral-600">{children}</span>
);

interface Line {
  children: ReactNode;
  highlight?: boolean;
}

const CODE_LINES: Line[] = [
  {
    children: (
      <>
        <Punct>{"<!"}</Punct>
        <Tag>DOCTYPE</Tag>
        <Attr> html</Attr>
        <Punct>{">"}</Punct>
      </>
    ),
  },
  {
    children: (
      <>
        <Punct>{"<"}</Punct>
        <Tag>html</Tag>
        <Attr> lang</Attr>
        <Punct>=</Punct>
        <Str>"en"</Str>
        <Punct>{">"}</Punct>
      </>
    ),
  },
  {
    children: (
      <>
        <Punct>{"<"}</Punct>
        <Tag>head</Tag>
        <Punct>{">"}</Punct>
      </>
    ),
  },
  {
    highlight: true,
    children: (
      <>
        {"  "}
        <Punct>{"<"}</Punct>
        <Tag>title</Tag>
        <Punct>{">"}</Punct>
        Build a React app in 2026
        <Punct>{"</"}</Punct>
        <Tag>title</Tag>
        <Punct>{">"}</Punct>
      </>
    ),
  },
  {
    highlight: true,
    children: (
      <>
        {"  "}
        <Punct>{"<"}</Punct>
        <Tag>meta</Tag>
        <Attr> name</Attr>
        <Punct>=</Punct>
        <Str>"description"</Str>
        <Attr> content</Attr>
        <Punct>=</Punct>
        <Str>"A practical guide…"</Str>
        <Punct>{" />"}</Punct>
      </>
    ),
  },
  {
    highlight: true,
    children: (
      <>
        {"  "}
        <Punct>{"<"}</Punct>
        <Tag>link</Tag>
        <Attr> rel</Attr>
        <Punct>=</Punct>
        <Str>"canonical"</Str>
        <Attr> href</Attr>
        <Punct>=</Punct>
        <Str>"/react-2026"</Str>
        <Punct>{" />"}</Punct>
      </>
    ),
  },
  {
    highlight: true,
    children: (
      <>
        {"  "}
        <Punct>{"<"}</Punct>
        <Tag>meta</Tag>
        <Attr> property</Attr>
        <Punct>=</Punct>
        <Str>"og:image"</Str>
        <Attr> content</Attr>
        <Punct>=</Punct>
        <Str>"/og.png"</Str>
        <Punct>{" />"}</Punct>
      </>
    ),
  },
  {
    highlight: true,
    children: (
      <>
        {"  "}
        <Punct>{"<"}</Punct>
        <Tag>script</Tag>
        <Attr> type</Attr>
        <Punct>=</Punct>
        <Str>"application/ld+json"</Str>
        <Punct>{">"}</Punct>
      </>
    ),
  },
  {
    highlight: true,
    children: (
      <>
        {"    "}
        <Punct>{"{"}</Punct>
        <Str>"@type"</Str>
        <Punct>: </Punct>
        <Str>"Article"</Str>
        <Punct>, </Punct>
        <Str>"author"</Str>
        <Punct>: …</Punct>
      </>
    ),
  },
  {
    highlight: true,
    children: (
      <>
        {"  "}
        <Punct>{"</"}</Punct>
        <Tag>script</Tag>
        <Punct>{">"}</Punct>
      </>
    ),
  },
  {
    children: (
      <>
        <Punct>{"</"}</Punct>
        <Tag>head</Tag>
        <Punct>{">"}</Punct>
      </>
    ),
  },
  {
    children: (
      <>
        <Punct>{"<"}</Punct>
        <Tag>body</Tag>
        <Punct>{">"}</Punct>
      </>
    ),
  },
  {
    highlight: true,
    children: (
      <>
        {"  "}
        <Punct>{"<"}</Punct>
        <Tag>h1</Tag>
        <Punct>{">"}</Punct>
        Build a React app in 2026
        <Punct>{"</"}</Punct>
        <Tag>h1</Tag>
        <Punct>{">"}</Punct>
      </>
    ),
  },
  {
    children: (
      <>
        {"  "}
        <Punct>{"<"}</Punct>
        <Tag>p</Tag>
        <Punct>{">"}</Punct>
        React has evolved…
        <Punct>{"</"}</Punct>
        <Tag>p</Tag>
        <Punct>{">"}</Punct>
      </>
    ),
  },
];
