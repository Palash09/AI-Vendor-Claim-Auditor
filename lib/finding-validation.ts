import { z } from "zod";

export const EVIDENCE_STATUSES = [
  "Supported by supplied evidence",
  "Partially supported",
  "No evidence found in supplied materials",
  "Conflicting disclosure",
  "Not assessable from supplied materials",
] as const;

const citationSchema = z.object({
  sourceId: z.string().min(1),
  fragmentId: z.string().min(1),
  sourceTitle: z.string().min(1),
  sourceLocation: z.string().min(1),
  sourceQuote: z.string().min(1),
});

const generatedTextSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !/\b(?:safe|compliant|approved|rejected|deceptive|untrustworthy)\b/i.test(
        value,
      ),
    "Generated findings cannot contain unsupported verdict language.",
  );

export const findingSchema = z
  .object({
    claim: z.string().min(1),
    claimType: z.enum([
      "customer_data_training",
      "retention_deletion_access",
      "model_provider_dependencies",
      "performance_limitations",
      "oversight_incidents_change_notification",
    ]),
    claimCitation: citationSchema,
    evidenceStatus: z.enum(EVIDENCE_STATUSES),
    evidenceCitations: z.array(citationSchema),
    rationale: generatedTextSchema,
    buyerRelevance: z.enum(["low", "medium", "high"]),
    followUpQuestion: generatedTextSchema.optional(),
  })
  .superRefine((finding, context) => {
    const explicitAbsence =
      finding.evidenceStatus === "No evidence found in supplied materials" ||
      finding.evidenceStatus === "Not assessable from supplied materials";

    if (!explicitAbsence && finding.evidenceCitations.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["evidenceCitations"],
        message: "This evidence status requires at least one evidence citation.",
      });
    }
  });

export type Finding = z.infer<typeof findingSchema>;

export const reviewerStates = ["pending", "approved", "removed"] as const;

export const reviewedFindingSchema = findingSchema.safeExtend({
  id: z.string().min(1),
  reviewerState: z.enum(reviewerStates),
});

export const analysisResultSchema = z.object({
  mode: z.enum(["openai", "demo"]),
  summary: z.string().min(1),
  findings: z.array(reviewedFindingSchema),
  questions: z.array(z.string().min(1)).max(5),
  extractionWarnings: z.array(z.string().min(1)),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type ReviewedFinding = z.infer<typeof reviewedFindingSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
