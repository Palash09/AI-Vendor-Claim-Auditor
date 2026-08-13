import assert from "node:assert/strict";
import test from "node:test";
import { scopeEvidenceFragments } from "../lib/evidence-extraction.ts";

const fragment = {
  id: "product-url-p1-1",
  sourceId: "product-url",
  sourceTitle: "Product page",
  sourceLocation: "Paragraph 1",
  text: "A material vendor claim from the supplied product page.",
};

test("scopes deterministic fragment IDs to their audit", () => {
  const [first] = scopeEvidenceFragments("audit-1", [fragment]);
  const [second] = scopeEvidenceFragments("audit-2", [fragment]);

  assert.equal(first.id, "audit-1:product-url-p1-1");
  assert.equal(second.id, "audit-2:product-url-p1-1");
  assert.notEqual(first.id, second.id);
  assert.equal(first.sourceId, "product-url");
});
