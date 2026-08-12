import { getStore } from "@netlify/blobs";

const STORE_NAME = "private-evidence-files";

function evidenceStore() {
  return getStore({ name: STORE_NAME, consistency: "strong" });
}

export async function putEvidenceFile(
  key: string,
  file: File,
  metadata: { ownerId: string; auditId: string },
) {
  await evidenceStore().set(key, await file.arrayBuffer(), {
    metadata: {
      ...metadata,
      contentType: file.type,
      originalFileName: file.name,
    },
  });
}

export async function getEvidenceFile(key: string): Promise<ArrayBuffer> {
  return evidenceStore().get(key, { type: "arrayBuffer" });
}

export async function deleteEvidenceFile(key: string): Promise<void> {
  await evidenceStore().delete(key);
}

export async function deleteEvidenceFiles(keys: string[]): Promise<void> {
  await Promise.all(keys.map((key) => deleteEvidenceFile(key)));
}
