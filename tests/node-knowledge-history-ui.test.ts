import test from "node:test";
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  KnowledgeRevisionHistoryPanel,
  type KnowledgeHistoryPanelState,
} from "../app/components/KnowledgeRevisionHistory";
import { LocalizationProvider } from "../app/components/Localization";
import {
  PUBLIC_KNOWLEDGE_HISTORY_FORMAT,
  isPublicKnowledgeHistory,
  type PublicKnowledgeHistory,
} from "../app/lib/public-knowledge";

const currentHash = "a".repeat(64);
const previousHash = "b".repeat(64);
const publicationHash = "c".repeat(64);
const licenseHash = "d".repeat(64);

const history: PublicKnowledgeHistory = {
  format: PUBLIC_KNOWLEDGE_HISTORY_FORMAT,
  current: {
    entitySha256: "e".repeat(64),
    revisionSha256: currentHash,
    identity: {
      spaceId: "polisrossa",
      kind: "event",
      id: "evento-pubblico",
      locale: "it",
    },
    sourceType: "community-contribution",
    rights: {
      status: "reuse-not-documented",
      licenseSpdx: null,
      attribution: "Autrice pubblica",
      reuseAllowed: false,
    },
    content: { title: "Evento pubblico" },
    sources: [],
    relations: [],
  },
  revisions: [
    {
      revisionSha256: currentHash,
      publicationRecordSha256: publicationHash,
      publicLicenseSha256: licenseHash,
      current: true,
      sourceType: "community-contribution",
      rights: {
        status: "reuse-not-documented",
        licenseSpdx: null,
        attribution: "Autrice pubblica",
        reuseAllowed: false,
      },
      publicationKind: "community-contribution",
      author: { publicId: "autrice-pubblica", displayName: "Autrice pubblica" },
      publicLicense: { id: "CC-BY-ND-4.0" },
      licenseScope: "submitted-contribution-only",
      previousRevisionSha256: previousHash,
      request: {
        forumTopicId: "123e4567-e89b-42d3-a456-426614174000",
        forumTopicUrl:
          "/polisrossa?view=partecipa&proposal=123e4567-e89b-42d3-a456-426614174000",
        requestedBy: {
          publicId: "proponente-pubblico",
          displayName: "Proponente pubblico",
        },
      },
      decision: {
        id: "decisione-pubblica-1",
        method: "approval",
        result: "approved",
        decidedAt: "2026-10-21T12:30:00.000Z",
      },
    },
    {
      revisionSha256: previousHash,
      publicationRecordSha256: "f".repeat(64),
      publicLicenseSha256: null,
      current: false,
      sourceType: "repository-seed",
      rights: {
        status: "reuse-not-documented",
        licenseSpdx: null,
        attribution: "PolisRossa",
        reuseAllowed: false,
      },
      publicationKind: "repository-seed",
      author: { publicId: "polisrossa", displayName: "PolisRossa" },
      publicLicense: null,
      licenseScope: null,
      previousRevisionSha256: null,
      request: null,
      decision: {
        id: null,
        method: "repository-review",
        result: "approved",
        decidedAt: null,
      },
    },
  ],
};

function render(state: KnowledgeHistoryPanelState, onRetry?: () => void) {
  return renderToStaticMarkup(
    h(
      LocalizationProvider,
      {
        language: "it",
        children: h(KnowledgeRevisionHistoryPanel, { state, onRetry }),
      },
    ),
  );
}

test("the revision panel renders authorship, license, predecessor, request and approval provenance", () => {
  const html = render({ status: "ready", history });
  assert.match(html, /Storico delle modifiche/);
  assert.match(html, /Autrice pubblica/);
  assert.match(html, /autrice-pubblica/);
  assert.match(html, /CC-BY-ND-4.0/);
  assert.match(html, /solo contributo di questa revisione/);
  assert.match(html, new RegExp(`${previousHash.slice(0, 12)}…`));
  assert.match(html, /Proponente pubblico/);
  assert.match(html, /proponente-pubblico/);
  assert.match(
    html,
    /\?view=partecipa&amp;proposal=123e4567-e89b-42d3-a456-426614174000/,
  );
  assert.match(html, /voto per approvazione/);
  assert.match(html, /esito approvato/);
  assert.match(html, /2026-10-21T12:30:00.000Z/);
  assert.match(html, /Diritti di riuso non documentati/);
  assert.match(html, /Importazione iniziale revisionata nel repository/);
  assert.doesNotMatch(html, /email|token|owner_id|session_id/i);
});

test("loading, empty and failure states are accessible and explicit", () => {
  const loading = render({ status: "loading" });
  assert.match(loading, /role="status" aria-live="polite"/);
  assert.match(loading, /Caricamento della cronologia/);
  const empty = render({ status: "empty" });
  assert.match(empty, /role="status"/);
  assert.match(empty, /non è ancora disponibile/);
  const failure = render({ status: "failure" }, () => {});
  assert.match(failure, /role="alert"/);
  assert.match(failure, /La cronologia non è disponibile/);
  assert.match(failure, /<button type="button"/);
  assert.match(failure, /Riprova/);
});

test("the browser contract accepts the expected identity and rejects a substituted entity", () => {
  assert.equal(
    isPublicKnowledgeHistory(history, {
      kind: "event",
      id: "evento-pubblico",
      locale: "it",
    }),
    true,
  );
  assert.equal(
    isPublicKnowledgeHistory(history, {
      kind: "person",
      id: "evento-pubblico",
      locale: "it",
    }),
    false,
  );
  assert.equal(
    isPublicKnowledgeHistory(
      {
        ...history,
        current: {
          ...history.current,
          identity: { ...history.current.identity, kind: "concept" },
        },
      },
      {
        kind: "concept",
        id: "evento-pubblico",
        locale: "it",
      },
    ),
    true,
  );
});
