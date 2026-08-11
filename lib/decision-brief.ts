import type { audits } from "@/db/schema";
import type { AnalysisResult, ReviewedFinding } from "@/lib/finding-validation";

export function buildDecisionBrief(
  audit: typeof audits.$inferSelect,
  analysis: AnalysisResult,
) {
  const findings = analysis.findings.filter(
    (finding) => finding.reviewerState === "approved",
  );
  const lines = [
    `# ${audit.vendorName} evidence-gap brief`,
    "",
    `Generated: ${new Date(analysis.updatedAt).toISOString()}`,
    "",
    "## Scope and intended use",
    "",
    `- **Vendor or product:** ${audit.vendorName}`,
    `- **Intended use:** ${audit.intendedUse ?? "Not supplied"}`,
    `- **Data sensitivity:** ${audit.dataSensitivity ?? "Not supplied"}`,
    `- **Decision impact:** ${audit.decisionImpact ?? "Not supplied"}`,
    `- **Assumptions:** ${audit.assumptions || "None supplied"}`,
    "- **Evidence scope:** Only the product description, URLs, and documents supplied to this audit were assessed.",
    "",
    "## Executive summary",
    "",
    analysis.summary,
    "",
    "## Reviewed findings",
    "",
    ...(findings.length
      ? findings.flatMap((finding, index) => formatFinding(finding, index))
      : ["No findings were retained after human review.", ""]),
    "## Five follow-up questions",
    "",
    ...analysis.questions.slice(0, 5).map((question, index) => `${index + 1}. ${question}`),
    "",
    "## Limitations and unreviewed areas",
    "",
    "- Evidence statuses describe only the supplied materials; they do not determine whether a vendor claim is objectively true or false.",
    "- This brief is not legal advice, a compliance or safety certification, or a purchasing recommendation.",
    "- Scanned or otherwise unreadable content may not have been assessed.",
    "- A human reviewer approved every retained finding before this brief was generated.",
  ];

  if (analysis.extractionWarnings.length) {
    lines.push("", "### Extraction warnings", "");
    lines.push(...analysis.extractionWarnings.map((warning) => `- ${warning}`));
  }
  return `${lines.join("\n").trim()}\n`;
}

function formatFinding(finding: ReviewedFinding, index: number) {
  const evidenceLines = finding.evidenceCitations.length
    ? finding.evidenceCitations.flatMap((citation) => [
        `  - ${citation.sourceTitle}, ${citation.sourceLocation}`,
        `    > ${citation.sourceQuote}`,
      ])
    : ["  - No separate evidence citation retained."];
  return [
    `### ${index + 1}. ${finding.claim}`,
    "",
    `- **Domain:** ${formatDomain(finding.claimType)}`,
    `- **Evidence status:** ${finding.evidenceStatus}`,
    `- **Intended-use relevance:** ${finding.buyerRelevance}`,
    `- **Rationale:** ${finding.rationale}`,
    `- **Claim source:** ${finding.claimCitation.sourceTitle}, ${finding.claimCitation.sourceLocation}`,
    `  > ${finding.claimCitation.sourceQuote}`,
    "- **Relevant supplied evidence:**",
    ...evidenceLines,
    ...(finding.followUpQuestion
      ? [`- **Follow-up question:** ${finding.followUpQuestion}`]
      : []),
    "",
  ];
}

function formatDomain(value: ReviewedFinding["claimType"]) {
  const labels: Record<ReviewedFinding["claimType"], string> = {
    customer_data_training: "Customer-data use and training",
    retention_deletion_access: "Retention, deletion, and access",
    model_provider_dependencies: "Model and provider dependencies",
    performance_limitations: "Performance claims and limitations",
    oversight_incidents_change_notification: "Oversight, incidents, and change notification",
  };
  return labels[value];
}
