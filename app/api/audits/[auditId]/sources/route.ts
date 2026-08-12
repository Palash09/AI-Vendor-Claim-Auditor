import { and, count, eq } from "drizzle-orm";
import { getReviewer } from "@/app/reviewer-auth";
import { getDb } from "@/db";
import { ensureSchema } from "@/db/ensure-schema";
import { audits, sources } from "@/db/schema";
import { urlSourceSchema } from "@/lib/audit-schema";
import { putEvidenceFile } from "@/lib/evidence-storage";
import { jsonError, validationError } from "@/lib/http";
import { refreshedExpiry } from "@/lib/retention";

const MAX_SOURCE_COUNT = 3;
// Netlify Functions base64-encode binary requests and effectively cap them at
// about 4.5 MB. Keep room for multipart form metadata.
const MAX_FILE_BYTES = 4 * 1_024 * 1_024;
const ACCEPTED_FILE_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
]);

type RouteContext = { params: Promise<{ auditId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const user = await getReviewer();
  if (!user) return jsonError("Sign in to add evidence.", 401);

  await ensureSchema();
  const { auditId } = await context.params;
  const db = getDb();
  const [audit] = await db
    .select()
    .from(audits)
    .where(and(eq(audits.id, auditId), eq(audits.ownerId, user.userId)))
    .limit(1);

  if (!audit) return jsonError("Audit not found.", 404);

  const [sourceCount] = await db
    .select({ value: count() })
    .from(sources)
    .where(
      and(eq(sources.auditId, auditId), eq(sources.ownerId, user.userId)),
    );

  if ((sourceCount?.value ?? 0) >= MAX_SOURCE_COUNT) {
    return jsonError("This MVP accepts up to three supporting sources.", 409);
  }

  const contentType = request.headers.get("content-type") ?? "";
  const now = new Date();
  const sourceId = crypto.randomUUID();

  if (contentType.includes("application/json")) {
    const result = urlSourceSchema.safeParse(await request.json());
    if (!result.success) return validationError(result.error);

    const source = {
      id: sourceId,
      auditId,
      ownerId: user.userId,
      kind: "url" as const,
      title: new URL(result.data.url).hostname,
      url: result.data.url,
      originalFileName: null,
      storageKey: null,
      contentType: null,
      sizeBytes: null,
      status: "pending" as const,
      createdAt: now.toISOString(),
    };
    await db.insert(sources).values(source);
    await touchAudit(db, audit, now);
    return Response.json({ source }, { status: 201 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return jsonError("Choose a file to upload.");
  if (!ACCEPTED_FILE_TYPES.has(file.type)) {
    return jsonError("Use a PDF, TXT, or Markdown file.", 415);
  }
  if (file.size > MAX_FILE_BYTES) {
    return jsonError("Files must be 4 MB or smaller on the free pilot.", 413);
  }
  const storageKey = `audits/${auditId}/${sourceId}`;
  await putEvidenceFile(storageKey, file, { ownerId: user.userId, auditId });

  const source = {
    id: sourceId,
    auditId,
    ownerId: user.userId,
    kind: "file" as const,
    title: file.name,
    url: null,
    originalFileName: file.name,
    storageKey,
    contentType: file.type,
    sizeBytes: file.size,
    status: "uploaded" as const,
    createdAt: now.toISOString(),
  };
  await db.insert(sources).values(source);
  await touchAudit(db, audit, now);

  return Response.json({ source }, { status: 201 });
}

async function touchAudit(
  db: ReturnType<typeof getDb>,
  audit: typeof audits.$inferSelect,
  now: Date,
) {
  await db
    .update(audits)
    .set({
      currentStep: Math.max(audit.currentStep, 3),
      updatedAt: now.toISOString(),
      expiresAt: refreshedExpiry(audit.createdAt, now),
    })
    .where(and(eq(audits.id, audit.id), eq(audits.ownerId, audit.ownerId)));
}
