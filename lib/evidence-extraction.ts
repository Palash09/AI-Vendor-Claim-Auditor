import { env } from "cloudflare:workers";
import type { audits, sources } from "@/db/schema";

const MAX_DOCUMENT_CHARS = 40_000;
const MAX_FRAGMENT_CHARS = 1_800;

export type EvidenceFragment = {
  id: string;
  sourceId: string;
  sourceTitle: string;
  sourceLocation: string;
  text: string;
};

export type ExtractionResult = {
  fragments: EvidenceFragment[];
  warnings: string[];
};

export async function extractAuditEvidence(
  audit: typeof audits.$inferSelect,
  sourceRecords: Array<typeof sources.$inferSelect>,
): Promise<ExtractionResult> {
  const documents: Array<{ id: string; title: string; text: string }> = [];
  const warnings: string[] = [];

  if (audit.productDescription?.trim()) {
    documents.push({
      id: "product-description",
      title: `${audit.vendorName} product description`,
      text: audit.productDescription,
    });
  }

  if (audit.productUrl) {
    await addUrlDocument(
      { id: "product-url", title: `${audit.vendorName} product page`, url: audit.productUrl },
      documents,
      warnings,
    );
  }

  for (const source of sourceRecords) {
    if (source.kind === "url" && source.url) {
      await addUrlDocument(
        { id: source.id, title: source.title, url: source.url },
        documents,
        warnings,
      );
      continue;
    }

    if (!source.storageKey || !env.EVIDENCE_BUCKET) {
      warnings.push(`${source.title}: the uploaded file could not be read.`);
      continue;
    }

    try {
      const object = await env.EVIDENCE_BUCKET.get(source.storageKey);
      if (!object) throw new Error("File is no longer available");
      const bytes = new Uint8Array(await object.arrayBuffer());
      let text: string;
      if (source.contentType === "application/pdf") {
        const { extractText } = await import("unpdf");
        const result = await extractText(bytes, { mergePages: true });
        text = result.text;
      } else {
        text = new TextDecoder().decode(bytes);
      }
      if (!text.trim()) throw new Error("No extractable text was found");
      documents.push({ id: source.id, title: source.title, text });
    } catch (error) {
      warnings.push(
        `${source.title}: ${error instanceof Error ? error.message : "extraction failed"}.`,
      );
    }
  }

  return {
    fragments: documents.flatMap((document) => fragmentDocument(document)),
    warnings,
  };
}

async function addUrlDocument(
  source: { id: string; title: string; url: string },
  documents: Array<{ id: string; title: string; text: string }>,
  warnings: string[],
) {
  try {
    assertPublicHttpUrl(source.url);
    const response = await fetch(source.url, {
      headers: { "user-agent": "ClaimAuditor/0.1 evidence-review" },
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error(`request returned ${response.status}`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/") && !contentType.includes("application/xhtml")) {
      throw new Error("URL did not return readable text or HTML");
    }
    const html = (await response.text()).slice(0, MAX_DOCUMENT_CHARS * 3);
    const text = contentType.includes("html") ? htmlToText(html) : html;
    if (!text.trim()) throw new Error("No readable text was found");
    documents.push({ id: source.id, title: source.title, text });
  } catch (error) {
    warnings.push(
      `${source.title}: ${error instanceof Error ? error.message : "could not be fetched"}.`,
    );
  }
}

function assertPublicHttpUrl(value: string) {
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol)) throw new Error("only HTTP(S) URLs are supported");
  const host = url.hostname.toLowerCase();
  const privateHost =
    host === "localhost" ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (privateHost) throw new Error("private-network URLs are not allowed");
}

function htmlToText(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<\/(?:p|div|section|article|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function fragmentDocument(document: { id: string; title: string; text: string }) {
  const normalized = document.text.replace(/\r/g, "").slice(0, MAX_DOCUMENT_CHARS);
  const paragraphs = normalized
    .split(/\n\s*\n|\n(?=[A-Z][^\n]{20,})/)
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter((value) => value.length >= 20);
  const fragments: EvidenceFragment[] = [];

  paragraphs.forEach((paragraph, index) => {
    for (let offset = 0; offset < paragraph.length; offset += MAX_FRAGMENT_CHARS) {
      const part = paragraph.slice(offset, offset + MAX_FRAGMENT_CHARS).trim();
      if (!part) continue;
      fragments.push({
        id: `${document.id}-p${index + 1}-${Math.floor(offset / MAX_FRAGMENT_CHARS) + 1}`,
        sourceId: document.id,
        sourceTitle: document.title,
        sourceLocation: `Paragraph ${index + 1}${offset ? `, part ${Math.floor(offset / MAX_FRAGMENT_CHARS) + 1}` : ""}`,
        text: part,
      });
    }
  });

  return fragments;
}
