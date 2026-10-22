import test from "node:test";
import assert from "node:assert/strict";
import {isAppShellPath, siteRouteFromUrl} from "../app/lib/site-routing";

test("the root lists nodes while Agorà and PolisRossa have distinct namespaces", () => {
  assert.deepEqual(siteRouteFromUrl("https://example.test/"), {kind: "platform", canonicalPath: "/"});
  assert.deepEqual(siteRouteFromUrl("https://example.test/agoranode"), {kind: "platform", canonicalPath: "/"});
  assert.deepEqual(siteRouteFromUrl("https://example.test/agora"), {kind: "agora", canonicalPath: "/agora"});
  assert.deepEqual(siteRouteFromUrl("https://example.test/agora?section=protocol#release"), {kind: "agora", canonicalPath: "/agora?section=protocol#release"});
  assert.deepEqual(siteRouteFromUrl("https://example.test/polisrossa"), {kind: "instance", canonicalPath: "/polisrossa"});
  assert.deepEqual(siteRouteFromUrl("https://example.test/polisrossa?view=partecipa"), {kind: "instance", canonicalPath: "/polisrossa?view=partecipa"});
});

test("historic PolisRossa links are canonicalized without dropping their state", () => {
  assert.deepEqual(siteRouteFromUrl("https://example.test/?view=teoria&evento=haymarket-1886#detail"), {
    kind: "instance",
    canonicalPath: "/polisrossa?view=teoria&evento=haymarket-1886#detail",
  });
  assert.deepEqual(siteRouteFromUrl("https://example.test/read?book=manifesto&edition=it"), {
    kind: "reader",
    canonicalPath: "/polisrossa/read?book=manifesto&edition=it",
  });
  assert.deepEqual(siteRouteFromUrl("https://example.test/account?return_to=%2Fpolisrossa"), {
    kind: "account",
    canonicalPath: "/polisrossa/account?return_to=%2Fpolisrossa",
  });
});

test("the former custody view resolves to the platform rather than the instance", () => {
  assert.deepEqual(siteRouteFromUrl("https://example.test/?view=custodia"), {kind: "platform", canonicalPath: "/"});
  assert.deepEqual(siteRouteFromUrl("https://example.test/polisrossa?view=custodia"), {kind: "platform", canonicalPath: "/"});
});


test("production SPA entrypoints serve Agorà and PolisRossa but unknown paths stay 404", () => {
  for (const path of ['/', '/agora', '/agora/', '/polisrossa', '/polisrossa/', '/polisrossa/read', '/polisrossa/account', '/agoranode', '/read', '/account']) {
    assert.equal(isAppShellPath(path), true, path);
  }
  for (const path of ['/not-found', '/agora/private', '/api/nodes', '/api/instance', '//evil', '/polisrossa/foo']) {
    assert.equal(isAppShellPath(path), false, path);
  }
});
