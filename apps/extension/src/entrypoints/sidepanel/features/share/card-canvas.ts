import { tierFor } from "@workspace/panel-ui/lib/tier";
import type { AuditResult, Category } from "@workspace/seo-rules/shapes";

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
export const PIXEL_RATIO = 2;

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, system-ui, sans-serif';

const BG = "#0b0b0c";
const FG = "#f5f5f4";
const MUTED = "#a8a29e";
const BORDER = "#27272a";
const ACCENT = "#10b981";
const ERROR = "#ef4444";
const WARN = "#f59e0b";
const INFO = "#60a5fa";

const PAD = 64;

const CATEGORY_LABELS: Record<Category, string> = {
  meta: "Meta tags",
  headings: "Headings",
  social: "Social",
  structured: "Structured data",
  images: "Images",
  indexing: "Indexing",
  site: "Site-wide",
};

const barTone = (score: number) => {
  if (score >= 80) {
    return ACCENT;
  }
  if (score >= 55) {
    return WARN;
  }
  return ERROR;
};

interface TextOpts {
  readonly align?: CanvasTextAlign;
  readonly baseline?: CanvasTextBaseline;
  readonly color: string;
  readonly size: number;
  readonly spacing?: number;
  readonly weight?: 400 | 600;
}

const applyFont = (ctx: CanvasRenderingContext2D, opts: TextOpts): void => {
  ctx.font = `${opts.weight ?? 400} ${opts.size}px ${FONT_STACK}`;
  ctx.fillStyle = opts.color;
  ctx.textBaseline = opts.baseline ?? "top";
  ctx.textAlign = opts.align ?? "left";
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
    opts.spacing ? `${opts.spacing}px` : "0px";
};

const drawText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: TextOpts
): number => {
  applyFont(ctx, opts);
  ctx.fillText(text, x, y);
  const w = ctx.measureText(text).width;
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
    "0px";
  return w;
};

const measureText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  opts: TextOpts
): number => {
  applyFont(ctx, opts);
  const w = ctx.measureText(text).width;
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
    "0px";
  return w;
};

const truncateToWidth = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  opts: TextOpts
): string => {
  if (measureText(ctx, text, opts) <= maxWidth) {
    return text;
  }
  const ellipsis = "…";
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    const candidate = text.slice(0, mid) + ellipsis;
    if (measureText(ctx, candidate, opts) <= maxWidth) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return text.slice(0, lo) + ellipsis;
};

const roundRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
};

const fillRoundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string
): void => {
  ctx.fillStyle = color;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
};

interface DrawCardInput {
  readonly ctx: CanvasRenderingContext2D;
  readonly faviconImage: HTMLImageElement | null;
  readonly host: string;
  readonly path: string;
  readonly result: AuditResult;
}

/**
 * Draw the full share card to a pre-sized, pre-scaled 2D canvas context.
 * Uses logical 1200×630 coordinates; the caller is responsible for the
 * pixel-ratio scale transform.
 */
export const drawCard = ({
  ctx,
  result,
  host,
  path,
  faviconImage,
}: DrawCardInput): void => {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // ---- Header row ----
  const headerY = PAD;
  const faviconSize = 56;
  const faviconX = PAD;
  if (faviconImage) {
    ctx.save();
    roundRectPath(ctx, faviconX, headerY, faviconSize, faviconSize, 12);
    ctx.clip();
    ctx.drawImage(faviconImage, faviconX, headerY, faviconSize, faviconSize);
    ctx.restore();
  } else {
    fillRoundRect(ctx, faviconX, headerY, faviconSize, faviconSize, 12, ACCENT);
    const monogram = host.charAt(0).toUpperCase() || "?";
    applyFont(ctx, {
      size: 32,
      weight: 600,
      color: BG,
      baseline: "middle",
      align: "center",
    });
    ctx.fillText(
      monogram,
      faviconX + faviconSize / 2,
      headerY + faviconSize / 2
    );
  }

  const textX = faviconX + faviconSize + 20;
  const hostMaxWidth = CARD_WIDTH - PAD - textX;
  const hostOpts: TextOpts = { size: 32, weight: 600, color: FG };
  const hostText = truncateToWidth(ctx, host, hostMaxWidth, hostOpts);
  drawText(ctx, hostText, textX, headerY, hostOpts);
  if (path) {
    const pathOpts: TextOpts = { size: 20, weight: 400, color: MUTED };
    const pathText = truncateToWidth(ctx, path, hostMaxWidth, pathOpts);
    drawText(ctx, pathText, textX, headerY + 32 + 4, pathOpts);
  }

  // ---- Footer row (compute first so main can flex between header & footer) ----
  const footerHeight = 60;
  const footerTop = CARD_HEIGHT - PAD - footerHeight;
  const footerBorderY = footerTop;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, footerBorderY);
  ctx.lineTo(CARD_WIDTH - PAD, footerBorderY);
  ctx.stroke();

  const chipY = footerBorderY + 28;
  const chipCenterY = chipY + 11;
  const chipGap = 28;
  const chips: readonly { color: string; count: number; label: string }[] = [
    { color: ERROR, count: result.counts.error, label: "errors" },
    { color: WARN, count: result.counts.warning, label: "warnings" },
    { color: INFO, count: result.counts.info, label: "info" },
    { color: ACCENT, count: result.counts.pass, label: "passed" },
  ];

  let chipX = PAD;
  const countOpts: TextOpts = {
    size: 22,
    weight: 600,
    color: FG,
    baseline: "middle",
  };
  const labelOpts: TextOpts = {
    size: 22,
    weight: 400,
    color: MUTED,
    baseline: "middle",
  };
  for (const chip of chips) {
    ctx.fillStyle = chip.color;
    ctx.beginPath();
    ctx.arc(chipX + 6, chipCenterY, 6, 0, Math.PI * 2);
    ctx.fill();
    const countText = `${chip.count}`;
    const countW = drawText(
      ctx,
      countText,
      chipX + 12 + 8,
      chipCenterY,
      countOpts
    );
    const labelX = chipX + 12 + 8 + countW + 6;
    const labelW = drawText(ctx, chip.label, labelX, chipCenterY, labelOpts);
    chipX = labelX + labelW + chipGap;
  }

  const brandOpts: TextOpts = {
    size: 22,
    weight: 600,
    color: FG,
    spacing: 1,
    baseline: "middle",
    align: "right",
  };
  applyFont(ctx, brandOpts);
  ctx.fillText("seo-lens.dev", CARD_WIDTH - PAD, chipCenterY);
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
    "0px";

  // ---- Main block ----
  const mainTop = headerY + faviconSize + 44;
  const mainBottom = footerBorderY - 36;
  const mainCenterY = (mainTop + mainBottom) / 2;

  // Score block (centered column of width 280 starting at x = PAD)
  const scoreColX = PAD;
  const scoreColW = 280;
  const scoreColCenter = scoreColX + scoreColW / 2;

  const labelOptsScore: TextOpts = {
    size: 28,
    weight: 400,
    color: MUTED,
    spacing: 3,
    align: "center",
  };
  const scoreNumOpts: TextOpts = { size: 200, weight: 600, color: FG };
  const scoreSlashOpts: TextOpts = { size: 32, weight: 400, color: MUTED };

  const scoreNumText = `${result.score}`;
  const scoreNumWidth = measureText(ctx, scoreNumText, scoreNumOpts);
  const slashText = "/100";
  const slashWidth = measureText(ctx, slashText, scoreSlashOpts);
  const scoreRowWidth = scoreNumWidth + 8 + slashWidth;

  const blockHeight = 28 + 4 + 200 + 12 + 40;
  const blockTop = mainCenterY - blockHeight / 2;

  drawText(ctx, "SEO SCORE", scoreColCenter, blockTop, labelOptsScore);

  const scoreRowTop = blockTop + 28 + 4;
  const scoreRowLeft = scoreColCenter - scoreRowWidth / 2;
  drawText(ctx, scoreNumText, scoreRowLeft, scoreRowTop, scoreNumOpts);
  // Baseline-align "/100" with the bottom of the big number.
  const slashBaselineY = scoreRowTop + 200;
  applyFont(ctx, { ...scoreSlashOpts, baseline: "alphabetic" });
  ctx.fillText(slashText, scoreRowLeft + scoreNumWidth + 8, slashBaselineY);

  // Tier row
  const tier = tierFor(result.score);
  const tierLabel = tier.label.toUpperCase();
  const tierBoxSize = 40;
  const tierBoxTop = scoreRowTop + 200 + 12;
  const tierLetterOpts: TextOpts = {
    size: 22,
    weight: 600,
    color: FG,
    baseline: "middle",
    align: "center",
  };
  const tierLabelOpts: TextOpts = {
    size: 22,
    weight: 400,
    color: MUTED,
    spacing: 2,
    baseline: "middle",
  };
  const tierLabelW = measureText(ctx, tierLabel, tierLabelOpts);
  const tierRowW = tierBoxSize + 12 + tierLabelW;
  const tierRowLeft = scoreColCenter - tierRowW / 2;

  ctx.strokeStyle = FG;
  ctx.lineWidth = 2;
  roundRectPath(ctx, tierRowLeft, tierBoxTop, tierBoxSize, tierBoxSize, 6);
  ctx.stroke();
  applyFont(ctx, tierLetterOpts);
  ctx.fillText(
    tier.letter,
    tierRowLeft + tierBoxSize / 2,
    tierBoxTop + tierBoxSize / 2
  );
  drawText(
    ctx,
    tierLabel,
    tierRowLeft + tierBoxSize + 12,
    tierBoxTop + tierBoxSize / 2,
    tierLabelOpts
  );

  // Category bars
  const barsLeft = PAD + scoreColW + 56;
  const barsWidth = CARD_WIDTH - barsLeft - PAD;
  const rowGap = 18;
  const rowHeight = 20 + 6 + 8;
  const rows = result.categoryScores.length;
  const totalBarsHeight = rows * rowHeight + (rows - 1) * rowGap;
  const barsTop = mainCenterY - totalBarsHeight / 2;

  const catLabelOpts: TextOpts = { size: 20, weight: 400, color: FG };
  const catScoreOpts: TextOpts = {
    size: 20,
    weight: 400,
    color: MUTED,
    align: "right",
  };

  for (let i = 0; i < rows; i++) {
    const cat = result.categoryScores[i];
    if (!cat) {
      continue;
    }
    const rowTop = barsTop + i * (rowHeight + rowGap);
    drawText(ctx, CATEGORY_LABELS[cat.id], barsLeft, rowTop, catLabelOpts);
    applyFont(ctx, catScoreOpts);
    ctx.fillText(`${cat.score}`, barsLeft + barsWidth, rowTop);

    const barTop = rowTop + 20 + 6;
    fillRoundRect(ctx, barsLeft, barTop, barsWidth, 8, 4, BORDER);
    const fillW = (Math.max(0, Math.min(100, cat.score)) / 100) * barsWidth;
    if (fillW > 0) {
      fillRoundRect(ctx, barsLeft, barTop, fillW, 8, 4, barTone(cat.score));
    }
  }
};
