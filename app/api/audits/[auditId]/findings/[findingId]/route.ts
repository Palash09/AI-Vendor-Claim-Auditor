import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getReviewer } from "@/app/reviewer-auth";
import { getDb } from "@/db";
import { ensureSchema } from "@/db/ensure-schema";
import { analysisResults, audits, sourceFragments } from "@/db/schema";
import { parseAnalysisResult } from "@/lib/analysis-storage";
import { reviewedFindingSchema } from "@/lib/finding-validation";
import { jsonError, validationError } from "@/lib/http";
import { refreshedExpiry } from "@/lib/retention";

const updateSchema = z.object({
  reviewerState: z.enum(["pending", "approved", "removed"]).optional(),
  claim: z.string().trim().min(1).max(2_000).optional(),
  rationale: z.string().trim().min(1).max(3_000).optional(),
  buyerRelevance: z.enum(["low", "medium", "high"]).optional(),
  followUpQuestion: z.string().trim().min(1).max(1_000).optional(),
}).refine((value) => Object.values(value).some((item) => item !== undefined), {
  message: "Add at least one finding change.",
});

type RouteContext = { params: Promise<{ auditId: string; findingId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getReviewer();
  if (!user) return jsonError("Sign in to review this finding.", 401);
  const input = updateSchema.safeParse(await request.json());
  if (!input.success) return validationError(input.error);

  await ensureSchema();
  const { auditId, findingId } = await context.params;
  const db = getDb();
  const [record] = await db
    .select()
    .from(analysisResults)
    .where(
      and(
        eq(analysisResults.auditId, auditId),
        eq(analysisResults.ownerId, user.userId),
      ),
    )
    .limit(1);
  if (!record) return jsonError("Analysis not found.", 404);
  const analysis = parseAnalysisResult(record);
  if (!analysis) return jsonError("Stored analysis is invalid.", 500);
  const finding = analysis.findings.find((item) => item.id === findingId);
  if (!finding) return jsonError("Finding not found.", 404);

  const hasContentEdits =
    input.data.claim !== undefined ||
    input.data.rationale !== undefined ||
    input.data.buyerRelevance !== undefined ||
    input.data.followUpQuestion !== undefined;
  const candidate = {
    ...finding,
    ...input.data,
    reviewerState: hasContentEdits
      ? ("pending" as const)
      : (input.data.reviewerState ?? finding.reviewerState),
  };
  const validated = reviewedFindingSchema.safeParse(candidate);
  if (!validated.success) return validationError(validated.error);

  const citedFragmentIds = [
    validated.data.claimCitation.fragmentId,
    ...validated.data.evidenceCitations.map((citation) => citation.fragmentId),
  ];
  const fragments = await db
    .select()
    .from(sourceFragments)
    .where(
      and(
        eq(sourceFragments.auditId, auditId),
        eq(sourceFragments.ownerId, user.userId),
      ),
    );
  const citations = [
    validated.data.claimCitation,
    ...validated.data.evidenceCitations,
  ];
  const citationsResolve =
    citedFragmentIds.length === citations.length &&
    citations.every((citation) => {
      const fragment = fragments.find(
        (item) =>
          item.id === citation.fragmentId && item.sourceId === citation.sourceId,
      );
      return (
        fragment &&
        fragment.sourceTitle === citation.sourceTitle &&
        fragment.sourceLocation === citation.sourceLocation &&
        fragment.text.includes(citation.sourceQuote)
      );
    });
  if (!citationsResolve) {
    return jsonError("This finding no longer resolves to its supplied source text.", 409);
  }

  analysis.findings = analysis.findings.map((item) =>
    item.id === findingId ? validated.data : item,
  );
  const now = new Date().toISOString();
  await db
    .update(analysisResults)
    .set({ findingsJson: JSON.stringify(analysis.findings), updatedAt: now })
    .where(
      and(
        eq(analysisResults.auditId, auditId),
        eq(analysisResults.ownerId, user.userId),
      ),
    );

  const [audit] = await db
    .select()
    .from(audits)
    .where(and(eq(audits.id, auditId), eq(audits.ownerId, user.userId)))
    .limit(1);
  if (audit) {
    await db
      .update(audits)
      .set({
        status: "review_required",
        updatedAt: now,
        expiresAt: refreshedExpiry(audit.createdAt, new Date(now)),
      })
      .where(and(eq(audits.id, auditId), eq(audits.ownerId, user.userId)));
  }

  return Response.json({ finding: validated.data, auditStatus: "review_required", updatedAt: now });
}
