import { describe, expect, it } from "vitest";

import { looksLikeMarkdown, markdownToHtml } from "@/src/admin/markdown";

describe("admin Markdown import", () => {
  it("converts common ChatGPT Markdown into rich text HTML", () => {
    const html = markdownToHtml("# Lead story\n\nA **bold** opening with [context](https://example.com).\n\n- First\n- Second");

    expect(html).toContain("<h2>Lead story</h2>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain('<a href="https://example.com">context</a>');
    expect(html).toContain("<ul><li><p>First</p></li><li><p>Second</p></li></ul>");
  });

  it("escapes HTML and rejects unsafe link protocols", () => {
    const html = markdownToHtml("<script>alert(1)</script> [bad](javascript:alert(1))");

    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("javascript:");
  });

  it("recognizes Markdown while leaving ordinary prose alone", () => {
    expect(looksLikeMarkdown("## Heading\n\n**Important**")).toBe(true);
    expect(looksLikeMarkdown("An ordinary paragraph from a wire story.")).toBe(false);
  });
});
