interface ScoreGaugeProps {
  score: number;
}

const SIZE = 168;
const STROKE = 10;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;
const ARC_FRACTION = 0.78;
const ARC_LEN = CIRC * ARC_FRACTION;
const ROTATION = 90 + (1 - ARC_FRACTION) * 180;

export function ScoreGauge({ score }: ScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const progress = (clamped / 100) * ARC_LEN;
  const offset = ARC_LEN - progress;

  return (
    <div
      className="relative mx-auto"
      style={{ width: SIZE, height: SIZE * 0.92 }}
    >
      <svg
        aria-label="SEO score gauge"
        className="overflow-visible"
        height={SIZE}
        role="img"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
      >
        <title>SEO score gauge</title>
        <defs>
          <linearGradient id="lens-arc" x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--primary)" />
          </linearGradient>
        </defs>
        <g transform={`rotate(${ROTATION} ${SIZE / 2} ${SIZE / 2})`}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            fill="none"
            r={RADIUS}
            stroke="var(--border)"
            strokeDasharray={`${ARC_LEN} ${CIRC}`}
            strokeLinecap="round"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            fill="none"
            r={RADIUS}
            stroke="url(#lens-arc)"
            strokeDasharray={`${ARC_LEN} ${CIRC}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            strokeWidth={STROKE}
            style={{
              transition: "stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)",
            }}
          />
        </g>
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-4">
        <div className="font-display font-light text-[64px] text-foreground tabular-nums leading-none tracking-tight">
          {clamped}
        </div>
        <div className="mt-1 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
          SEO Score
        </div>
      </div>
    </div>
  );
}
