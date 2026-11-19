import assert from "node:assert/strict";
import test from "node:test";
import {
  allowedHosts,
  fetchPageText,
  isAllowedUrl,
  normalizeUrl,
  parsePageHTML,
  parsePastedText,
  setAllowedHosts,
  toMarkdown,
} from "../extract.js";

test("normalizeUrl adds https and keeps a valid URL", () => {
  assert.equal(normalizeUrl("www.apple.com.cn").toString(), "https://www.apple.com.cn/");
});

test("isAllowedUrl accepts HTTPS public allowlisted domains and subdomains", () => {
  assert.equal(isAllowedUrl("https://www.apple.com.cn/"), true);
  assert.equal(isAllowedUrl("https://www.reuters.com/world/article"), true);
});

test("isAllowedUrl rejects unknown domains, insecure links, local hosts, and private IPs", () => {
  assert.equal(isAllowedUrl("https://example.com/"), false);
  assert.equal(isAllowedUrl("http://reuters.com/"), false);
  assert.equal(isAllowedUrl("not a url"), false);
  assert.equal(isAllowedUrl("https://localhost/"), false);
  assert.equal(isAllowedUrl("https://internal.example.com/"), false);
  assert.equal(isAllowedUrl("https://192.168.1.10/"), false);
  assert.equal(isAllowedUrl("https://10.0.0.1/"), false);
});

test("setAllowedHosts updates and reports the active allowlist", () => {
  const original = allowedHosts();
  try {
    assert.deepEqual(setAllowedHosts(["example.com", ".WWW.Example.org"]), ["example.com", "www.example.org"]);
    assert.equal(isAllowedUrl("https://sub.example.com/page"), true);
    assert.equal(isAllowedUrl("https://www.example.org/page"), true);
    assert.equal(isAllowedUrl("https://reuters.com/"), false);
  } finally {
    setAllowedHosts(original);
  }
});

test("fetchPageText explains direct-read CORS and network failures", async () => {
  const failingFetch = async () => {
    throw new Error("Failed to fetch");
  };

  await assert.rejects(
    () => fetchPageText("https://www.reuters.com/world/article", failingFetch),
    /CORS or network policy[\s\S]*paste mode/i
  );
});

test("parsePageHTML extracts JSON-LD article metadata without a DOM", () => {
  const html = `<!doctype html><html><head>
    <title>Fallback title</title>
    <script type="application/ld+json">${JSON.stringify({
      "@type": "NewsArticle",
      headline: "A public research note",
      description: "Public metadata description",
      datePublished: "2026-11-18",
      articleBody: "This is the article body from structured data.",
    })}</script>
    <script type="application/ld+json">{ malformed json }</script>
  </head><body><p>Visible page text.</p></body></html>`;

  const result = parsePageHTML(html, "https://www.reuters.com/world/note");

  assert.equal(result.sourceType, "jsonld");
  assert.equal(result.title, "A public research note");
  assert.equal(result.description, "Public metadata description");
  assert.equal(result.published, "2026-11-18");
  assert.equal(result.text, "This is the article body from structured data.");
  assert.equal(result.domain, "www.reuters.com");
  assert.equal(result.wordCount, 8);
});

test("parsePageHTML falls back to meta tags, article text, and absolute links without a DOM", () => {
  const html = `<!doctype html><html><head>
    <title>Meta title</title>
    <meta name="description" content="A concise public description">
    <meta property="article:published_time" content="2026-11-17">
  </head><body>
    <nav>Site menu that should be removed</nav>
    <article>
      <h1>Heading</h1>
      <p>Visible text from article.</p>
      <a href="/about">About</a>
      <a href="https://example.com/about">About</a>
    </article>
    <script>const noise = true;</script>
  </body></html>`;

  const result = parsePageHTML(html, "https://www.bbc.com/news/article");

  assert.equal(result.sourceType, "meta+article");
  assert.equal(result.title, "Meta title");
  assert.equal(result.description, "A concise public description");
  assert.equal(result.published, "2026-11-17");
  assert.match(result.text, /Heading/);
  assert.match(result.text, /Visible text from article\./);
  assert.doesNotMatch(result.text, /Site menu|noise/);
  assert.deepEqual(result.links, ["https://www.bbc.com/about", "https://example.com/about"]);
});

test("parsePastedText normalizes whitespace and rejects empty input", () => {
  const result = parsePastedText("  First   line \n\n\n Second line  ");
  assert.equal(result.title, "Pasted page text");
  assert.equal(result.text, "First line \n\nSecond line");
  assert.equal(result.sourceType, "pasted");
  assert.throws(() => parsePastedText(""), /Paste some page text first/);
});

test("toMarkdown includes source metadata, text, and links", () => {
  const record = parsePageHTML(
    `<html><head><title>Report</title></head><body><article><p>Body text.</p><a href="/next">Next</a></article></body></html>`,
    "https://www.npr.org/report"
  );
  const markdown = toMarkdown(record);

  assert.match(markdown, /^# Extracted page/);
  assert.match(markdown, /- Source: https:\/\/www\.npr\.org\/report/);
  assert.match(markdown, /- Title: Report/);
  assert.match(markdown, /## Text/);
  assert.match(markdown, /Body text\./);
  assert.match(markdown, /## Links/);
  assert.match(markdown, /- https:\/\/www\.npr\.org\/next/);
});
