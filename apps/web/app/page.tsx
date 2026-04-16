// import { CopyForAi } from "./_components/copy-for-ai";
import { Coverage } from "./_components/coverage";
import { Cta } from "./_components/cta";
import { Features } from "./_components/features";
import { Footer } from "./_components/footer";
import { Hero } from "./_components/hero";
import { HowItWorks } from "./_components/how-it-works";
import { Nav } from "./_components/nav";

export default function Page() {
  return (
    <div className="dark min-h-svh bg-[#0a0a0a] text-neutral-100">
      {/* subtle grain overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-1 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />

      <Nav />
      <main className="relative z-0">
        <Hero />
        <Features />
        <HowItWorks />
        <Coverage />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
