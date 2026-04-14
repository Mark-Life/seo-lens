import { describe, expect, it } from "vitest";
import {
  type ParsedRobotsTxt,
  parseRobotsTxt,
} from "../../src/lib/services/site/robots";

interface Case {
  readonly expected: ParsedRobotsTxt;
  readonly input: string;
  readonly name: string;
}

const cases: readonly Case[] = [
  {
    name: "single group with allow + disallow",
    input: ["User-agent: *", "Disallow: /private", "Allow: /public"].join("\n"),
    expected: {
      groups: [
        {
          userAgents: ["*"],
          allow: ["/public"],
          disallow: ["/private"],
          crawlDelay: null,
        },
      ],
      sitemapUrls: [],
    },
  },
  {
    name: "consecutive User-agent lines share one group",
    input: [
      "User-agent: Googlebot",
      "User-agent: Bingbot",
      "Disallow: /admin",
    ].join("\n"),
    expected: {
      groups: [
        {
          userAgents: ["Googlebot", "Bingbot"],
          allow: [],
          disallow: ["/admin"],
          crawlDelay: null,
        },
      ],
      sitemapUrls: [],
    },
  },
  {
    name: "directive ends the agent list; next agent starts a new group",
    input: [
      "User-agent: Googlebot",
      "Disallow: /a",
      "User-agent: Bingbot",
      "Disallow: /b",
    ].join("\n"),
    expected: {
      groups: [
        {
          userAgents: ["Googlebot"],
          allow: [],
          disallow: ["/a"],
          crawlDelay: null,
        },
        {
          userAgents: ["Bingbot"],
          allow: [],
          disallow: ["/b"],
          crawlDelay: null,
        },
      ],
      sitemapUrls: [],
    },
  },
  {
    name: "comments, blank lines and CRLF tolerated",
    input: [
      "# top comment",
      "",
      "User-agent: * # trailing",
      "\tDisallow: /x # inline",
      "",
      "Sitemap: https://example.com/sitemap.xml",
    ].join("\r\n"),
    expected: {
      groups: [
        {
          userAgents: ["*"],
          allow: [],
          disallow: ["/x"],
          crawlDelay: null,
        },
      ],
      sitemapUrls: ["https://example.com/sitemap.xml"],
    },
  },
  {
    name: "crawl-delay parsed; invalid crawl-delay ignored",
    input: [
      "User-agent: *",
      "Crawl-delay: 5",
      "User-agent: Slowbot",
      "Crawl-delay: not-a-number",
      "Disallow: /",
    ].join("\n"),
    expected: {
      groups: [
        {
          userAgents: ["*"],
          allow: [],
          disallow: [],
          crawlDelay: 5,
        },
        {
          userAgents: ["Slowbot"],
          allow: [],
          disallow: ["/"],
          crawlDelay: null,
        },
      ],
      sitemapUrls: [],
    },
  },
  {
    name: "multiple Sitemap directives collected at file scope",
    input: [
      "Sitemap: https://example.com/a.xml",
      "User-agent: *",
      "Disallow:",
      "Sitemap: https://example.com/b.xml",
    ].join("\n"),
    expected: {
      groups: [
        {
          userAgents: ["*"],
          allow: [],
          disallow: [],
          crawlDelay: null,
        },
      ],
      sitemapUrls: ["https://example.com/a.xml", "https://example.com/b.xml"],
    },
  },
  {
    name: "unknown directives silently ignored",
    input: ["User-agent: *", "Host: example.com", "Disallow: /z"].join("\n"),
    expected: {
      groups: [
        {
          userAgents: ["*"],
          allow: [],
          disallow: ["/z"],
          crawlDelay: null,
        },
      ],
      sitemapUrls: [],
    },
  },
  {
    name: "garbage input produces empty groups without throwing",
    input: "this is not a robots.txt\njust some words\n",
    expected: {
      groups: [],
      sitemapUrls: [],
    },
  },
];

describe("parseRobotsTxt", () => {
  it.each(cases)("$name", ({ input, expected }) => {
    expect(parseRobotsTxt(input)).toEqual(expected);
  });
});
