interface LogoProps {
  className?: string;
  size?: number;
}

/** SEO Lens brand mark — magnifying glass with code brackets. */
export function Logo({ className, size = 32 }: LogoProps) {
  return (
    <svg
      aria-label="SEO Lens"
      className={className}
      fill="none"
      height={size}
      role="img"
      viewBox="0 0 128 128"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#0a0a0a" height="128" rx="24" width="128" />
      <g>
        <circle
          cx="56"
          cy="52"
          fill="none"
          r="44"
          stroke="#47d1cd"
          strokeWidth="9"
        />
        <line
          stroke="#47d1cd"
          strokeLinecap="round"
          strokeWidth="11"
          x1="91"
          x2="138"
          y1="87"
          y2="134"
        />
        <path
          d="M38 40 L24 52 L38 64"
          fill="none"
          stroke="#47d1cd"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="6"
        />
        <path
          d="M74 40 L88 52 L74 64"
          fill="none"
          stroke="#47d1cd"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="6"
        />
        <line
          stroke="#47d1cd"
          strokeLinecap="round"
          strokeWidth="5"
          x1="62"
          x2="50"
          y1="34"
          y2="70"
        />
      </g>
    </svg>
  );
}

/** Inline SEO Lens wordmark: icon + text. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <Logo size={28} />
      <span className="font-semibold text-[15px] tracking-[-0.01em]">
        SEO Lens
      </span>
    </div>
  );
}
