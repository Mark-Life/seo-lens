const WWW_PREFIX = /^www\./;

/**
 * Split a page URL into `host` (without protocol, without leading `www.`)
 * and `path` (without trailing slash). Returns empty path for root.
 */
export const formatDisplayUrl = (
  raw: string
): { host: string; path: string } => {
  try {
    const u = new URL(raw);
    const host = u.host.replace(WWW_PREFIX, "");
    let path = u.pathname;
    if (path.length > 1 && path.endsWith("/")) {
      path = path.slice(0, -1);
    }
    if (path === "/") {
      path = "";
    }
    return { host, path };
  } catch {
    return { host: raw, path: "" };
  }
};
