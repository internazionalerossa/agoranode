"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, RotateCcw } from "lucide-react";
import {
  isPublicKnowledgeHistory,
  type PublicKnowledgeHistory,
} from "@/app/lib/public-knowledge";
import { knowledgeEntityUrl } from "@/app/lib/knowledge-navigation";
import type { KnowledgeJson } from "@/app/lib/knowledge-model";
import KnowledgeRevisionHistory from "./KnowledgeRevisionHistory";
import WikiProposalEditor from "./WikiProposalEditor";
import { LocalizedText as T } from "./Localization";

type State =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "failure" }
  | { status: "ready"; history: PublicKnowledgeHistory };

function externalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function StructuredValue({
  value,
  label,
}: {
  value: KnowledgeJson;
  label: string;
}): ReactNode {
  if (typeof value === "string") {
    const url = /url$/i.test(label) ? externalUrl(value) : null;
    return url ? (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {value}
        <ArrowUpRight size={13} aria-hidden="true" />
      </a>
    ) : (
      value
    );
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return <T>Non specificato</T>;
  if (Array.isArray(value)) {
    if (!value.length) return <T>Nessun elemento registrato.</T>;
    return (
      <ul>
        {value.map((item, index) => (
          <li key={`${label}-${index}`}>
            <StructuredValue value={item} label={label} />
          </li>
        ))}
      </ul>
    );
  }
  const fields = Object.entries(value).filter(
    ([key]) => key !== "format" && key !== "legacy",
  );
  if (!fields.length) return <T>Nessun dettaglio registrato.</T>;
  return (
    <dl>
      {fields.map(([key, field]) => (
        <div key={key}>
          <dt>{key.replace(/([A-Z])/g, " $1").replace(/[-_]/g, " ")}</dt>
          <dd>
            <StructuredValue value={field} label={key} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function titleFor(history: PublicKnowledgeHistory): string {
  const content = history.current.content;
  const event = content.event;
  for (const candidate of [
    content.title,
    content.name,
    event && typeof event === "object" && !Array.isArray(event)
      ? event.title
      : undefined,
  ]) {
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }
  return history.current.identity.id;
}

function KnowledgeEntry({
  history,
  kind,
  id,
}: {
  history: PublicKnowledgeHistory;
  kind: string;
  id: string;
}) {
  const entity = history.current;
  return (
    <>
      <article className="public-knowledge-entry">
        <header>
          <a href="/polisrossa?view=teoria&percorso=timeline">
            <ArrowLeft size={15} aria-hidden="true" />
            <T>Torna alla timeline</T>
          </a>
          <p className="eyebrow">
            {kind} · {entity.identity.locale}
          </p>
          <h1 id="knowledge-entry-title" tabIndex={-1}>
            {titleFor(history)}
          </h1>
          <p>
            <T>Pagina strutturata della conoscenza pubblica</T>
          </p>
        </header>

        <section aria-labelledby="knowledge-entry-content-title">
          <h2 id="knowledge-entry-content-title">
            <T>Contenuto e contesto</T>
          </h2>
          <StructuredValue value={entity.content} label="content" />
        </section>

        <section aria-labelledby="knowledge-entry-sources-title">
          <h2 id="knowledge-entry-sources-title">
            <T>Fonti e attribuzioni</T>
          </h2>
          {entity.sources.length ? (
            <ol>
              {entity.sources.map((source) => (
                <li key={source.linkSha256}>
                  <a href={source.url} target="_blank" rel="noopener noreferrer">
                    {source.title}
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </a>
                  <p>{source.rights.attribution}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p>
              <T>Questa revisione non registra ancora fonti collegate.</T>
            </p>
          )}
        </section>

        <section aria-labelledby="knowledge-entry-relations-title">
          <h2 id="knowledge-entry-relations-title">
            <T>Collegamenti nella conoscenza</T>
          </h2>
          {entity.relations.length ? (
            <ul>
              {entity.relations.map((relation) => {
                const sameSpace = relation.target.spaceId === entity.identity.spaceId;
                return (
                  <li key={relation.relationSha256}>
                    <span>{relation.relationType.replace(/-/g, " ")} · </span>
                    {sameSpace ? (
                      <a href={knowledgeEntityUrl(relation.target.kind, relation.target.id)}>
                        {String(relation.metadata.name ?? relation.metadata.eventTitle ?? relation.target.id)}
                      </a>
                    ) : (
                      <span>
                        {relation.target.spaceId} · {relation.target.kind} · {relation.target.id}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>
              <T>Non sono ancora registrati collegamenti ad altre entità.</T>
            </p>
          )}
        </section>

        <footer>
          <span>
            <T>Impronta della revisione</T>
          </span>{" "}
          <code>{entity.revisionSha256}</code>
        </footer>
      </article>
      <WikiProposalEditor history={history}/>
      <KnowledgeRevisionHistory kind={kind} entityId={id} />
    </>
  );
}

export default function PublicKnowledgeEntry({
  kind,
  id,
}: {
  kind: string;
  id: string;
}) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    const query = new URLSearchParams({ kind, id, locale: "it" });
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
          if (!controller.signal.aborted) setState({ status: "not-found" });
          return;
        }
        if (!response.ok) throw new Error("knowledge entity unavailable");
        const value: unknown = await response.json();
        if (!isPublicKnowledgeHistory(value, { kind, id, locale: "it" })) {
          throw new Error("invalid knowledge entity response");
        }
        if (!controller.signal.aborted) setState({ status: "ready", history: value });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "failure" });
      });
    return () => controller.abort();
  }, [kind, id, attempt]);

  useEffect(() => {
      if (state.status !== "ready") return;
      const frame = requestAnimationFrame(() => {
        document.getElementById("knowledge-entry-title")?.focus();
      });
      return () => cancelAnimationFrame(frame);
  }, [state.status]);

  if (state.status === "ready") {
    return <KnowledgeEntry history={state.history} kind={kind} id={id} />;
  }
  if (state.status === "loading") {
    return <p role="status"><T>Caricamento della pagina di conoscenza…</T></p>;
  }
  return (
    <section className="public-knowledge-entry" aria-labelledby="knowledge-entry-title">
      <a href="/polisrossa?view=teoria&percorso=timeline">
        <ArrowLeft size={15} aria-hidden="true" />
        <T>Torna alla timeline</T>
      </a>
      <h1 id="knowledge-entry-title">
        <T>{state.status === "not-found" ? "Pagina non ancora disponibile" : "Pagina temporaneamente non disponibile"}</T>
      </h1>
      <p role={state.status === "failure" ? "alert" : "status"}>
        <T>
          {state.status === "not-found"
            ? "Questa entità non è ancora presente nel deposito pubblico."
            : "Non è stato possibile caricare la pagina. Riprova."}
        </T>
      </p>
      {state.status === "failure" && (
        <button type="button" onClick={() => setAttempt((value) => value + 1)}>
          <RotateCcw size={14} aria-hidden="true" />
          <T>Riprova</T>
        </button>
      )}
    </section>
  );
}
