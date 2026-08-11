import assert from "node:assert/strict";
import test from "node:test";
import {
  analysisResultSchema,
  EVIDENCE_STATUSES,
  findingSchema,
} from "../lib/finding-validation.ts";

const citation = {
  sourceId: "source-1",
  fragmentId: "fragment-1",
  sourceTitle: "Enterprise privacy page",
  sourceLocation: "Section 3, paragraph 2",
  sourceQuote: "Customer content is not used to train shared models.",
};

const validFinding = {
  claim: "Customer content is not used to train shared models.",
  claimType: "customer_data_training",
  claimCitation: citation,
  evidenceStatus: "Partially supported",
  evidenceCitations: [citation],
  rationale: "The commitment is limited to the enterprise tier.",
  buyerRelevance: "high",
  followUpQuestion: "Does this commitment apply to the proposed plan?",
};

test("uses only the five allowed evidence statuses", () => {
  assert.deepEqual(EVIDENCE_STATUSES, [
    "Supported by supplied evidence",
    "Partially supported",
    "No evidence found in supplied materials",
    "Conflicting disclosure",
    "Not assessable from supplied materials",
  ]);
  assert.equal(findingSchema.safeParse(validFinding).success, true);
  assert.equal(
    findingSchema.safeParse({
      ...validFinding,
      evidenceStatus: "Unsupported",
    }).success,
    false,
  );
});

test("requires an exact claim citation", () => {
  const result = findingSchema.safeParse({
    ...validFinding,
    claimCitation: { ...citation, sourceQuote: "" },
  });
  assert.equal(result.success, false);
});

test("requires evidence for non-absence statuses", () => {
  const result = findingSchema.safeParse({
    ...validFinding,
    evidenceCitations: [],
  });
  assert.equal(result.success, false);
});

test("allows an explicit supplied-materials absence statement", () => {
  const result = findingSchema.safeParse({
    ...validFinding,
    evidenceStatus: "No evidence found in supplied materials",
    evidenceCitations: [],
    rationale: "No relevant evidence was located in the supplied packet.",
  });
  assert.equal(result.success, true);
});

test("rejects unsupported verdict language", () => {
  for (const word of ["safe", "compliant", "approved", "deceptive"]) {
    const result = findingSchema.safeParse({
      ...validFinding,
      rationale: `The vendor is ${word}.`,
    });
    assert.equal(result.success, false, word);
  }
});

test("accepts a persisted human-review result and rejects unknown review states", () => {
  const analysis = {
    mode: "demo",
    summary: "One claim needs separate supporting evidence.",
    findings: [
      {
        ...validFinding,
        id: "finding-1",
        reviewerState: "pending",
      },
    ],
    questions: ["What supplied evidence supports this claim?"],
    extractionWarnings: [],
    createdAt: "2026-08-11T00:00:00.000Z",
    updatedAt: "2026-08-11T00:00:00.000Z",
  };
  assert.equal(analysisResultSchema.safeParse(analysis).success, true);
  assert.equal(
    analysisResultSchema.safeParse({
      ...analysis,
      findings: [{ ...analysis.findings[0], reviewerState: "published" }],
    }).success,
    false,
  );
});
