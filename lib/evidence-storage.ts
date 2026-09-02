import { del, get, put } from "@vercel/blob";

export async function putEvidenceFile(
  key: string,
  file: File,
  metadata: { ownerId: string; auditId: string },
) {
  const expectedPrefix = `audits/${metadata.auditId}/`;
  if (!key.startsWith(expectedPrefix)) {
    throw new Error("Evidence storage key does not match its audit.");
  }

  await put(key, file, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: false,
    cacheControlMaxAge: 60,
    contentType: file.type,
  });
}

export async function getEvidenceFile(key: string): Promise<ArrayBuffer> {
  const result = await get(key, { access: "private" });
  if (!result || result.statusCode !== 200) {
    throw new Error("Evidence file is unavailable.");
  }

  return new Response(result.stream).arrayBuffer();
}

export async function deleteEvidenceFile(key: string): Promise<void> {
  await del(key);
}

export async function deleteEvidenceFiles(keys: string[]): Promise<void> {
  if (keys.length > 0) {
    await del(keys);
  }
}
