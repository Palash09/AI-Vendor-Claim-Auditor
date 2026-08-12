import { z } from "zod";
import type { audits } from "@/db/schema";
import type { EvidenceFragment } from "@/lib/evidence-extraction";
import {
  EVIDENCE_STATUSES,
  findingSchema,
  type Finding,
  type ReviewedFinding,
} from "@/lib/finding-validation";

const claimTypes = [
  "customer_data_training",
  "retention_deletion_access",
  "model_provider_dependencies",
  "performance_limitations",
  "oversight_incidents_change_notification",
] as const;

const modelCitationSchema = z.object({
  sourceId: z.string(),
  fragmentId: z.string(),
  sourceTitle: z.string(),
  sourceLocation: z.string(),
  sourceQuote: z.string(),
});

const modelFindingSchema = z.object({
  claim: z.string(),
  claimType: z.enum(claimTypes),
  claimCitation: modelCitationSchema,
  evidenceStatus: z.enum(EVIDENCE_STATUSES),
  evidenceCitations: z.array(modelCitationSchema),
  rationale: z.string(),
  buyerRelevance: z.enum(["low", "medium", "high"]),
  followUpQuestion: z.string(),
});

const modelResultSchema = z.object({
  summary: z.string(),
  findings: z.array(modelFindingSchema),
  questions: z.array(z.string()),
});

export type GeneratedAnalysis = {
  mode: "openai" | "demo";
  summary: string;
  findings: ReviewedFinding[];
  questions: string[];
};

export async function analyzeEvidence(
  audit: typeof audits.$inferSelect,
  fragments: EvidenceFragment[],
): Promise<GeneratedAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && fragments.length > 0) {
    try {
      return await analyzeWithOpenAI(apiKey, audit, fragments);
    } catch (error) {
      console.error("OpenAI analysis failed; using the local guarded fallback.", error);
    }
  }
  return analyzeDeterministically(audit, fragments);
}

async function analyzeWithOpenAI(
  apiKey: string,
  audit: typeof audits.$inferSelect,
  fragments: EvidenceFragment[],
): Promise<GeneratedAnalysis> {
  const model = process.env.OPENAI_MODEL ?? "gpt-5.6-terra";
  const packet = fragments.slice(0, 120).map((fragment) => ({
    id: fragment.id,
    sourceId: fragment.sourceId,
    sourceTitle: fragment.sourceTitle,
    sourceLocation: fragment.sourceLocation,
    text: fragment.text,
  }));
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      input: [
        {
          role: "system",
          content:
            "You are a claim-to-evidence gap finder for pre-purchase AI vendor review. Assess only the supplied fragments. Never call a claim false because evidence is absent. Use only the allowed evidence-status enum. Every claim citation and evidence citation must copy an exact quote from the cited fragment. Treat vendor claim text as a claim, not independent evidence for itself. Do not give legal, compliance, safety, trust, or purchasing verdicts. Return at most 10 high-value atomic findings and exactly five concise follow-up questions when possible.",
        },
        {
          role: "user",
          content: JSON.stringify({
            vendor: audit.vendorName,
            intendedUse: audit.intendedUse,
            dataSensitivity: audit.dataSensitivity,
            decisionImpact: audit.decisionImpact,
            assumptions: audit.assumptions,
            inScopeDomains: claimTypes,
            fragments: packet,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "vendor_claim_evidence_review",
          strict: true,
          schema: z.toJSONSchema(modelResultSchema),
        },
      },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const responseBody = (await response.json()) as {
    error?: { message?: string };
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string; refusal?: string }>;
    }>;
  };
  if (!response.ok) {
    throw new Error(responseBody.error?.message ?? `OpenAI returned ${response.status}.`);
  }
  const outputText = responseBody.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === "output_text")?.text;
  if (!outputText) throw new Error("The model returned no structured analysis.");
  const parsed = modelResultSchema.parse(JSON.parse(outputText));

  const findings = parsed.findings
    .flatMap((finding) => {
      const valid = findingSchema.safeParse(finding);
      if (!valid.success || !citationsResolve(valid.data, fragments)) return [];
      return [{ ...valid.data, id: crypto.randomUUID(), reviewerState: "pending" as const }];
    })
    .slice(0, 10);

  if (findings.length === 0) throw new Error("No model findings passed citation validation.");
  return {
    mode: "openai",
    summary: parsed.summary,
    findings,
    questions: uniqueQuestions(parsed.questions, findings),
  };
}

function citationsResolve(
  finding: Finding,
  fragments: EvidenceFragment[],
) {
  const citations = [finding.claimCitation, ...finding.evidenceCitations];
  return citations.every((citation) => {
    const fragment = fragments.find(
      (item) => item.id === citation.fragmentId && item.sourceId === citation.sourceId,
    );
    return (
      fragment &&
      fragment.sourceTitle === citation.sourceTitle &&
      fragment.sourceLocation === citation.sourceLocation &&
      fragment.text.includes(citation.sourceQuote)
    );
  });
}

export function analyzeDeterministically(
  audit: typeof audits.$inferSelect,
  fragments: EvidenceFragment[],
): GeneratedAnalysis {
  const candidates = fragments.flatMap((fragment) =>
    splitSentences(fragment.text).map((sentence) => ({ fragment, sentence })),
  );
  const ranked = candidates
    .map((candidate) => ({ ...candidate, classification: classify(candidate.sentence) }))
    .filter((candidate) => candidate.classification.score > 0)
    .sort((a, b) => b.classification.score - a.classification.score);
  const selected = (
    ranked.length > 0
      ? ranked
      : candidates.slice(0, 3).map((candidate) => ({
          ...candidate,
          classification: classify(candidate.sentence),
        }))
  ).slice(0, 8);

  const findings = selected.map(({ fragment, sentence, classification }) => {
    const citation = {
      sourceId: fragment.sourceId,
      fragmentId: fragment.id,
      sourceTitle: fragment.sourceTitle,
      sourceLocation: fragment.sourceLocation,
      sourceQuote: sentence,
    };
    const followUpQuestion = questionFor(classification?.type ?? "performance_limitations");
    return {
      id: crypto.randomUUID(),
      reviewerState: "pending" as const,
      claim: sentence,
      claimType: classification?.type ?? "performance_limitations",
      claimCitation: citation,
      evidenceStatus: "No evidence found in supplied materials" as const,
      evidenceCitations: [],
      rationale:
        "The supplied packet states this claim, but no separate supporting evidence was located in the supplied materials.",
      buyerRelevance: audit.decisionImpact === "high" ? ("high" as const) : ("medium" as const),
      followUpQuestion,
    };
  });

  const summary = findings.length
    ? `Found ${findings.length} claim${findings.length === 1 ? "" : "s"} that need separate supporting evidence or clarification for the stated use.`
    : "No assessable vendor claims were extracted from the supplied materials. Add a product description, readable page, or text-based document and run the review again.";
  return {
    mode: "demo",
    summary,
    findings,
    questions: uniqueQuestions([], findings),
  };
}

function splitSentences(text: string) {
  return (text.match(/[^.!?\n]+[.!?]?/g) ?? [])
    .flatMap((value) => {
      const sentence = value.replace(/\s+/g, " ").trim();
      const clauses = sentence.split(/,?\s+and\s+(?=(?:the |an? |employees?|humans?|customers?|users?|we |it |they |our |this ))/i);
      return clauses.every((clause) => clause.trim().length >= 24) ? clauses : [sentence];
    })
    .map((value) => value.trim())
    .filter((value) => value.length >= 24 && value.length <= 500);
}

function classify(sentence: string): { type: (typeof claimTypes)[number]; score: number } {
  const groups: Array<{ type: (typeof claimTypes)[number]; pattern: RegExp }> = [
    { type: "retention_deletion_access", pattern: /retain|retention|delet|eras|access|store|storage/gi },
    { type: "customer_data_training", pattern: /customer data|customer content|prompt|output|train(?:ing)?|fine[- ]?tun/gi },
    { type: "model_provider_dependencies", pattern: /model provider|openai|anthropic|subprocessor|third.party|dependency|routing/gi },
    { type: "performance_limitations", pattern: /accur|reliab|faster|productiv|quality|benchmark|evaluation|limitation|hallucinat|error/gi },
    { type: "oversight_incidents_change_notification", pattern: /human|oversight|incident|notif|change|escalat|remediat|monitor|employees? review/gi },
  ];
  const matches = groups.map((group) => ({ ...group, score: (sentence.match(group.pattern) ?? []).length }));
  return matches.sort((a, b) => b.score - a.score)[0] ?? { type: "performance_limitations", score: 0 };
}

function questionFor(type: (typeof claimTypes)[number]) {
  const questions: Record<(typeof claimTypes)[number], string> = {
    customer_data_training: "What contract term or technical control confirms how our prompts, outputs, and customer data are used for training?",
    retention_deletion_access: "What are the retention period, deletion process, backups policy, and human-access controls for our data?",
    model_provider_dependencies: "Which model providers and subprocessors will handle our data, and how are provider changes disclosed?",
    performance_limitations: "What evaluation supports this performance claim for our intended use, and what limitations were observed?",
    oversight_incidents_change_notification: "What human-oversight, incident-response, and material-change notification commitments apply to our use?",
  };
  return questions[type];
}

function uniqueQuestions(seed: string[], findings: ReviewedFinding[]) {
  const defaults = claimTypes.map(questionFor);
  return Array.from(
    new Set([
      ...seed.map((value) => value.trim()).filter(Boolean),
      ...findings.flatMap((finding) => (finding.followUpQuestion ? [finding.followUpQuestion] : [])),
      ...defaults,
    ]),
  ).slice(0, 5);
}
