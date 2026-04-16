import { Copy } from "lucide-react";

const FINDING_TEXT = `[SEO LENS FINDING]
rule:     structured/article-missing-author
severity: warning
category: Structured Data
page:     https://example.com/blog/shipping-faster

context:
  <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "Shipping Faster"
      // missing: author, datePublished, image
    }
  </script>

grep: "@type": "Article"

recommendation:
  Add author (Person | Organization), datePublished
  (ISO-8601), and image. Required for Google Rich Results.`;

export function CopyForAi() {
  return (
    <section className="relative overflow-hidden border-neutral-900 border-t bg-[#070707] py-24 md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(71,209,205,0.08),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-[1280px] px-6">
        <div className="grid gap-12 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-5">
            <div className="font-mono text-[#47d1cd] text-[11px] uppercase tracking-[0.3em]">
              {"/// The pitch"}
            </div>
            <h2
              className="mt-5 font-medium text-[clamp(2.25rem,5vw,4rem)] text-neutral-50 leading-[0.98] tracking-[-0.035em]"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              <span>
                Every other SEO tool
                <br />
                ends where
              </span>
              <br />
              <span className="text-[#47d1cd]">your agent starts.</span>
            </h2>

            <p className="mt-8 max-w-[44ch] text-[15px] text-neutral-400 leading-[1.65]">
              Traditional audits give you a PDF. SEO Lens gives you a prompt.
              Each finding ships with rule id, severity, full context, and a
              grep field — the exact shape an AI coding agent needs to locate
              the bug and write the patch. No translation layer between tool and
              model.
            </p>

            <div className="mt-10 flex items-center gap-6 font-mono text-[11px] text-neutral-500 uppercase tracking-[0.18em]">
              <span>Claude Code</span>
              <span className="text-neutral-800">·</span>
              <span>Cursor</span>
              <span className="text-neutral-800">·</span>
              <span>Copilot</span>
              <span className="text-neutral-800">·</span>
              <span>Any LLM</span>
            </div>
          </div>

          <div className="md:col-span-7">
            <div className="relative rounded-xl border border-neutral-800 bg-[#0c0c0c] shadow-[0_0_80px_-20px_rgba(71,209,205,0.25)]">
              <div className="flex items-center justify-between border-neutral-900 border-b px-5 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
                  <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
                  <span className="h-2.5 w-2.5 rounded-full bg-neutral-700" />
                </div>
                <div className="font-mono text-[11px] text-neutral-500 tracking-wider">
                  finding.txt — 742 chars
                </div>
                <button
                  className="inline-flex items-center gap-2 rounded-md border border-[#47d1cd]/30 bg-[#47d1cd]/10 px-2.5 py-1 font-mono text-[#47d1cd] text-[10px] uppercase tracking-[0.14em] transition hover:bg-[#47d1cd]/20"
                  type="button"
                >
                  <Copy className="size-3" />
                  Copy
                </button>
              </div>
              <pre className="overflow-x-auto p-6 font-mono text-[12.5px] text-neutral-200 leading-[1.65]">
                <code>{colorize(FINDING_TEXT)}</code>
              </pre>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#47d1cd]/30 to-transparent" />
              <div className="font-mono text-[10px] text-neutral-500 uppercase tracking-[0.3em]">
                paste →
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#47d1cd]/30 to-transparent" />
            </div>

            <div className="mt-6 rounded-xl border border-neutral-900 bg-[#0c0c0c] p-5">
              <div className="font-mono text-[10px] text-neutral-500 uppercase tracking-[0.22em]">
                claude-code · auto-apply
              </div>
              <p className="mt-3 text-[14px] text-neutral-300 leading-relaxed">
                <span className="text-[#47d1cd]">›</span> Found the Article
                JSON-LD in{" "}
                <span className="text-neutral-100">
                  app/blog/[slug]/page.tsx
                </span>
                . Adding <span className="text-neutral-100">author</span>,{" "}
                <span className="text-neutral-100">datePublished</span>, and{" "}
                <span className="text-neutral-100">image</span> fields wired to
                frontmatter. Running the audit again in 3…
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const KEY_VALUE_RE = /^(\s*)([\w-]+):(.*)$/;

/**
 * Very light syntax-ish highlighting of the finding block for visual
 * rhythm — purely cosmetic, no real parser.
 */
function colorize(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const key = `l-${i}`;
    if (line.startsWith("[")) {
      return (
        <span className="text-[#47d1cd]" key={key}>
          {line}
          {"\n"}
        </span>
      );
    }
    if (line.startsWith("  <") || line.startsWith("    ")) {
      return (
        <span className="text-neutral-400" key={key}>
          {line}
          {"\n"}
        </span>
      );
    }
    const match = line.match(KEY_VALUE_RE);
    if (match) {
      const [, indent, k, rest] = match;
      return (
        <span key={key}>
          {indent}
          <span className="text-[#47d1cd]/80">{k}</span>
          <span className="text-neutral-500">:</span>
          <span className="text-neutral-100">{rest}</span>
          {"\n"}
        </span>
      );
    }
    return (
      <span className="text-neutral-400" key={key}>
        {line}
        {"\n"}
      </span>
    );
  });
}
