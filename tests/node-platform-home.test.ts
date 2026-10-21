import test from "node:test";
import assert from "node:assert/strict";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import AgoraNodeHome from "../app/components/AgoraNodeHome";

const html = renderToStaticMarkup(createElement(AgoraNodeHome));

test("the product root identifies AgoràNode as principal and PolisRossa as an instance", () => {
  assert.match(html, /AgoràNode è la piattaforma principale/);
  assert.match(html, /PolisRossa è un’istanza/);
  assert.match(html, /href="\/polisrossa"/);
  assert.match(html, /Apri PolisRossa/);
  assert.match(html, /Questa è la home principale di AgoràNode/);
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
