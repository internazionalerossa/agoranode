import test from "node:test";
import assert from "node:assert/strict";
import { knowledgeEntityUrl, knowledgeSelectionFromUrl } from "../app/lib/knowledge-navigation.ts";
import { viewFromUrl, viewUrl } from "../app/lib/view-navigation.ts";

test("structured knowledge links open in the existing PolisRossa timeline experience", () => {
  const url = knowledgeEntityUrl("concept", "collective-memory");
  assert.equal(
    url,
    "/polisrossa?view=teoria&percorso=timeline&knowledgeKind=concept&knowledgeId=collective-memory",
  );
  assert.equal(viewFromUrl(`https://site.test${url}`), "teoria");
  assert.deepEqual(knowledgeSelectionFromUrl(`https://site.test${url}`), {
    kind: "concept",
    id: "collective-memory",
  });
  assert.equal(
    viewUrl(`https://site.test${url}`, "notizie"),
    "/polisrossa",
  );
});

test("knowledge links reject malformed and partial identities", () => {
  assert.throws(() => knowledgeEntityUrl("Concept", "collective-memory"));
  assert.throws(() => knowledgeEntityUrl("concept", "../other"));
  assert.equal(
    knowledgeSelectionFromUrl(
      "https://site.test/polisrossa?knowledgeKind=concept",
    ),
    null,
  );
  assert.equal(
    knowledgeSelectionFromUrl(
      "https://site.test/polisrossa?knowledgeKind=concept&knowledgeKind=event&knowledgeId=item",
    ),
    null,
  );
});
