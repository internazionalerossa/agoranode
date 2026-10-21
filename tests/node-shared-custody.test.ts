import test from "node:test";
import assert from "node:assert/strict";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import SharedCustodyView from "../app/components/SharedCustodyView";

const html = renderToStaticMarkup(createElement(SharedCustodyView));

test("the shared-custody page provides a concrete read-only node procedure", () => {
  assert.match(html, /Condividere la custodia, non il comando/);
  assert.match(html, /Node\.js 24 e Docker con Compose/);
  assert.match(html, /init https:\/\/localhost:9443 mirror --project polisrossa-nodo --http-port 9080/);
  assert.match(html, /scripts\/selfhost\.mjs status/);
  assert.match(html, /non richiede modifiche al router, al firewall o al DNS/i);
});
test("the page separates hosting, signing and governance authority", () => {
  assert.match(html, /Tenere acceso un computer non attribuisce diritti editoriali, politici o di voto/);
  assert.match(html, /mandato revocabile/i);
  assert.match(html, /Le decisioni definitive si fermano finché non torna il quorum previsto/);
  assert.match(html, /direzione di progetto, non una garanzia già applicata dal software/);
});

test("the release-only checkpoint and its missing guarantees stay explicit", () => {
  assert.match(html, /CHECKPOINT RELEASE-ONLY/);
  assert.match(html, /snapshot-verify/);
  assert.match(html, /non trasporta né installa il codice/);
  for (const limitation of [
    "replica automatica",
    "failover",
    "quorum",
    "cifratura end-to-end",
  ]) assert.match(html, new RegExp(limitation));
  assert.doesNotMatch(html, /replica automatica (?:è|già) (?:attiva|disponibile|implementata)/i);
});
