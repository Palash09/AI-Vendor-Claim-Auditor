import assert from "node:assert/strict";
import test from "node:test";
import { buildDecisionBrief } from "../lib/decision-brief.ts";

const audit = {
  id: "audit-1",
  ownerId: "reviewer-1",
  vendorName: "ExampleAI",
  productUrl: null,
  productDescription: "ExampleAI deletes customer content after 30 days.",
  intendedUse: "Draft internal support responses with employee review.",
  dataSensitivity: "confidential",
  decisionImpact: "high",
  assumptions: "Enterprise plan.",
  status: "approved",
  currentStep: 4,
  createdAt: "2026-08-11T00:00:00.000Z",
  updatedAt: "2026-08-11T00:00:00.000Z",
  expiresAt: "2026-08-14T00:00:00.000Z",
};

const citation = {
  sourceId: "product-description",
  fragmentId: "product-description-p1-1",
  sourceTitle: "ExampleAI product description",
  sourceLocation: "Paragraph 1",
  sourceQuote: "ExampleAI deletes customer content after 30 days.",
};

const baseFinding = {
  id: "finding-1",
  reviewerState: "approved",
  claim: "Customer content is deleted after 30 days.",
  claimType: "retention_deletion_access",
  claimCitation: citation,
  evidenceStatus: "No evidence found in supplied materials",
  evidenceCitations: [],
  rationale: "No separate retention evidence was supplied.",
  buyerRelevance: "high",
  followUpQuestion: "Does deletion include backups?",
};

test("exports only human-approved findings with scope, citations, and limitations", () => {
  const brief = buildDecisionBrief(audit, {
    mode: "demo",
    summary: "One retained gap needs clarification.",
    findings: [
      baseFinding,
      { ...baseFinding, id: "finding-removed", reviewerState: "removed", claim: "Removed claim" },
    ],
    questions: ["Does deletion include backups?"],
    extractionWarnings: [],
    createdAt: "2026-08-11T00:00:00.000Z",
    updatedAt: "2026-08-11T00:00:00.000Z",
  });

  assert.match(brief, /Draft internal support responses/);
  assert.match(brief, /No evidence found in supplied materials/);
  assert.match(brief, /ExampleAI product description, Paragraph 1/);
  assert.match(brief, /only the supplied materials/i);
  assert.match(brief, /not legal advice/i);
  assert.doesNotMatch(brief, /Removed claim/);
});
