# AgoràNode

**Open-source infrastructure for knowledge, communities and community-owned computing.**

[English](README.en.md) · [Architecture](docs/ARCHITECTURE.md) · [Distributed network](docs/DISTRIBUTED-NETWORK.md) · [Contributing](CONTRIBUTING.md) · [Current verification](docs/QUALITY.md) · [Security](docs/SECURITY-REVIEW.md)

AgoràNode is an **AGPL-3.0-or-later** project for creating independent thematic communities on shared software. Each community is designed to combine a sourced knowledge base, public wiki pages, RSS feeds, a digital library, chronological events, structured data, discussions, proposals, and democratic governance.

Our long-term engineering goal is **a network that communities can run and preserve on their own computers**—without needing one company's database, cloud account, or founding server to remain online forever. Each peer should replicate only the content it is entitled and willing to store. Public content should be verifiable and incrementally synchronized; private data must not be copied into the public network.

**This is an active project, not a production-ready decentralized social network.** The existing PolisRossa application is the first developed thematic node. Agorà is the technology-focused node under construction. The distributed consensus, portable identities, federated forum/chat, complete multi-node runtime and independent gateway failover are not yet operational. We distinguish working code from design goals in [QUALITY.md](docs/QUALITY.md).

## The idea

Think **wiki + RSS reader + digital library + community forum**, with one consistent user experience per thematic community. The underlying software is AgoràNode; a thematic *node* is a community, **not** a physical server.

| Surface | Responsibility |
| --- | --- |
| `/` | The node directory and entry point |
| `/agora` | Thematic community about AgoràNode technology, currently a preview |
| `/polisrossa` | Developed community focused on the history, politics and culture of the international left |
| Future communities | Same modules, different topics, sources, data, members and governance |

A physical **peer** may store several communities; one community may be served by many independent peers. Hosting hardware never grants editorial or political authority. A local community controls its own rules; federation-level decisions are scoped to shared infrastructure.

## Why we're building it

Today a knowledge website, news aggregator and community forum often duplicate content and metadata, depend on opaque recommendation systems, or keep participation locked to one hosting provider. We are exploring a simpler architecture with:

- **Interconnected knowledge:** an entity has a stable ID, sources, revision history and relationships to books, events, datasets and discussions. Timeline entries lead to pages; pages link back to the timeline and their supporting sources.
- **Community sovereignty:** locally governed content and moderation, clear membership and appeals, delegations with deadlines, and no extra vote for the operator of a server.
- **Portable public history:** revisions are append-only where appropriate, content-addressed, attributable and exportable. A hash proves integrity, *not* factual truth or publication rights.
- **Lean replication:** store and transfer only missing public content blocks, maintain local indexes, and use consensus only for state that requires collective finality—not for every chat message.
- **Provider replaceability:** publicly documented formats, independently operated peers, replaceable gateways and verifiable releases rather than a mandatory cloud vendor.
- **Privacy by design:** accounts, passwords, private discussions and personal data are not part of the indiscriminate public replication set.

The governing principle is **simple primitives, explicit invariants, measurable results**. We prefer a modular monolith and small protocols to infrastructure layers whose cost is not justified by a real benchmark.

## Status at a glance

| Area | What's in the repository | Missing before real distributed production |
| --- | --- | --- |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS; shared seven-module navigator | All PolisRossa views made fully configurable for every community |
| Local storage | PostgreSQL 17, Better Auth, local persistent forum/account flows | Separate live runtime and permissions for each community |
| Wiki knowledge | Content-addressed public revisions, sources, immutable audit and current pointers | Public editing/review workflow and complete thematic content graph |
| Library | Multilingual metadata catalogue and an authorized in-site edition | Local file availability for each redistributable edition, rights review and durable CAS integration |
| Timeline/data | Historically sourced PolisRossa catalogues and graphs | Generic per-node indexing, proposals, conflict/appeal workflows |
| Search | Topic-scoped read-only discovery prototype for PolisRossa library and timeline | Full-text indexes, remote search and all public record kinds |
| Replication | Verified public packages, direct HTTP peer transfer, conditional index polling | Incremental network block exchange, discovery and independent host acceptance tests |
| Consensus | Ed25519 quorum-certificate validation in local tests | An actual network BFT protocol and independent security review |
| Forum/chat/identity | Persistent forum; temporary single-process chat; Better Auth | Federated event delivery, safe E2E where needed and portable identity recovery |
| Gateway | Local self-hosting and optional ingress proxies | Automatic independently hosted gateway continuity and tested failover |

**Do not confuse a one-second peer poll with a one-second durable backup or globally consistent data.** The database's local transaction is the first durability boundary; the network can distribute only *approved finalized* public changes. Private backups are encrypted and restored under separate rules. See [Sync and storage](docs/CONTINUOUS-SYNC.md).

## Architecture: a lightweight core

```text
Web / PWA client
    │
    ▼
Community-aware React frontend + public/private API
    │
    ├─ knowledge pages / timeline / books / datasets
    ├─ news ingestion and search (rebuildable indexes)
    ├─ community discussions, moderation and proposals
    └─ authenticated personal data (private, isolated)
    │
    ▼
Local PostgreSQL (transactions and local indexes)
    │
    ├─ committed public change cursor ──> publication/review
    │                                         │
    │                              authorized checkpoint
    │                                         │
    └─ encrypted, restricted private backup   ▼
                                   verified public object exchange
                                         │          │
                                     peer A       peer B
                                       │            │
                                    local index / browser gateway

Peer replication does NOT copy a community's private database.
```

**Key distinction:** a physical peer, thematic community, forum member, technical finalizer and federation delegate are five different concepts. Neither a server nor the longest log determines political authority.

The public replication **v1** presently transfers complete finalized knowledge bundles. Our experimental content-defined chunker (`server/public-blob-cas.ts`) supports verifiable deduplication in isolation but is **not yet integrated** with the wire protocol. Peer polling can avoid retransmitting unchanged packages. No benchmark implies that a €100 device can host billions of simultaneous sessions.

## Project structure

```text
app/
  components/       React product views and shared node navigator
  data/             PolisRossa catalogues, timelines and sources
  instances/        Agorà and PolisRossa manifests; per-space adapters
  lib/              Domain models, permissions and discovery
  platform/         Shared manifest, governance and replication contracts
server/
  api.ts            Application API boundary
  auth.ts           Account/session boundary
  knowledge*.ts     Public revision storage and verification
  public-peer-*.ts  Optional read-only public peer exchange
  public-blob-cas.ts Experimental public-only chunk codec
  migrations/       PostgreSQL schema
web/                Vite entry point
scripts/            Build, local operation and synthetic benchmark
tests/              Node test suite and PGlite fixtures
docs/               Specifications, operational runbooks and evidence
```

The canonical repository is `internazionalerossa/agoranode`. Historical PolisRossa URLs, database/volume identifiers and personal storage keys are preserved for compatibility.

## Getting started

**Requirements:** Node.js 24+, npm, Git. Docker and PostgreSQL are required for the full self-hosted server; browsing the frontend and running most local tests does not require exposing ports on your router.

```bash
git clone https://github.com/internazionalerossa/agoranode.git
cd agoranode
npm ci
npm run dev
```

The Vite development server runs on the local machine. To build and verify the application:

```bash
npm run build
npm run typecheck
npm test
npm run benchmark:cas
```

`npm run benchmark:cas` runs a **synthetic** one-byte-edit exercise and reports deduplicated bytes; it is not an energy, production throughput or infrastructure-cost measurement. For a full local HTTPS installation, database migrations, backups and strict mirror mode, follow [SELF-HOSTING.md](docs/SELF-HOSTING.md); do not copy development credentials into production.

### Testing the public peer prototype

The optional `npm run peer:serve` and `npm run peer:pull` commands exchange **already finalized public knowledge packages only**. `npm run peer:watch` performs conditional polling (default one second) against up to eight configured HTTPS origins; it does not authorize new edits, finalize votes, replicate accounts or guarantee a one-second propagation SLA. The gateway binds loopback and must be explicitly secured and exposed through an operator-managed TLS proxy.

Read [PEER-EXCHANGE.md](docs/PEER-EXCHANGE.md) before enabling this functionality. Do not put passwords, private forum tables or unlicensed book contents into its outbox.

## Knowledge, library and governance

An AgoràNode thematic community should eventually offer an interconnected content graph: wiki articles and entities, chronological events, library editions, data series, and relevant discussions, all searchable with stable IDs. A proposal to change a shared timeline creates a reviewable *draft* linked to its base revision and forum topic. Only a valid locally authorized decision and technical validation can publish a new current revision. Facts require source evaluation; **voting does not make a claim true**.

Library records must separate **catalogue metadata**, **licence/rights of the exact edition**, **downloadable content** and **storage availability**. A publicly linked book is not automatically legal to copy onto every volunteer's disk. For eligible editions the long-term goal is verified content-addressed local copies and selective peer pinning; otherwise the site should retain metadata and attribution and link to the original archive.

The existing forum, wiki grant design and governance protocol have limits: [EDITORIAL-GOVERNANCE.md](docs/EDITORIAL-GOVERNANCE.md), [GOVERNANCE.md](docs/GOVERNANCE.md), and [CRITICAL-DESIGN-REVIEW.md](docs/CRITICAL-DESIGN-REVIEW.md). See [CONTINUOUS-SYNC.md](docs/CONTINUOUS-SYNC.md) for data boundaries.

## Contributing

We are looking for contributors interested in **distributed systems, PostgreSQL, networking, TypeScript/React, accessibility, searchable knowledge, digital archives, applied cryptography, security, observability, UX and community-governance tools**.

A useful contribution does not need to introduce a new framework. Fix a source attribution, add a regression test, remove duplicated state, measure a bottleneck, clarify a user flow or help document a failure mode.

1. Read [AGENTS.md](AGENTS.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [ARCHITECTURE.md](docs/ARCHITECTURE.md).
2. Start from a precise issue or design proposal, describing the behavior and data boundary.
3. Create a branch; include negative tests for permissions, malicious input, restarts and cross-node state when relevant.
4. Run `npm test`, `npm run typecheck` and `npm run build`. Do not commit secrets or personal data.
5. Open a pull request with design tradeoffs, evidence, rollout and rollback details. Docs-only changes should still be precise about what is live versus planned.

**Priority areas:** complete reusable multi-node UI/API, authorized wiki editing, rich timeline/book/entity search, local permission-safe content storage, incremental P2P blocks, independent host tests, portable identities, distributed chat with retention, and rigorous BFT selection/review. See [DECENTRALIZATION-ROADMAP.md](docs/DECENTRALIZATION-ROADMAP.md) and [CONTINUOUS-SYNC.md](docs/CONTINUOUS-SYNC.md).

## Engineering principles

- Preserve user data and compatibility; additive migrations, explicit rollback where possible.
- Fail closed on signatures, scope, rights, identity and quotas.
- Distinguish local committed state, draft, approved publication and distributed finality.
- Avoid vendor lock-in and premature microservices. Evaluate NATS, libp2p, IPFS, CRDTs or distributed SQL **against measured workloads**, never as branding.
- Keep logs and content export private-safe, with attribution and legally appropriate removal.
- Publish reproducible tests, documented assumptions and failure modes. No unverified “indestructible” or “zero-cost” guarantees.

## Documentation

[Technical architecture](docs/ARCHITECTURE.md) · [Design vision](docs/PEER-OWNED-ARCHITECTURE.md) · [Continuous sync](docs/CONTINUOUS-SYNC.md) · [Lean Storage](docs/LEAN-STORAGE.md) · [Peer exchange](docs/PEER-EXCHANGE.md) · [Governance](docs/GOVERNANCE.md) · [Library](docs/LIBRARY.md) · [Security review](docs/SECURITY-REVIEW.md) · [Quality and verified status](docs/QUALITY.md) · [Roadmap](docs/DECENTRALIZATION-ROADMAP.md)

**Licence:** [AGPL-3.0-or-later](LICENSE). Code licensing does **not** relicense third-party media, books, source articles, images or datasets. See [NOTICE](NOTICE) and [TRADEMARKS.md](TRADEMARKS.md).

*AgoràNode is looking for collaborators who care about a difficult, concrete question: how do we make shared knowledge and its infrastructure more portable, less wasteful and less dependent on any single operator?*
