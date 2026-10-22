# AgoràNode

**A community-owned knowledge network, built in the open.**

[Italiano](README.md) · [Architecture](docs/ARCHITECTURE.md) · [Contributing](CONTRIBUTING.md) · [Roadmap](docs/DECENTRALIZATION-ROADMAP.md) · [Verified status](docs/QUALITY.md)

AgoràNode is AGPL-licensed software for independent topical communities that combine a **wiki, RSS reader, digital library, searchable timeline, data visualizations, public discussions and community governance**. Each community uses the same core software and should retain authority over its own content and membership.

Our long-term goal: run the public network across **independently maintained computers**, with no single company database, founding machine or cloud provider required for continued access. Participants should not have to store everything or join a global consensus for every message. Instead, public content is verified and selectively replicated while personal information stays outside public distribution.

**Current status:** PolisRossa is the first developed node, Agorà is a technology-focused preview. The complete multi-community runtime, portable identities, distributed social/chat, BFT network consensus, automated peer discovery, and independently tested gateway failover **do not exist as operational production features**. The repository includes local PostgreSQL account/forum flows, public revision history, signed knowledge package verification, an opt-in HTTPS peer exchange, a small shared thematic UI, and experimental content chunking. See [QUALITY.md](docs/QUALITY.md).

## Product model

| URL / concept | Purpose |
| --- | --- |
| `/` | Community directory |
| `/agora` | Technology and AgoràNode development (in progress) |
| `/polisrossa` | First developed topical community |
| Thematic node | A community with its own governance, sources, documents, datasets, membership and policies |
| Physical peer | A device offering storage, an API gateway, routing or other services to one or more communities |

A physical peer is not a vote, an editor, or the source of truth. A member's participation rights do not depend on hardware or money.

## Engineering approach

1. **One public knowledge graph per topic.** Every article, historical event, author, edition, dataset and referenced discussion gets a stable ID, sources, revisions and links. A topic is discoverable through search and timeline navigation. This is the target model; today's catalogue is uneven and partly read-only.
2. **Incremental changes, not full database backups each second.** Local PostgreSQL commits remain durable; a transactionally written audit cursor detects public knowledge changes. A separate approval/finality pipeline decides what can be replicated. Peer polling can ask if a signed public index changed without downloading its body again.
3. **Content-addressed blocks.** The experimental `gear32-v1` chunker computes deterministic SHA-256 chunks so a small edit can reuse earlier content; this is not connected to the production knowledge transport. The current signed package protocol still transfers complete cumulative bundles.
4. **Local indexes, selective replication.** Peer operators choose what they retain; public files are distributed only where copyright and privacy policy permit. Private account and chat data must not enter the global public index.
5. **Minimal infrastructure.** React, TypeScript, Vite and PostgreSQL are a workable base. Do not add Kubernetes, distributed SQL, a messaging bus, IPFS or libp2p until a benchmark and failure model justify the operational cost.

## Architecture

```text
                 React / PWA (community-aware client)
                               |
                    HTTPS gateway + scoped API
                               |
              ┌────────────────┴────────────────┐
        public knowledge                   private account
        timelines, books                   forum permissions
        sources, datasets                  protected messages
              |                                  |
       PostgreSQL local                       isolated DB
       audit + fast indexes                 private recovery
              |
       editorial validation and governance authorization
              |
      finalized, signed public checkpoint
              |
  verified peer exchange → independently held public copies
```

The live peer exchange currently uses manually configured HTTPS origins. `peer:watch` polls the public index conditionally at a one-second default interval. **Polling every second is not a one-second RPO, backup, delivery guarantee, or BFT finality.**

## Run locally

Requires **Node.js 24+** and npm:

```bash
git clone https://github.com/internazionalerossa/agoranode.git
cd agoranode
npm ci
npm run dev
```

For build and regression verification:

```bash
npm run build
npm run typecheck
npm test
npm run benchmark:cas
```

For the complete HTTPS/Node/PostgreSQL deployment, backup and recovery procedures see [SELF-HOSTING.md](docs/SELF-HOSTING.md). Do not expose local services without reading [SECURITY-REVIEW.md](docs/SECURITY-REVIEW.md).

The opt-in `peer:serve`, `peer:pull` and `peer:watch` commands are documented in [PEER-EXCHANGE.md](docs/PEER-EXCHANGE.md). They transfer only previously signed public knowledge packages, not a user's database, private discussion or unlicensed book.

## Repository

```text
app/components    React views, accessibility and common modules
app/data          Existing PolisRossa catalogues and timelines
app/instances     Community manifests and scoped catalogue adapters
app/lib           Domain logic, search and knowledge models
app/platform      Shared manifest, governance and protocol contracts
server            PostgreSQL, API, knowledge storage and peer exchange
web               Vite entry point
tests             Node.js and PGlite tests
scripts           Build, migrations and benchmarks
docs              Architecture, governance, operational and security docs
```

## Contribute

We welcome TypeScript/React, PostgreSQL, distributed-systems, cryptography, search, storage, UX, accessibility, archive and governance engineering. Well-scoped improvements to documentation, source attribution, tests and migration safety are valuable, too.

Read [AGENTS.md](AGENTS.md), [CONTRIBUTING.md](CONTRIBUTING.md), [ARCHITECTURE.md](docs/ARCHITECTURE.md) and [CONTINUOUS-SYNC.md](docs/CONTINUOUS-SYNC.md). Work on a branch, include negative tests, run the build/test/typecheck suite, and open a pull request with evidence and a rollback plan.

Priority problems: a fully generic community UI and backend, proper database separation, globally linkable topic pages, per-edition copyright-safe library storage, the community-authorized wiki publication pipeline, incremental public block exchange, federated social/identity protocols, real consensus and multi-host recovery exercises.

## Design constraints

- **Truth is not established by vote.** Source review and editorial dispute resolution are distinct from community policy decisions.
- **Provider-neutral is not provider-free.** Hardware, power, DNS and networks impose real costs.
- **Privacy beats indiscriminate immutability.** Private keys, sessions, personal data and reserved conversations never belong in a universal public log.
- **Benchmarks before claims.** A small low-cost peer can serve a subset of public content; no single €100 computer can host Facebook-scale global traffic.

Read the deeper [design](docs/PEER-OWNED-ARCHITECTURE.md), [continuous sync strategy](docs/CONTINUOUS-SYNC.md), [lean storage prototype](docs/LEAN-STORAGE.md), [wiki editorial workflow](docs/EDITORIAL-GOVERNANCE.md), [security assessment](docs/SECURITY-REVIEW.md), and [roadmap](docs/DECENTRALIZATION-ROADMAP.md).

**License:** [AGPL-3.0-or-later](LICENSE); third-party books, news articles, media and datasets retain their own copyrights and permissions. See [NOTICE](NOTICE) and [TRADEMARKS.md](TRADEMARKS.md).

*Join us in building knowledge systems that can outlive their first server—and in making every engineering claim reproducible.*
