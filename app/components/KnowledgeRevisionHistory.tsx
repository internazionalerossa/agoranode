"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, RotateCcw } from "lucide-react";
import {
  REGISTERED_PUBLIC_LICENSES,
  type PublicLicenseSelection,
} from "@/app/lib/contribution-rights";
import {
  isPublicKnowledgeHistory,
  type PublicKnowledgeHistory,
  type PublicKnowledgeRevision,
} from "@/app/lib/public-knowledge";
import { LocalizedText as T } from "./Localization";

export type KnowledgeHistoryPanelState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "failure" }
  | { status: "ready"; history: PublicKnowledgeHistory };

function shortHash(value: string) {
  return `${value.slice(0, 12)}…`;
}

function decisionMethod(value: PublicKnowledgeRevision["decision"]["method"]) {
  if (value === "repository-review") return "revisione nel repository";
  if (value === "single") return "scelta singola";
  if (value === "ranked") return "voto a preferenze";
  return "voto per approvazione";
}

function publicLicense(selection: PublicLicenseSelection | null) {
  if (!selection) {
    return { label: "Diritti di riuso non documentati", url: null };
  }
  if (selection.id === "custom") {
    return { label: selection.name, url: selection.url };
  }
  const registered = REGISTERED_PUBLIC_LICENSES[selection.id];
  return {
    label:
      selection.id === "all-rights-reserved-with-agoranode-grant"
        ? "Tutti i diritti riservati; permesso AgoràNode separato"
        : selection.id,
    url: registered.canonicalUrl,
  };
}

function Decision({ revision }: { revision: PublicKnowledgeRevision }) {
  const decision = revision.decision;
  return (
    <>
      <span>
        <T>Approvazione</T>
      </span>
      <div>
        <strong>
          <T>{decisionMethod(decision.method)}</T>
        </strong>{" "}
        · <T>esito approvato</T>
        {decision.id && (
          <>
            {" "}· <code>{decision.id}</code>
          </>
        )}
        {decision.decidedAt && (
          <>
            {" "}· <time dateTime={decision.decidedAt}>{decision.decidedAt}</time>
          </>
        )}
      </div>
    </>
  );
}

function Revision({ revision }: { revision: PublicKnowledgeRevision }) {
  const license = publicLicense(revision.publicLicense);
  return (
    <li>
      <article className={revision.current ? "is-current" : undefined}>
        <header>
          <strong>
            <T>{revision.current ? "Revisione attuale" : "Revisione precedente"}</T>
          </strong>
          <code title={revision.revisionSha256}>
            {shortHash(revision.revisionSha256)}
          </code>
        </header>
        <dl>
          <div>
            <dt>
              <T>Autore</T>
            </dt>
            <dd>
              {revision.author.displayName}{" "}
              <small>
                <T>identificativo pubblico</T> <code>{revision.author.publicId}</code>
              </small>
            </dd>
          </div>
          <div>
            <dt>
              <T>Licenza scelta</T>
            </dt>
            <dd>
              {license.url ? (
                <a href={license.url} target="_blank" rel="noopener noreferrer">
                  {license.label}
                  <ArrowUpRight size={12} aria-hidden="true" />
                </a>
              ) : (
                <T>{license.label}</T>
              )}
              {revision.licenseScope && (
                <small>
                  <T>Si applica al solo contributo di questa revisione.</T>
                </small>
              )}
            </dd>
          </div>
          <div>
            <dt>
              <T>Predecessore</T>
            </dt>
            <dd>
              {revision.previousRevisionSha256 ? (
                <code title={revision.previousRevisionSha256}>
                  {shortHash(revision.previousRevisionSha256)}
                </code>
              ) : (
                <T>Nessuno: è la prima revisione registrata.</T>
              )}
            </dd>
          </div>
          <div>
            <dt>
              <T>Richiesta</T>
            </dt>
            <dd>
              {revision.request ? (
                <>
                  {revision.request.requestedBy.displayName}{" "}
                  <small>
                    <T>identificativo pubblico</T>{" "}
                    <code>{revision.request.requestedBy.publicId}</code>
                  </small>
                  <a className="knowledge-discussion-link" href={revision.request.forumTopicUrl}>
                    <T>Apri discussione e voto</T>
                    <ArrowUpRight size={12} aria-hidden="true" />
                  </a>
                </>
              ) : (
                <T>Importazione iniziale revisionata nel repository.</T>
              )}
            </dd>
          </div>
          <div>
            <dt>
              <T>Decisione</T>
            </dt>
            <dd className="knowledge-decision">
              <Decision revision={revision} />
            </dd>
          </div>
        </dl>
      </article>
    </li>
  );
}

export function KnowledgeRevisionHistoryPanel({
  state,
  onRetry,
}: {
  state: KnowledgeHistoryPanelState;
  onRetry?: () => void;
}) {
  return (
    <section className="knowledge-revision-history" aria-labelledby="knowledge-history-title">
      <header>
        <p className="eyebrow">
          <T>TRASPARENZA EDITORIALE</T>
        </p>
        <h2 id="knowledge-history-title">
          <T>Storico delle modifiche</T>
        </h2>
        <p>
          <T>
            Ogni versione pubblicata conserva autore, licenza del contributo,
            richiesta e decisione che l’ha approvata.
          </T>
        </p>
      </header>
      {state.status === "loading" && (
        <p className="knowledge-history-status" role="status" aria-live="polite">
          <T>Caricamento della cronologia…</T>
        </p>
      )}
      {state.status === "empty" && (
        <p className="knowledge-history-status" role="status">
          <T>La cronologia persistente non è ancora disponibile per questa pagina.</T>
        </p>
      )}
      {state.status === "failure" && (
        <div className="knowledge-history-failure" role="alert">
          <p>
            <T>La cronologia non è disponibile in questo momento.</T>
          </p>
          {onRetry && (
            <button type="button" onClick={onRetry}>
              <RotateCcw size={14} aria-hidden="true" />
              <T>Riprova</T>
            </button>
          )}
        </div>
      )}
      {state.status === "ready" && (
        <ol>
          {state.history.revisions.map((revision) => (
            <Revision key={revision.revisionSha256} revision={revision} />
          ))}
        </ol>
      )}
    </section>
  );
}

export default function KnowledgeRevisionHistory({
  kind,
  entityId,
}: {
  kind: string;
  entityId: string;
}) {
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<KnowledgeHistoryPanelState>({
    status: "loading",
  });
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    const query = new URLSearchParams({ kind, id: entityId, locale: "it" });
    void fetch(`/api/knowledge/entity?${query}`, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.any([
        controller.signal,
        AbortSignal.timeout(15000),
      ]),
    })
      .then(async (response) => {
        if (response.status === 404) {
          if (!controller.signal.aborted) setState({ status: "empty" });
          return;
        }
        if (!response.ok) throw new Error("knowledge history unavailable");
        const value: unknown = await response.json();
        if (!isPublicKnowledgeHistory(value, { kind, id: entityId, locale: "it" })) {
          throw new Error("invalid knowledge history response");
        }
        if (!controller.signal.aborted) setState({ status: "ready", history: value });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "failure" });
      });
    return () => controller.abort();
  }, [kind, entityId, retry]);
  return (
    <div data-knowledge-kind={kind} data-knowledge-entity={entityId}>
      <KnowledgeRevisionHistoryPanel
        state={state}
        onRetry={() => setRetry((value) => value + 1)}
      />
    </div>
  );
}
