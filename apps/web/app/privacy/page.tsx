import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Footer } from "../_components/footer";
import { Nav } from "../_components/nav";

export const metadata: Metadata = {
  title: "Privacy Policy — SEO Lens",
  description:
    "SEO Lens runs entirely in your browser. No analytics, no tracking, no accounts.",
  alternates: { canonical: "/privacy" },
};

const LAST_UPDATED = "April 16, 2026";

export default function PrivacyPage() {
  return (
    <div className="dark min-h-svh bg-[#0a0a0a] text-neutral-100">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-1 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      <Nav />
      <main className="relative z-0 pt-28 pb-24">
        <article className="mx-auto max-w-[760px] px-6">
          <div className="font-mono text-[#47d1cd]/80 text-[10px] uppercase tracking-[0.3em]">
            Legal · Privacy
          </div>
          <h1
            className="mt-4 font-semibold text-4xl text-neutral-100 tracking-[-0.02em] md:text-5xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Privacy Policy
          </h1>
          <p className="mt-3 font-mono text-[11px] text-neutral-500 uppercase tracking-[0.2em]">
            Last updated · {LAST_UPDATED}
          </p>

          <div
            className="mt-12 space-y-10 text-[15px] text-neutral-300 leading-[1.7]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            <Section title="Summary">
              <p>
                SEO Lens is a browser extension that audits the SEO metadata of
                the webpage you are viewing. It runs entirely in your browser.
                There are no analytics, no trackers, no accounts, and no
                third-party services involved in normal operation.
              </p>
            </Section>

            <Section title="What the extension does">
              <p>
                When you open the side panel, SEO Lens fetches the HTML of the
                currently focused tab&rsquo;s URL and parses it locally to
                compute the audit. The only network request the extension issues
                is this fetch of the page you asked it to audit. Audit results,
                findings, and any copied text are produced and kept on your
                machine.
              </p>
            </Section>

            <Section title="Data we collect">
              <p>
                We do not collect personal information, browsing history,
                website content, credentials, location, or financial data. Audit
                output is not stored on any server and is not transmitted
                anywhere.
              </p>
              <p>
                The only exception is the optional feedback form: if you choose
                to send feedback, your message (and email address, if you
                provide one) is forwarded to the developer so we can respond.
                Nothing else leaves your machine.
              </p>
            </Section>

            <Section title="Permissions">
              <ul className="space-y-3 pl-5" style={{ listStyle: "disc" }}>
                <li>
                  <strong className="font-medium text-neutral-100">
                    activeTab
                  </strong>{" "}
                  — read the URL of the focused tab so it can be audited.
                </li>
                <li>
                  <strong className="font-medium text-neutral-100">
                    sidePanel
                  </strong>{" "}
                  — render the extension UI in Chrome&rsquo;s side panel.
                </li>
                <li>
                  <strong className="font-medium text-neutral-100">tabs</strong>{" "}
                  — detect tab switches to re-run the audit on the new page.
                </li>
                <li>
                  <strong className="font-medium text-neutral-100">
                    webNavigation
                  </strong>{" "}
                  — detect full page loads and SPA navigations so audits stay in
                  sync with the page content.
                </li>
                <li>
                  <strong className="font-medium text-neutral-100">
                    host permission &lt;all_urls&gt;
                  </strong>{" "}
                  — fetch the HTML of whichever page you are currently viewing.
                  You control which page is audited by choosing which tab is
                  active.
                </li>
              </ul>
            </Section>

            <Section title="Remote code">
              <p>
                SEO Lens ships all JavaScript bundled at build time. It does not
                use{" "}
                <code className="rounded bg-neutral-900 px-1 py-0.5 font-mono text-[#47d1cd]/90 text-[13px]">
                  eval
                </code>
                , does not inject remote scripts, and does not load code from a
                CDN at runtime.
              </p>
            </Section>

            <Section title="Third parties">
              <p>
                We do not sell or transfer user data to third parties. We do not
                use user data for creditworthiness or lending. We do not use
                user data for any purpose unrelated to the extension&rsquo;s
                single purpose of auditing SEO metadata.
              </p>
            </Section>

            <Section title="Open source">
              <p>
                SEO Lens is MIT-licensed. Source is available at{" "}
                <a
                  className="text-[#47d1cd] underline underline-offset-4 transition hover:text-[#47d1cd]/80"
                  href="https://github.com/Mark-Life/seo-lens"
                >
                  github.com/Mark-Life/seo-lens
                </a>
                .
              </p>
            </Section>

            <Section title="Contact">
              <p>
                Questions about this policy or the extension&rsquo;s behavior:{" "}
                <a
                  className="text-[#47d1cd] underline underline-offset-4 transition hover:text-[#47d1cd]/80"
                  href="mailto:CWS@mark-life.com"
                >
                  CWS@mark-life.com
                </a>
                .
              </p>
            </Section>

            <Section title="Changes">
              <p>
                If this policy changes, the &ldquo;Last updated&rdquo; date
                above will change with it. Material changes will also be noted
                in the extension&rsquo;s release notes.
              </p>
            </Section>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-mono text-[#47d1cd]/80 text-[11px] uppercase tracking-[0.28em]">
        {title}
      </h2>
      <div className="space-y-4 text-neutral-300">{children}</div>
    </section>
  );
}
