import test from "node:test";
import assert from "node:assert/strict";
import {siteRouteFromUrl} from "../app/lib/site-routing";

test("AgoràNode owns the root and PolisRossa owns its instance namespace", () => {
  assert.deepEqual(siteRouteFromUrl("https://example.test/"), {kind: "platform", canonicalPath: "/"});
  assert.deepEqual(siteRouteFromUrl("https://example.test/agoranode"), {kind: "platform", canonicalPath: "/"});
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
