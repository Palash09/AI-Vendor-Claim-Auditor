import { desc, eq } from "drizzle-orm";
import { getReviewer } from "@/app/reviewer-auth";
import { getDb } from "@/db";
import { ensureSchema } from "@/db/ensure-schema";
import { audits } from "@/db/schema";
import { createAuditSchema } from "@/lib/audit-schema";
import { jsonError, validationError } from "@/lib/http";
import { initialExpiry } from "@/lib/retention";

export async function GET() {
  const user = await getReviewer();
  if (!user) return jsonError("Sign in to view audits.", 401);

  await ensureSchema();
  const db = getDb();
  const records = await db
    .select()
    .from(audits)
    .where(eq(audits.ownerId, user.userId))
    .orderBy(desc(audits.updatedAt))
    .limit(10);

  return Response.json({ audits: records });
}

export async function POST(request: Request) {
  const user = await getReviewer();
  if (!user) return jsonError("Sign in to create an audit.", 401);

  const result = createAuditSchema.safeParse(await request.json());
  if (!result.success) return validationError(result.error);

  await ensureSchema();
  const db = getDb();
  const now = new Date();
  const record = {
    id: crypto.randomUUID(),
    ownerId: user.userId,
    vendorName: result.data.vendorName,
    productUrl: result.data.productUrl || null,
    productDescription: result.data.productDescription || null,
    intendedUse: null,
    dataSensitivity: null,
    decisionImpact: null,
    assumptions: "",
    status: "draft" as const,
    currentStep: 2,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: initialExpiry(now),
  };

  await db.insert(audits).values(record);
  return Response.json({ audit: record }, { status: 201 });
}
