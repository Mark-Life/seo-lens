export interface Tier {
  readonly label: string;
  readonly letter: string;
}

/** Map a 0-100 score to a letter grade and label. */
export function tierFor(score: number): Tier {
  if (score >= 90) {
    return { letter: "A", label: "Excellent" };
  }
  if (score >= 80) {
    return { letter: "B", label: "Solid" };
  }
  if (score >= 70) {
    return { letter: "C", label: "Mid" };
  }
  if (score >= 60) {
    return { letter: "D", label: "Bad" };
  }
  return { letter: "F", label: "Critical" };
}
