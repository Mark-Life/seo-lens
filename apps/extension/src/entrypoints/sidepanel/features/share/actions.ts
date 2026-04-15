import { formatDisplayUrl } from "./format-url";

/**
 * Trigger a browser download for the given blob. Works in all MV3
 * extension pages via an anchor click.
 */
export const downloadBlob = (blob: Blob, pageUrl: string) => {
  const { host } = formatDisplayUrl(pageUrl);
  const safe = host.replace(/[^a-z0-9.-]/gi, "_") || "report";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `seo-lens-${safe}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
