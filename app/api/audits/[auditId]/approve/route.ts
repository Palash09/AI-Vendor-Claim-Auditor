import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { ensureSchema } from "@/db/ensure-schema";
import { analysisResults, audits } from "@/db/schema";
import { parseAnalysisResult } from "@/lib/analysis-storage";
import { jsonError } from "@/lib/http";
import { refreshedExpiry } from "@/lib/retention";

type RouteContext = { params: Promise<{ auditId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const user = await getChatGPTUser();
  if (!user) return jsonError("Sign in to complete this review.", 401);
  await ensureSchema();
  const { auditId } = await context.params;
  const db = getDb();
  const [audit] = await db
    .select()
    .from(audits)
    .where(and(eq(audits.id, auditId), eq(audits.ownerId, user.userId)))
    .limit(1);
  if (!audit) return jsonError("Audit not found.", 404);
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
  if (!record) return jsonError("Analyze this packet before completing review.", 409);
  const analysis = parseAnalysisResult(record);
  if (!analysis) return jsonError("Stored analysis is invalid.", 500);
  const retained = analysis.findings.filter((finding) => finding.reviewerState !== "removed");
  if (retained.length === 0) return jsonError("Keep and approve at least one finding.", 409);
  if (retained.some((finding) => finding.reviewerState !== "approved")) {
    return jsonError("Approve or remove every finding before completing review.", 409);
  }

  const now = new Date();
  const [updated] = await db
    .update(audits)
    .set({
      status: "approved",
      updatedAt: now.toISOString(),
      expiresAt: refreshedExpiry(audit.createdAt, now),
    })
    .where(and(eq(audits.id, auditId), eq(audits.ownerId, user.userId)))
    .returning();
  return Response.json({ audit: updated });
}
