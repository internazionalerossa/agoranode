import test from "node:test";
import assert from "node:assert/strict";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import SharedCustodyView from "../app/components/SharedCustodyView";
import AgoraNodeIdentityLink from "../app/components/AgoraNodeIdentityLink";

const html = renderToStaticMarkup(createElement(SharedCustodyView));

test("the shared-custody page provides a concrete read-only node procedure", () => {
  assert.match(html, /Un formato comune, molti nodi governati dalle loro comunità/);
  assert.match(html, /Node\.js 24 e Docker con Compose/);
  assert.match(html, /init https:\/\/localhost:9443 mirror --project polisrossa-nodo --http-port 9080/);
  assert.match(html, /scripts\/selfhost\.mjs status/);
  assert.match(html, /non richiede modifiche al router, al firewall o al DNS/i);
});

test("the AgoràNode format and separate governance scopes are explicit", () => {
  for (const capability of [
    "Notizie scritte e video",
    "Biblioteca e wiki",
    "Storyline dell’argomento",
    "Dati e confronti storici",
    "Forum democratico",
    "Custodia portabile",
  ]) assert.match(html, new RegExp(capability));
  assert.match(html, /La home è il portale che oggi permette di cercare i percorsi locali Agorà — AgoràNode e PolisRossa — AgoràNode/);
  assert.match(html, /non offre ancora tutte le superfici editoriali di PolisRossa/);
  assert.match(html, /il forum PolisRossa resta nel proprio ambito/);
  assert.match(html, /Account, forum ed elezioni PR3 non vengono dichiarati aperti/);
});

test("the header identity statement points to the real AgoràNode page", () => {
  const link = renderToStaticMarkup(createElement(AgoraNodeIdentityLink));
  assert.match(link, /href="\/"/);
  assert.match(link, />PolisRossa è un nodo AgoràNode</);
  assert.match(link, /aria-label="PolisRossa è un nodo AgoràNode: vai alla pagina AgoràNode"/);
});

test("PolisRossa preservation is strong but never overstated", () => {
  assert.match(html, /64 eventi e 17 persone/);
  assert.match(html, /autore, richiedente, discussione, metodo ed esito dell.approvazione/);
  assert.match(html, /non richiede né cerca compatibilità con Wikipedia/);
  assert.match(html, /ogni autore sceglierà la licenza del proprio contributo/);
  assert.match(html, /separata dal grant editoriale AgoràNode/);
  assert.match(html, /Il grant è ancora una bozza/);
  assert.match(html, /non si può inviare una modifica enciclopedica dal sito/);
  assert.match(html, /non offrono una cancellazione distruttiva/);
  assert.match(html, /dati personali non entrano nell’archivio pubblico/);
  assert.match(html, /non sono implementate/);
  assert.doesNotMatch(html, /impossibile da eliminare[^”"]*(?:garantito|assicurato)/i);
});

test("the current public knowledge store and its exact limits are visible", () => {
  assert.match(html, /deposito pubblico in sola lettura/);
  assert.match(html, /intera cronologia approvata/);
  assert.match(html, /tutte le revisioni immutabili/);
  assert.match(html, /href="\/api\/knowledge\/export"/);
  assert.match(html, /replica pubblica locale verificata/);
  assert.match(html, /Scrittura enciclopedica pubblica/);
});

test("the page separates hosting, signing and governance authority", () => {
  assert.match(html, /Governo comune, non proprietà dell.host/);
  for (const level of ["Assemblea del nodo", "Gruppi di lavoro e mandati", "Coordinamento federale AgoràNode", "Custodi tecnici"]) assert.match(html, new RegExp(level));
  assert.match(html, /non riceve voti aggiuntivi/);
  assert.match(html, /Il runtime PR3 applica già durata, catena append-only e richiamo/);
  assert.match(html, /mandato PR3 verificabile/i);
  assert.match(html, /Le decisioni definitive si fermano finché non torna il quorum previsto/);
  assert.match(html, /Non è quindi il governo già attivo del servizio/);
  assert.match(html, /Un PR2 attivo di qualsiasi nodo federato può presentare una candidatura PR3/);
  assert.match(html, /PR3.*Mandato federale AgoràNode/s);
});

test("the release-only checkpoint and its missing guarantees stay explicit", () => {
  assert.match(html, /CHECKPOINT RELEASE-ONLY/);
  assert.match(html, /snapshot-verify/);
  assert.match(html, /non trasporta né installa il codice/);
  for (const limitation of [
    "rete multi-PC collaudata",
    "failover",
    "cifratura end-to-end",
  ]) assert.match(html, new RegExp(limitation));
  assert.doesNotMatch(html, /rete multi-PC (?:è|già) (?:attiva|disponibile|implementata|collaudata)/i);
});
