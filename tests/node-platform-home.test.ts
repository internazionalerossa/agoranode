import test from "node:test";
import assert from "node:assert/strict";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import AgoraNodeHome from "../app/components/AgoraNodeHome";
import NodeDirectory from "../app/components/NodeDirectory";

const html = renderToStaticMarkup(createElement(AgoraNodeHome));
const directory = renderToStaticMarkup(createElement(NodeDirectory));

test("the service root is a directory with Agorà and PolisRossa in the requested order", () => {
  assert.ok(directory.indexOf('href="/agora"') < directory.indexOf('href="/polisrossa"'));
  assert.match(directory, /Agorà/);
  assert.match(directory, /PolisRossa/);
  assert.match(directory, /href="\/agora"/);
  assert.match(directory, /href="\/polisrossa"/);
  assert.match(directory, /Tecnologia, software libero, architettura e infrastruttura AgoràNode/);
  assert.match(directory, /Storia, attualità, cultura e dati delle sinistre e dei movimenti sociali internazionali/);
  assert.match(directory, /Nodo in costruzione/);
  assert.match(directory, /Nodo tematico disponibile/);
  assert.match(directory, /Trova un nodo/);
  assert.match(directory, /Cerca tra i nodi disponibili/);
  assert.match(directory, /Scegli una piazza oppure cerca un argomento/);
  assert.match(directory, /Ospitare una copia/);
  assert.match(directory, /href="https:\/\/github\.com\/internazionalerossa\/agoranode\/blob\/main\/docs\/SELF-HOSTING\.md"/);
  assert.match(directory, /Ogni campo del sapere può avere la sua piazza/);
  assert.match(directory, /Questi sono esempi di comunità possibili, non siti già attivi/);
  assert.match(directory, /Scienze e matematica/);
  assert.match(directory, /Musica/);
  assert.match(directory, /\d+ esempi di temi; l’elenco non è un catalogo esaustivo/);
  assert.match(directory, /Cerca anche un tema non ancora elencato per visualizzarlo come idea/);
});

test("the AgoràNode overview distinguishes the shared infrastructure from thematic nodes", () => {
  assert.match(html, /AgoràNode è la tecnologia comune/);
  assert.match(html, /le scelte tematiche restano ai rispettivi nodi/);
  assert.doesNotMatch(html, /AgoràNode è la piattaforma principale/);
  assert.doesNotMatch(html, /PolisRossa è un’istanza/);
  assert.match(html, /href="\/"/);
  assert.match(html, /Agorà <small>— AgoràNode<\/small>/);
  assert.match(html, /href="\/polisrossa"/);
  assert.match(html, /PolisRossa/);
  assert.match(html, /Governo federale AgoràNode/);
  assert.match(html, /Caricamento del registro federale/);
});

test("the public hierarchy separates participation from hosting power", () => {
  assert.match(html, /PR1/);
  assert.match(html, /PR2/);
  assert.match(html, /PR3/);
  assert.match(html, /Ospitare non dà potere politico/);
  assert.match(html, /non deriva dal possesso di un server/);
});
