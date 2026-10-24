"use client";

import {useEffect, useState} from "react";
import {CheckCircle2, CircleAlert, RotateCcw, ShieldCheck, Users} from "lucide-react";

type FederationDecision = {
  id: string;
  kind: "pr3-election" | "pr3-recall";
  candidate: {alias: string; sourceNodeId: string};
  title: string;
  statement: string;
  createdAt: number;
  opensAt: number;
  closesAt: number;
  phase: "discussion" | "voting" | "awaiting-finalization" | "final";
  eligible: number;
  turnout: number;
  outcome: "approved" | "rejected" | "no-quorum" | "tied" | null;
  proposalSha256: string;
  decisionDigest: string;
};

type FederationMandate = {
  holderAlias: string;
  record: {
    mandateId: string;
    actorId: string;
    sourceNodeId: string;
    state: "nominated" | "candidate" | "elected" | "active" | "withdrawn" | "recalled" | "resigned" | "expired";
    transitionAt: number;
    startsAt: number | null;
    expiresAt: number | null;
    electionDecisionDigest: string | null;
  };
};

export type FederationBoardData = {
  networkId: string;
  federationId: string;
  decisions: FederationDecision[];
  mandates: FederationMandate[];
};

const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, field: string) => {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Invalid ${field}`);
  return value;
};
const time = (value: unknown, field: string) => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error(`Invalid ${field}`);
  return value;
};
const count = (value: unknown, field: string) => {
  const result = time(value, field);
  if (result > 1_000_000) throw new Error(`Invalid ${field}`);
  return result;
};
const optionalTime = (value: unknown, field: string) => value === null ? null : time(value, field);
const optionalText = (value: unknown, field: string) => value === null ? null : text(value, field);

const decisionKinds = new Set(["pr3-election", "pr3-recall"]);
const decisionPhases = new Set(["discussion", "voting", "awaiting-finalization", "final"]);
const decisionOutcomes = new Set(["approved", "rejected", "no-quorum", "tied"]);
const mandateStates = new Set(["nominated", "candidate", "elected", "active", "withdrawn", "recalled", "resigned", "expired"]);

export function parseFederationBoard(value: unknown): FederationBoardData {
  if (!object(value) || !Array.isArray(value.decisions) || !Array.isArray(value.mandates)) throw new Error("Invalid federation board");
  if (value.decisions.length > 100 || value.mandates.length > 1000) throw new Error("Federation board is too large");

  const decisions = value.decisions.map((item, index): FederationDecision => {
    if (!object(item) || !object(item.candidate)) throw new Error(`Invalid decision ${index}`);
    const kind = text(item.kind, "decision kind");
    const phase = text(item.phase, "decision phase");
    if (!decisionKinds.has(kind) || !decisionPhases.has(phase)) throw new Error(`Invalid decision ${index}`);
    const outcome = item.outcome === null ? null : text(item.outcome, "decision outcome");
    if (outcome !== null && !decisionOutcomes.has(outcome)) throw new Error(`Invalid decision ${index}`);
    return {
      id: text(item.id, "decision id"),
      kind: kind as FederationDecision["kind"],
      candidate: {
        alias: text(item.candidate.alias, "candidate alias"),
        sourceNodeId: text(item.candidate.sourceNodeId, "source node"),
      },
      title: text(item.title, "decision title"),
      statement: text(item.statement, "decision statement"),
      createdAt: time(item.createdAt, "created at"),
      opensAt: time(item.opensAt, "opens at"),
      closesAt: time(item.closesAt, "closes at"),
      phase: phase as FederationDecision["phase"],
      eligible: count(item.eligible, "eligible count"),
      turnout: count(item.turnout, "turnout count"),
      outcome: outcome as FederationDecision["outcome"],
      proposalSha256: text(item.proposalSha256, "proposal digest"),
      decisionDigest: text(item.decisionDigest, "decision digest"),
    };
  });

  const mandates = value.mandates.map((item, index): FederationMandate => {
    if (!object(item) || !object(item.record)) throw new Error(`Invalid mandate ${index}`);
    const state = text(item.record.state, "mandate state");
    if (!mandateStates.has(state)) throw new Error(`Invalid mandate ${index}`);
    return {
      holderAlias: text(item.holderAlias, "mandate holder"),
      record: {
        mandateId: text(item.record.mandateId, "mandate id"),
        actorId: text(item.record.actorId, "actor id"),
        sourceNodeId: text(item.record.sourceNodeId, "source node"),
        state: state as FederationMandate["record"]["state"],
        transitionAt: time(item.record.transitionAt, "transition at"),
        startsAt: optionalTime(item.record.startsAt, "starts at"),
        expiresAt: optionalTime(item.record.expiresAt, "expires at"),
        electionDecisionDigest: optionalText(item.record.electionDecisionDigest, "election digest"),
      },
    };
  });

  return {
    networkId: text(value.networkId, "network id"),
    federationId: text(value.federationId, "federation id"),
    decisions,
    mandates,
  };
}

export async function fetchFederationBoard(signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<FederationBoardData> {
  const response = await fetcher("/api/federation/pr3", {cache: "no-store", signal});
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error("Federation board unavailable");
  }
  return parseFederationBoard(await response.json());
}

const dateFormatter = new Intl.DateTimeFormat("it-IT", {dateStyle: "medium", timeStyle: "short"});
const date = (value: number | null) => value === null ? "non definita" : dateFormatter.format(new Date(value));
const phaseLabel: Record<FederationDecision["phase"], string> = {
  discussion: "Discussione",
  voting: "Votazione",
  "awaiting-finalization": "In attesa di verifica",
  final: "Conclusa",
};
const outcomeLabel: Record<Exclude<FederationDecision["outcome"], null>, string> = {
  approved: "Approvata",
  rejected: "Respinta",
  "no-quorum": "Quorum non raggiunto",
  tied: "Parità, proposta respinta",
};
const mandateLabel: Record<FederationMandate["record"]["state"], string> = {
  nominated: "Candidatura registrata",
  candidate: "Candidatura accettata",
  elected: "Eletto, in attesa di attivazione",
  active: "Mandato attivo",
  withdrawn: "Candidatura ritirata",
  recalled: "Mandato revocato",
  resigned: "Dimissioni registrate",
  expired: "Mandato scaduto",
};

const shortDigest = (value: string) => value.length > 26 ? `${value.slice(0, 18)}…${value.slice(-7)}` : value;

export function FederationBoardView({board}: {board: FederationBoardData}) {
  const activeMandates = board.mandates.filter(({record}) => record.state === "active");
  return (
    <div className="federation-board-loaded">
      <dl className="federation-board-summary" aria-label="Stato del registro federale">
        <div><dt>Rete</dt><dd>{board.networkId}</dd></div>
        <div><dt>Decisioni registrate</dt><dd>{board.decisions.length}</dd></div>
        <div><dt>Mandati PR3 attivi</dt><dd>{activeMandates.length}</dd></div>
      </dl>

      <div className="federation-board-columns">
        <section aria-labelledby="federation-decisions-title">
          <header><h3 id="federation-decisions-title">Decisioni federali</h3><span>{board.decisions.length}</span></header>
          {board.decisions.length === 0 ? <p className="federation-board-empty">Il registro è raggiungibile. Non contiene ancora decisioni federali.</p> : (
            <ol className="federation-record-list">
              {board.decisions.map(decision => (
                <li key={decision.id}>
                  <article>
                    <header>
                      <span className={`federation-state is-${decision.phase}`}>{phaseLabel[decision.phase]}</span>
                      <small>{decision.kind === "pr3-election" ? "Elezione PR3" : "Richiamo PR3"}</small>
                    </header>
                    <h4>{decision.title}</h4>
                    <p>{decision.statement}</p>
                    <dl>
                      <div><dt>Candidatura</dt><dd>{decision.candidate.alias} · nodo {decision.candidate.sourceNodeId}</dd></div>
                      <div><dt>Partecipazione</dt><dd>{decision.turnout} voti su {decision.eligible} aventi diritto</dd></div>
                      <div><dt>Chiusura</dt><dd><time dateTime={new Date(decision.closesAt).toISOString()}>{date(decision.closesAt)}</time></dd></div>
                      {decision.outcome && <div><dt>Esito</dt><dd>{outcomeLabel[decision.outcome]}</dd></div>}
                    </dl>
                    <details><summary>Identificativi verificabili</summary><code title={decision.proposalSha256}>{shortDigest(decision.proposalSha256)}</code><code title={decision.decisionDigest}>{shortDigest(decision.decisionDigest)}</code></details>
                  </article>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="federation-mandates-title">
          <header><h3 id="federation-mandates-title">Mandati federali</h3><span>{board.mandates.length}</span></header>
          {board.mandates.length === 0 ? <p className="federation-board-empty">Nessun mandato PR3 è stato ancora registrato.</p> : (
            <ol className="federation-record-list">
              {board.mandates.map(({holderAlias, record}) => (
                <li key={record.mandateId}>
                  <article>
                    <header><span className={`federation-state is-${record.state}`}>{mandateLabel[record.state]}</span></header>
                    <h4>{holderAlias}</h4>
                    <dl>
                      <div><dt>Nodo di provenienza</dt><dd>{record.sourceNodeId}</dd></div>
                      <div><dt>Inizio</dt><dd>{date(record.startsAt)}</dd></div>
                      <div><dt>Scadenza</dt><dd>{date(record.expiresAt)}</dd></div>
                    </dl>
                    <details><summary>Identificativo del mandato</summary><code title={record.mandateId}>{shortDigest(record.mandateId)}</code></details>
                  </article>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

export default function FederationBoard() {
  const [board, setBoard] = useState<FederationBoardData | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setBoard(null);
    setFailed(false);
    void fetchFederationBoard(AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]))
      .then(result => { if (!controller.signal.aborted) setBoard(result); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [attempt]);

  return (
    <section id="governo-federale" className="federation-board" aria-labelledby="federation-board-title">
      <header className="federation-board-intro">
        <div>
          <p className="eyebrow">REGISTRO PUBBLICO · SOLA LETTURA</p>
          <h2 id="federation-board-title">Governo federale AgoràNode</h2>
          <p>Qui si consultano candidature, decisioni e mandati PR3 registrati. La pubblicazione del registro non apre da sola votazioni o iscrizioni.</p>
        </div>
        <ShieldCheck aria-hidden="true" />
      </header>

      <div className="federation-role-path" role="group" aria-label="Percorso di partecipazione PR1, PR2 e PR3">
        <article><strong>PR1</strong><span>Account personale nel proprio nodo.</span></article>
        <span aria-hidden="true">→</span>
        <article><strong>PR2</strong><span>Membro ammesso e votante di un nodo.</span></article>
        <span aria-hidden="true">→</span>
        <article><strong>PR3</strong><span>Mandato federale eletto, temporaneo e revocabile.</span></article>
      </div>

      {!board && !failed && <div className="federation-board-status" role="status" aria-live="polite"><Users aria-hidden="true"/><span>Caricamento del registro federale…</span></div>}
      {failed && (
        <div className="federation-board-status is-error" role="alert">
          <CircleAlert aria-hidden="true"/>
          <div><strong>Registro federale non disponibile.</strong><span>La home resta consultabile; nessuna decisione viene dedotta o ricostruita dal browser.</span></div>
          <button type="button" onClick={() => setAttempt(value => value + 1)}><RotateCcw size={15} aria-hidden="true"/>Riprova</button>
        </div>
      )}
      {board && <FederationBoardView board={board}/>} 

      <aside className="federation-board-limits" aria-label="Limiti del governo federale attuale">
        <CheckCircle2 aria-hidden="true"/>
        <p><strong>Questa pagina è una bacheca, non una cabina di voto.</strong> Ospitare un server non concede alcun ruolo. Candidature e voti resteranno chiusi nell’interfaccia finché identità PR2, chiavi personali, attestazioni dei nodi e recupero sicuro non saranno collegati e collaudati.</p>
      </aside>
    </section>
  );
}
