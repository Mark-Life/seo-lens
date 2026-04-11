interface ScoreDisplayProps {
  score: number;
  url: string;
}

const GOOD_THRESHOLD = 80;
const FAIR_THRESHOLD = 50;

function getScoreColor(score: number): string {
  if (score >= GOOD_THRESHOLD) {
    return "text-green-600";
  }
  if (score >= FAIR_THRESHOLD) {
    return "text-yellow-600";
  }
  return "text-red-600";
}

export function ScoreDisplay({ score, url }: ScoreDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border bg-card p-4">
      <span className={`font-bold text-4xl ${getScoreColor(score)}`}>
        {score}
      </span>
      <span className="text-muted-foreground text-sm">SEO Score</span>
      <span className="max-w-full truncate text-muted-foreground text-xs">
        {url}
      </span>
    </div>
  );
}
