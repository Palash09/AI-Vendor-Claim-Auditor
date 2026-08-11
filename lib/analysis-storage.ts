import type { analysisResults } from "@/db/schema";
import {
  analysisResultSchema,
  type AnalysisResult,
  type ReviewedFinding,
} from "@/lib/finding-validation";

export function parseAnalysisResult(
  record: typeof analysisResults.$inferSelect,
): AnalysisResult | null {
  const result = analysisResultSchema.safeParse({
    mode: record.mode,
    summary: record.summary,
    findings: safeJson<ReviewedFinding[]>(record.findingsJson, []),
    questions: safeJson<string[]>(record.questionsJson, []),
    extractionWarnings: safeJson<string[]>(record.extractionWarningsJson, []),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  });
  return result.success ? result.data : null;
}

export function toAnalysisRecord(
  auditId: string,
  ownerId: string,
  result: Omit<AnalysisResult, "createdAt" | "updatedAt">,
  createdAt: string,
  updatedAt = createdAt,
) {
  return {
    auditId,
    ownerId,
    mode: result.mode,
    summary: result.summary,
    findingsJson: JSON.stringify(result.findings),
    questionsJson: JSON.stringify(result.questions),
    extractionWarningsJson: JSON.stringify(result.extractionWarnings),
    createdAt,
    updatedAt,
  };
}

function safeJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
