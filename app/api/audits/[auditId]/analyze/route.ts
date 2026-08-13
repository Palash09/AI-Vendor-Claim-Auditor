import { and, count, eq, gte } from "drizzle-orm";
import { getReviewer } from "@/app/reviewer-auth";
import { getDb } from "@/db";
import { ensureSchema } from "@/db/ensure-schema";
import {
  analysisResults,
  analysisRuns,
  audits,
  sourceFragments,
  sources,
} from "@/db/schema";
import { analyzeEvidence } from "@/lib/analyze-evidence";
import { toAnalysisRecord } from "@/lib/analysis-storage";
import { extractAuditEvidence } from "@/lib/evidence-extraction";
import { jsonError } from "@/lib/http";
import { refreshedExpiry } from "@/lib/retention";

type RouteContext = { params: Promise<{ auditId: string }> };

const DAILY_REVIEWER_ANALYSIS_LIMIT = 3;
const DAILY_APPLICATION_ANALYSIS_LIMIT = 25;

class AnalysisQuotaError extends Error {}

export async function POST(_request: Request, context: RouteContext) {
  const user = await getReviewer();
  if (!user) return jsonError("Sign in to analyze this audit.", 401);

  await ensureSchema();
  const { auditId } = await context.params;
  const db = getDb();
  const [audit] = await db
    .select()
    .from(audits)
    .where(and(eq(audits.id, auditId), eq(audits.ownerId, user.userId)))
    .limit(1);
  if (!audit) return jsonError("Audit not found.", 404);
  if (!audit.intendedUse || !audit.dataSensitivity || !audit.decisionImpact) {
    return jsonError("Complete the intended-use context before analysis.", 409);
  }

  const sourceRecords = await db
    .select()
    .from(sources)
    .where(and(eq(sources.auditId, auditId), eq(sources.ownerId, user.userId)));
  const startedAt = new Date();
  await db
    .update(audits)
    .set({ status: "extracting", updatedAt: startedAt.toISOString() })
    .where(and(eq(audits.id, auditId), eq(audits.ownerId, user.userId)));

  try {
    const extraction = await extractAuditEvidence(audit, sourceRecords);
    await db
      .delete(sourceFragments)
      .where(
        and(
          eq(sourceFragments.auditId, auditId),
          eq(sourceFragments.ownerId, user.userId),
        ),
      );
    const fragmentRows = extraction.fragments.map((fragment) => ({
      ...fragment,
      auditId,
      ownerId: user.userId,
      createdAt: new Date().toISOString(),
    }));
    for (let offset = 0; offset < fragmentRows.length; offset += 40) {
      await db.insert(sourceFragments).values(fragmentRows.slice(offset, offset + 40));
    }
    await db
      .update(audits)
      .set({ status: "analyzing", updatedAt: new Date().toISOString() })
      .where(and(eq(audits.id, auditId), eq(audits.ownerId, user.userId)));

    if (process.env.OPENAI_ANALYSIS_ENABLED === "true") {
      const requestedAt = new Date().toISOString();
      const dayStart = `${requestedAt.slice(0, 10)}T00:00:00.000Z`;
      const [[reviewerUsage], [applicationUsage]] = await Promise.all([
        db
          .select({ value: count() })
          .from(analysisRuns)
          .where(
            and(
              eq(analysisRuns.ownerId, user.userId),
              gte(analysisRuns.requestedAt, dayStart),
            ),
          ),
        db
          .select({ value: count() })
          .from(analysisRuns)
          .where(gte(analysisRuns.requestedAt, dayStart)),
      ]);
      if (reviewerUsage.value >= DAILY_REVIEWER_ANALYSIS_LIMIT) {
        throw new AnalysisQuotaError(
          "You have reached today’s three-analysis limit. Your packet is saved; try again tomorrow.",
        );
      }
      if (applicationUsage.value >= DAILY_APPLICATION_ANALYSIS_LIMIT) {
        throw new AnalysisQuotaError(
          "The application has reached today’s analysis capacity. Your packet is saved; try again tomorrow.",
        );
      }
      await db.insert(analysisRuns).values({
        id: crypto.randomUUID(),
        auditId,
        ownerId: user.userId,
        requestedAt,
      });
    }

    const generated = await analyzeEvidence(audit, extraction.fragments);
    const now = new Date();
    const record = toAnalysisRecord(
      auditId,
      user.userId,
      { ...generated, extractionWarnings: extraction.warnings },
      now.toISOString(),
    );
    await db
      .insert(analysisResults)
      .values(record)
      .onConflictDoUpdate({
        target: analysisResults.auditId,
        set: {
          mode: record.mode,
          summary: record.summary,
          findingsJson: record.findingsJson,
          questionsJson: record.questionsJson,
          extractionWarningsJson: record.extractionWarningsJson,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        },
      });
    const [updatedAudit] = await db
      .update(audits)
      .set({
        status: "review_required",
        currentStep: 4,
        updatedAt: now.toISOString(),
        expiresAt: refreshedExpiry(audit.createdAt, now),
      })
      .where(and(eq(audits.id, auditId), eq(audits.ownerId, user.userId)))
      .returning();

    return Response.json({
      audit: updatedAudit,
      analysis: {
        ...generated,
        extractionWarnings: extraction.warnings,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
      fragments: extraction.fragments,
    });
  } catch (error) {
    await db
      .update(audits)
      .set({ status: "failed", updatedAt: new Date().toISOString() })
      .where(and(eq(audits.id, auditId), eq(audits.ownerId, user.userId)));
    console.error("Audit analysis failed", error);
    if (error instanceof AnalysisQuotaError) {
      return jsonError(error.message, 429);
    }
    return jsonError(
      "Analysis could not complete. Your packet is still saved; try again.",
      500,
    );
  }
}
