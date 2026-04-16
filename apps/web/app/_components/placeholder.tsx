interface PlaceholderProps {
  aspect?: string;
  className?: string;
  description: string;
  dimensions?: string;
  label: string;
  variant?: "default" | "device" | "minimal";
}

/**
 * Screenshot placeholder. Displays a visible label + description of what
 * should be captured, so the user can fill in actual screenshots later.
 */
export function Placeholder({
  label,
  description,
  aspect = "16/10",
  dimensions,
  className,
  variant = "default",
}: PlaceholderProps) {
  const bgPattern =
    "bg-[linear-gradient(to_right,rgba(71,209,205,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(71,209,205,0.08)_1px,transparent_1px)] bg-[size:32px_32px]";

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border border-[color:rgba(71,209,205,0.18)] bg-[#0c0c0c] ${className ?? ""}`}
      style={{ aspectRatio: aspect }}
    >
      <div className={`absolute inset-0 ${bgPattern}`} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(71,209,205,0.06),transparent_70%)]" />

      <div className="absolute top-3 left-4 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#47d1cd]/40" />
        <span className="h-2 w-2 rounded-full bg-[#47d1cd]/20" />
        <span className="h-2 w-2 rounded-full bg-[#47d1cd]/10" />
      </div>

      <div className="absolute top-3 right-4 flex items-center gap-2 font-mono text-[#47d1cd]/60 text-[10px] uppercase tracking-[0.18em]">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#47d1cd]/80" />
        screenshot.placeholder
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
        <div className="font-mono text-[#47d1cd] text-[10px] uppercase tracking-[0.3em]">
          [{label}]
        </div>
        <div
          className="mt-3 max-w-[48ch] text-[17px] text-neutral-200 leading-[1.35]"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {description}
        </div>
        {dimensions ? (
          <div className="mt-4 font-mono text-[10px] text-neutral-500 tracking-wider">
            {dimensions}
          </div>
        ) : null}
      </div>

      {variant === "device" ? (
        <div className="absolute right-0 bottom-0 left-0 h-10 border-[color:rgba(71,209,205,0.08)] border-t bg-[#080808]/80" />
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#47d1cd]/50 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#47d1cd]/20 to-transparent" />
    </div>
  );
}
