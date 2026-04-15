import { describe, expect, it } from "vitest";
import { formatDisplayUrl } from "../../src/entrypoints/sidepanel/features/share/format-url";

describe("formatDisplayUrl", () => {
  it("strips protocol and www", () => {
    expect(formatDisplayUrl("https://www.example.com/blog")).toEqual({
      host: "example.com",
      path: "/blog",
    });
  });

  it("removes trailing slash from path", () => {
    expect(formatDisplayUrl("https://example.com/foo/")).toEqual({
      host: "example.com",
      path: "/foo",
    });
  });

  it("empty path for root", () => {
    expect(formatDisplayUrl("https://example.com/")).toEqual({
      host: "example.com",
      path: "",
    });
  });

  it("keeps subdomain other than www", () => {
    expect(formatDisplayUrl("https://blog.example.com/post")).toEqual({
      host: "blog.example.com",
      path: "/post",
    });
  });

  it("falls back on malformed input", () => {
    expect(formatDisplayUrl("not a url")).toEqual({
      host: "not a url",
      path: "",
    });
  });
});
