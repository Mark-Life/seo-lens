import type { RobotsGroup, RobotsTxt } from "../../schema";

export interface RobotsMatch {
  readonly disallowed: boolean;
  readonly pattern: string | null;
  readonly userAgentGroup: string | null;
}

/**
 * Select the most-specific RobotsGroup for a given user-agent name.
 * Exact (case-insensitive) match wins over the wildcard `*` group.
 * Returns null when no group applies.
 */
const selectGroup = (
  groups: readonly RobotsGroup[],
  userAgent: string
): { group: RobotsGroup; matchedAgent: string } | null => {
  const lower = userAgent.toLowerCase();
  let wildcard: { group: RobotsGroup; matchedAgent: string } | null = null;
  for (const g of groups) {
    for (const ua of g.userAgents) {
      const u = ua.toLowerCase();
      if (u === lower) {
        return { group: g, matchedAgent: ua };
      }
      if (u === "*" && !wildcard) {
        wildcard = { group: g, matchedAgent: ua };
      }
    }
  }
  return wildcard;
};

/**
 * Translate a robots.txt path pattern into a RegExp.
 * Supports `*` wildcard and `$` end-of-string anchor.
 * Other regex metacharacters are escaped.
 */
const META = /[.+?^${}()|[\]\\]/;

const patternToRegex = (pattern: string): RegExp => {
  const normalized = pattern.startsWith("/") ? pattern : `/${pattern}`;
  const chars = [...normalized];
  let re = "";
  chars.forEach((ch, i) => {
    if (ch === "*") {
      re += ".*";
    } else if (ch === "$" && i === chars.length - 1) {
      re += "$";
    } else if (META.test(ch)) {
      re += `\\${ch}`;
    } else {
      re += ch;
    }
  });
  return new RegExp(`^${re}`);
};

interface PatternHit {
  readonly length: number;
  readonly pattern: string;
}

const findLongestMatch = (
  patterns: readonly string[],
  path: string
): PatternHit | null => {
  let best: PatternHit | null = null;
  for (const p of patterns) {
    if (!p) {
      continue;
    }
    const re = patternToRegex(p);
    if (re.test(path)) {
      const len = p.length;
      if (!best || len > best.length) {
        best = { pattern: p, length: len };
      }
    }
  }
  return best;
};

/**
 * Returns whether a path is disallowed by robots.txt for the given user-agent.
 * Implements Google's longest-match rule: the longest matching allow/disallow
 * pattern wins, with `allow` winning on ties.
 *
 * Special case: an empty `Disallow:` value means "allow everything".
 */
export const isPathDisallowed = (
  robots: RobotsTxt,
  path: string,
  userAgent = "*"
): RobotsMatch => {
  const selected = selectGroup(robots.groups, userAgent);
  if (!selected) {
    return { disallowed: false, pattern: null, userAgentGroup: null };
  }
  const { group, matchedAgent } = selected;
  const nonEmptyDisallow = group.disallow.filter((d) => d.length > 0);
  const allowHit = findLongestMatch(group.allow, path);
  const disallowHit = findLongestMatch(nonEmptyDisallow, path);

  if (!disallowHit) {
    return { disallowed: false, pattern: null, userAgentGroup: matchedAgent };
  }
  if (allowHit && allowHit.length >= disallowHit.length) {
    return { disallowed: false, pattern: null, userAgentGroup: matchedAgent };
  }
  return {
    disallowed: true,
    pattern: disallowHit.pattern,
    userAgentGroup: matchedAgent,
  };
};
