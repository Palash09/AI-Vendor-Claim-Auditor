import { and, eq } from "drizzle-orm";
import { getReviewer } from "@/app/reviewer-auth";
import { getDb } from "@/db";
import { ensureSchema } from "@/db/ensure-schema";
import { analysisResults, audits, sourceFragments, sources } from "@/db/schema";
import { parseAnalysisResult } from "@/lib/analysis-storage";
import { updateAuditSchema } from "@/lib/audit-schema";
import { deleteEvidenceFiles } from "@/lib/evidence-storage";
import { jsonError, validationError } from "@/lib/http";
import { refreshedExpiry } from "@/lib/retention";

type RouteContext = { params: Promise<{ auditId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getReviewer();
  if (!user) return jsonError("Sign in to view this audit.", 401);

  await ensureSchema();
  const { auditId } = await context.params;
  const db = getDb();
  const [audit] = await db
    .select()
    .from(audits)
    .where(and(eq(audits.id, auditId), eq(audits.ownerId, user.userId)))
    .limit(1);

  if (!audit) return jsonError("Audit not found.", 404);

  const sourceRecords = await db
    .select()
    .from(sources)
    .where(
      and(eq(sources.auditId, auditId), eq(sources.ownerId, user.userId)),
    );

  const [analysisRecord] = await db
    .select()
    .from(analysisResults)
    .where(
      and(
        eq(analysisResults.auditId, auditId),
        eq(analysisResults.ownerId, user.userId),
      ),
    )
    .limit(1);

  const fragmentRecords = await db
    .select({
      id: sourceFragments.id,
      sourceId: sourceFragments.sourceId,
      sourceTitle: sourceFragments.sourceTitle,
      sourceLocation: sourceFragments.sourceLocation,
      text: sourceFragments.text,
    })
    .from(sourceFragments)
    .where(
      and(
        eq(sourceFragments.auditId, auditId),
        eq(sourceFragments.ownerId, user.userId),
      ),
    );

  return Response.json({
    audit,
    sources: sourceRecords,
    analysis: analysisRecord ? parseAnalysisResult(analysisRecord) : null,
    fragments: fragmentRecords,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getReviewer();
  if (!user) return jsonError("Sign in to update this audit.", 401);

  const result = updateAuditSchema.safeParse(await request.json());
  if (!result.success) return validationError(result.error);

  await ensureSchema();
  const { auditId } = await context.params;
  const db = getDb();
  const [existing] = await db
    .select()
    .from(audits)
    .where(and(eq(audits.id, auditId), eq(audits.ownerId, user.userId)))
    .limit(1);

  if (!existing) return jsonError("Audit not found.", 404);

  const now = new Date();
  const updates =
    result.data.section === "vendor"
      ? {
          vendorName: result.data.vendorName,
          productUrl: result.data.productUrl || null,
          productDescription: result.data.productDescription || null,
          currentStep: Math.max(existing.currentStep, 2),
        }
      : result.data.section === "context"
        ? {
            intendedUse: result.data.intendedUse,
            dataSensitivity: result.data.dataSensitivity,
            decisionImpact: result.data.decisionImpact,
            assumptions: result.data.assumptions,
            currentStep: Math.max(existing.currentStep, 3),
          }
        : { currentStep: result.data.currentStep };
  const [updated] = await db
    .update(audits)
    .set({
      ...updates,
      updatedAt: now.toISOString(),
      expiresAt: refreshedExpiry(existing.createdAt, now),
    })
    .where(and(eq(audits.id, auditId), eq(audits.ownerId, user.userId)))
    .returning();

  return Response.json({ audit: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getReviewer();
  if (!user) return jsonError("Sign in to delete this audit.", 401);

  await ensureSchema();
  const { auditId } = await context.params;
  const db = getDb();
  const sourceRecords = await db
    .select({ storageKey: sources.storageKey })
    .from(sources)
    .where(
      and(eq(sources.auditId, auditId), eq(sources.ownerId, user.userId)),
    );

  const deleted = await db
    .delete(audits)
    .where(and(eq(audits.id, auditId), eq(audits.ownerId, user.userId)))
    .returning({ id: audits.id });

  if (deleted.length === 0) return jsonError("Audit not found.", 404);

  const keys = sourceRecords.flatMap((source) =>
    source.storageKey ? [source.storageKey] : [],
  );
  if (keys.length > 0) {
    await deleteEvidenceFiles(keys);
  }

  return new Response(null, { status: 204 });
}
