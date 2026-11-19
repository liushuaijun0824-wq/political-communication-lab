const DEFAULT_ALLOWED_HOSTS = [
  "apple.com.cn",
  "reuters.com",
  "apnews.com",
  "bbc.com",
  "bbc.co.uk",
  "npr.org",
  "theguardian.com",
];

const REMOVE_SELECTORS = "script, style, nav, footer, aside, form, iframe, noscript, svg";
const BLOCK_SELECTORS = "h1, h2, h3, h4, h5, h6, p, li, blockquote, pre, time";
const MAX_TEXT = 12000;
const MAX_LINKS = 200;

let allowedHostsSet = new Set(DEFAULT_ALLOWED_HOSTS);

export function allowedHosts() {
  return [...allowedHostsSet];
}

export function setAllowedHosts(hosts) {
  const values = (Array.isArray(hosts) ? hosts : String(hosts ?? "").split(","))
    .map((host) => String(host).trim().toLowerCase().replace(/^\./, ""))
    .filter(Boolean);
  allowedHostsSet = new Set(values);
  return allowedHosts();
}

export function normalizeUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) throw new Error("Enter a public URL.");
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(withProtocol);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only http and https links are supported.");
  if (isPrivateHost(url.hostname)) throw new Error("Private and local addresses are not supported.");
  return url;
}

export function isAllowedUrl(value) {
  try {
    const url = normalizeUrl(value);
    if (url.protocol !== "https:") return false;
    return isHostAllowed(url.hostname);
  } catch {
    return false;
  }
}

export async function fetchPageText(url, fetchImpl = fetch) {
  let parsed;
  try {
    parsed = typeof url === "string" || url instanceof URL ? normalizeUrl(url) : url;
  } catch {
    parsed = url;
  }
  const address = parsed?.toString ? parsed.toString() : String(parsed);
  let response;
  try {
    response = await fetchImpl(address, { method: "GET", redirect: "follow" });
  } catch (error) {
    throw new Error(
      `The site did not allow a direct browser read (CORS or network policy). Use paste mode for text you are allowed to use. ${error?.message ?? ""}`.trim()
    );
  }
  if (!response.ok) throw new Error(`The site returned HTTP ${response.status}.`);
  return response.text();
}

export function parsePageHTML(html, sourceUrl) {
  const source = String(sourceUrl ?? "");
  const parser = createParser();
  const doc = parser.parse(String(html ?? ""));
  const extracted = parser.extract(doc, source);
  return makeRecord(extracted, source, "page");
}

export function parsePastedText(value) {
  const text = cleanText(value).slice(0, MAX_TEXT);
  if (!text) throw new Error("Paste some page text first.");
  return makeRecord(
    {
      title: "Pasted page text",
      description: "",
      published: "",
      text,
      links: [],
      sourceType: "pasted",
    },
    "pasted text"
  );
}

export function toMarkdown(record) {
  const safe = record ?? {};
  const lines = [
    "# Extracted page",
    "",
    `- Source: ${safe.source || "n.a."}`,
    `- Domain: ${safe.domain || "n.a."}`,
    `- Title: ${safe.title || "Untitled page"}`,
    `- Published: ${safe.published || "n.a."}`,
    `- Extracted: ${safe.sourceType || "page"}`,
    `- Words: ${safe.wordCount ?? 0}`,
    "",
    "## Text",
    "",
    safe.text || "",
  ];
  if (safe.description) lines.push("", "## Description", "", safe.description);
  if (safe.links?.length) {
    lines.push("", "## Links", "");
    safe.links.forEach((link) => lines.push(`- ${link}`));
  }
  return lines.join("\n");
}

function makeRecord(extracted, source, fallbackType = "page") {
  const text = cleanText(extracted.text).slice(0, MAX_TEXT);
  const links = [...new Set((extracted.links || []).filter(Boolean))].slice(0, MAX_LINKS);
  const domain = domainFrom(source);
  return {
    title: cleanText(extracted.title) || "Untitled page",
    description: cleanText(extracted.description),
    published: cleanText(extracted.published),
    text,
    textChars: text.length,
    links,
    wordCount: text ? text.split(/\s+/).filter(Boolean).length : 0,
    domain,
    source: cleanText(source),
    sourceType: extracted.sourceType || fallbackType,
  };
}

function createParser() {
  if (typeof DOMParser !== "undefined") {
    return {
      parse(html) {
        return new DOMParser().parseFromString(html, "text/html");
      },
      extract(doc, sourceUrl) {
        return extractWithDOM(doc, sourceUrl);
      },
    };
  }
  return {
    parse(html) {
      return html;
    },
    extract(html, sourceUrl) {
      return extractWithFallback(html, sourceUrl);
    },
  };
}

function extractWithDOM(doc, sourceUrl) {
  doc.querySelectorAll(REMOVE_SELECTORS).forEach((node) => node.remove());
  const jsonld = readJsonLD(doc);
  const title = jsonld.headline || metaContent(doc, "property", "og:title") || textOf(doc.title) || "Untitled page";
  const description =
    jsonld.description || metaContent(doc, "name", "description") || metaContent(doc, "property", "og:description") || "";
  const published =
    jsonld.datePublished ||
    metaContent(doc, "property", "article:published_time") ||
    metaContent(doc, "name", "date") ||
    metaContent(doc, "name", "pubdate") ||
    "";

  let text = cleanText(jsonld.articleBody || "");
  let sourceType = jsonld.articleBody ? "jsonld" : "";
  if (!text) {
    const nodes = [...doc.querySelectorAll("article, main, [role='main']")];
    const best = pickLongest(nodes, (node) => textOf(node));
    text = textOfWithBreaks(best || doc.body || doc.documentElement);
    sourceType = best ? "meta+article" : "body";
  }

  const links = [...doc.querySelectorAll("a[href]")]
    .map((anchor) => absoluteHref(anchor.getAttribute("href"), sourceUrl))
    .filter(Boolean);
  return { title, description, published, text, links, sourceType };
}

function extractWithFallback(html, sourceUrl) {
  const withoutNoise = stripTags(html, REMOVE_SELECTORS);
  const jsonld = readJsonLDFallback(html);
  const title =
    jsonld.headline ||
    metaFallback(withoutNoise, "property", "og:title") ||
    tagText(withoutNoise, "title") ||
    "Untitled page";
  const description =
    jsonld.description ||
    metaFallback(withoutNoise, "name", "description") ||
    metaFallback(withoutNoise, "property", "og:description") ||
    "";
  const published =
    jsonld.datePublished ||
    metaFallback(withoutNoise, "property", "article:published_time") ||
    metaFallback(withoutNoise, "name", "date") ||
    "";

  let text = cleanText(jsonld.articleBody || "");
  let sourceType = jsonld.articleBody ? "jsonld" : "";
  if (!text) {
    const article = pickBlock(withoutNoise, "article") || pickBlock(withoutNoise, "main") || withoutNoise;
    text = cleanHTMLText(article);
    sourceType = article === withoutNoise ? "body" : "meta+article";
  }
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map((match) =>
    absoluteHref(decodeEntities(match[1]), sourceUrl)
  );
  return { title: cleanText(title), description, published, text, links: links.filter(Boolean), sourceType };
}

function readJsonLD(doc) {
  const result = {};
  const blocks = [...doc.querySelectorAll("script[type='application/ld+json']")];
  blocks.forEach((block) => {
    try {
      const data = JSON.parse(textOf(block));
      collectJsonLD(data, result);
    } catch {
      // A malformed block is ignored; the page still has meta tags and text.
    }
  });
  return result;
}

function readJsonLDFallback(html) {
  const result = {};
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  blocks.forEach((match) => {
    try {
      collectJsonLD(JSON.parse(match[1]), result);
    } catch {
      // Ignore malformed metadata.
    }
  });
  return result;
}

function collectJsonLD(data, result) {
  if (!data) return;
  if (Array.isArray(data)) {
    data.forEach((entry) => collectJsonLD(entry, result));
    return;
  }
  if (typeof data !== "object") return;
  const types = Array.isArray(data["@type"]) ? data["@type"] : [data["@type"]];
  const isArticle = types.some((type) => /article|news|blog|report/i.test(String(type)));
  const candidates = isArticle || !result.headline ? [data] : [];
  if (Array.isArray(data["@graph"])) candidates.push(...data["@graph"]);
  candidates.forEach((entry) => {
    result.headline ||= cleanText(entry.headline || entry.title);
    result.description ||= cleanText(entry.description);
    result.datePublished ||= cleanText(entry.datePublished || entry.dateModified || entry.uploadDate);
    result.articleBody ||= cleanText(entry.articleBody);
  });
}

function pickLongest(nodes, measure) {
  let best = null;
  let bestLength = 0;
  nodes.forEach((node) => {
    const length = measure(node).length;
    if (length > bestLength) {
      best = node;
      bestLength = length;
    }
  });
  return best;
}

function textOf(node) {
  return cleanText(node?.textContent || "");
}

function textOfWithBreaks(node) {
  if (!node) return "";
  const parts = [...node.querySelectorAll(BLOCK_SELECTORS)].map((child) => textOf(child)).filter(Boolean);
  if (parts.length) return parts.join("\n\n");
  return textOf(node);
}

function metaContent(doc, key, value) {
  const node = doc.querySelector(`meta[${key}='${CSS.escape(value)}' i]`);
  return cleanText(node?.getAttribute("content") || "");
}

function absoluteHref(href, sourceUrl) {
  try {
    const url = new URL(decodeEntities(href), sourceUrl);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function stripTags(html, selectors) {
  return selectors.split(",").reduce((text, selector) => {
    const tag = selector.trim().replace(/[\^$*~|=[\]]/g, "");
    return text.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, "gi"), " ");
  }, String(html));
}

function pickBlock(html, tag) {
  const matches = [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}\\s*>`, "gi"))];
  if (!matches.length) return null;
  return matches.sort((a, b) => cleanHTMLText(b[1]).length - cleanHTMLText(a[1]).length)[0][1];
}

function cleanHTMLText(value) {
  return cleanText(
    String(value)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|li|h[1-6]|blockquote|pre)>/gi, "\n\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
  );
}

function metaFallback(html, key, value) {
  const pattern = new RegExp(`<meta[^>]+${key}=["']${value}["'][^>]*>`, "i");
  return cleanText(attrValue(html, pattern, "content"));
}

function attrValue(html, pattern, attr) {
  const tag = html.match(pattern)?.[0] || "";
  const attrPattern = new RegExp(`${attr}=["']([^"']*)["']`, "i");
  return cleanText(decodeEntities(tag.match(attrPattern)?.[1] || ""));
}

function tagText(html, tag) {
  return cleanHTMLText(html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}\\s*>`, "i"))?.[1] || "");
}

function decodeEntities(value) {
  return String(value ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isHostAllowed(hostname) {
  const host = String(hostname || "").toLowerCase();
  return [...allowedHostsSet].some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

function isPrivateHost(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const octets = host.split(".").map(Number);
    if (octets[0] === 10 || octets[0] === 127 || octets[0] >= 224) return true;
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
    if (octets[0] === 192 && octets[1] === 168) return true;
    if (octets[0] === 169 && octets[1] === 254) return true;
    return true;
  }
  return false;
}

function domainFrom(value) {
  try {
    return normalizeUrl(value).hostname;
  } catch {
    return "";
  }
}
