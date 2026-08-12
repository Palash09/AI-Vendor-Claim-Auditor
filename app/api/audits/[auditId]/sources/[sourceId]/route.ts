import { and, eq } from "drizzle-orm";
import { getReviewer } from "@/app/reviewer-auth";
import { getDb } from "@/db";
import { ensureSchema } from "@/db/ensure-schema";
import { sources } from "@/db/schema";
import { deleteEvidenceFile } from "@/lib/evidence-storage";
import { jsonError } from "@/lib/http";

type RouteContext = {
  params: Promise<{ auditId: string; sourceId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getReviewer();
  if (!user) return jsonError("Sign in to remove evidence.", 401);

  await ensureSchema();
  const { auditId, sourceId } = await context.params;
  const db = getDb();
  const [source] = await db
    .select()
    .from(sources)
    .where(
      and(
        eq(sources.id, sourceId),
        eq(sources.auditId, auditId),
        eq(sources.ownerId, user.userId),
      ),
    )
    .limit(1);

  if (!source) return jsonError("Source not found.", 404);
  if (source.storageKey) {
    await deleteEvidenceFile(source.storageKey);
  }

  await db
    .delete(sources)
    .where(
      and(
        eq(sources.id, sourceId),
        eq(sources.auditId, auditId),
        eq(sources.ownerId, user.userId),
      ),
    );

  return new Response(null, { status: 204 });
}
