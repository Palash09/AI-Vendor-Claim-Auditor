import { and, eq } from "drizzle-orm";
import { getReviewer } from "@/app/reviewer-auth";
import { getDb } from "@/db";
import { ensureSchema } from "@/db/ensure-schema";
import { analysisResults, audits } from "@/db/schema";
import { parseAnalysisResult } from "@/lib/analysis-storage";
import { buildDecisionBrief } from "@/lib/decision-brief";
import { jsonError } from "@/lib/http";

type RouteContext = { params: Promise<{ auditId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const user = await getReviewer();
  if (!user) return jsonError("Sign in to export this review.", 401);
  await ensureSchema();
  const { auditId } = await context.params;
  const db = getDb();
  const [audit] = await db
    .select()
    .from(audits)
    .where(and(eq(audits.id, auditId), eq(audits.ownerId, user.userId)))
    .limit(1);
  if (!audit) return jsonError("Audit not found.", 404);
  if (audit.status !== "approved") {
    return jsonError("Complete human review before exporting this brief.", 409);
  }
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
  const analysis = record ? parseAnalysisResult(record) : null;
  if (!analysis) return jsonError("Stored analysis is invalid.", 500);
  const brief = buildDecisionBrief(audit, analysis);
  const filename = `${audit.vendorName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "vendor"}-evidence-brief.md`;
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(brief, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "private, no-store",
      ...(download
        ? { "content-disposition": `attachment; filename="${filename}"` }
        : {}),
    },
  });
}
