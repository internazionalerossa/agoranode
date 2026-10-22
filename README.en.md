# AgoràNode

AgoràNode is the shared software and infrastructure for building independent thematic nodes. The useful analogy is ForumFree: a service provides technology and access for many communities without becoming one of them or centralizing their discussions and decisions. Each node connects current affairs, sources, a library, knowledge, history, data and public discussion around its subject.

**Agorà is a node**, dedicated to the state of the art of AgoràNode technology and shared infrastructure matters. **PolisRossa is another node**, dedicated to the political left. They are peers: they share a format and layout, not a subject, community or decision-making scope. The home `/` is the portal for finding nodes; its current search and navigation cover the two paths in this repository. `/agora` is under construction, while `/polisrossa` is the developed thematic node. There is not yet a federated registry for finding nodes hosted elsewhere.

Each node is intended to make the state of the art in its subject accessible: news and video with original sources, library and structured knowledge, timeline, data and public discussion. Content and decisions remain attributed to the relevant community; Agorà deals only with the technology, rules and shared resources of the infrastructure.

The political ambition is direct democracy informed by sources, data and discussion, eventually replacing some decision-making functions of institutions. This is a goal, not a current condition: the service has no legal authority to replace public bodies, and the federation is not operational. The canonical repository is `internazionalerossa/agoranode`; historical `polisrossa` identifiers for the instance, database, volumes and configuration remain unchanged for compatibility.

PolisRossa connects daily news with the books, history and data needed to understand it. It brings together socialist, communist, trade-union, anarchist and anticolonial sources from different countries while keeping their origin and original link visible. Readers are not asked to adopt a political position: the project offers material to verify, compare and discuss.

The editorial orientation is explicit. Automated classifications help organize content, but they do not certify the truth of a story or the political identity of a source. Translations can lose nuance; charts describe measurements and associations, but do not by themselves demonstrate causal relationships. PolisRossa therefore preserves dates, units, definitions, attribution and links to original documents.

The project aims to become a resource maintained by several people without turning the first server into the owner of the site. The current work prepares that direction in a verifiable way: the code can be copied, a local node can operate in read-only mode, a release can be attested with a signature, and encrypted database backups can be entrusted to multiple custodians. A first kernel replicates public knowledge only between distinct databases through verified packages and atomic imports; it has been tested locally, not between independent computers. Network transport, peer discovery, public-address takeover, failover and end-to-end encryption **have not been tested or implemented as an operational service**.

A typed manifest and public endpoint define an initial contract for instances. The portal distinguishes the two real nodes in the repository from an initial map of 124 possible topics across many fields of knowledge: these are ideas from which communities may be built, not active nodes. Search covers existing nodes and candidate topics; an unlisted subject can also be previewed as a temporary, unsaved idea and is not submitted anywhere. The map is not exhaustive and is not a federated network. `/agora` presents technical status, the federal register and custody, but does not yet have the full editorial surfaces of `/polisrossa`. There is no complete node generator, open federal forum or tested worldwide network. The database/API runtime for PR3 candidacy, voting, mandates and recall is implemented and covered by local tests, but has no public interface and is not active in production. See [QUALITY.md](docs/QUALITY.md) for verified limits.

[Italiano](README.md) · [AgoràNode model (Italian)](docs/AGORANODE.md) · [Common governance (Italian)](docs/GOVERNANCE.md) · [Distributed network (Italian)](docs/DISTRIBUTED-NETWORK.md) · [Public replication (Italian)](docs/PUBLIC-REPLICATION.md) · [Contribute](CONTRIBUTING.md) · [Architecture](docs/ARCHITECTURE.md) · [Self-hosting](docs/SELF-HOSTING.md) · [Verification status](docs/QUALITY.md)

## The common AgoràNode format

A complete node may change topic, sources, visual theme and community, but keeps the same recognizable environments:

1. written news and video, linked to their original publishers;
2. a free library and wiki, with internal reading only for editions that may legally be redistributed;
3. a topic storyline whose events, people and concepts have stable pages;
4. data, historical comparisons and charts that keep units, population, years and sources attached;
5. a democratic self-governance forum scoped to that instance;
6. portable custody through revisions, provenance, verifiable exports and backups that exclude credentials and personal data.

The `org.agoranode.instance.v1` contract describes expected capabilities, but does not make a new node complete by itself: content, rights, sources, moderation, declared responsibility and testing are required. Discovering communities hosted on other servers will require a registry and federated protocol that do not exist yet. Accounts, data and forums must remain scoped to each node and are not described as open until their actual paths are tested. A PR2 admitted by PolisRossa decides within PolisRossa. Like any active PR2 from an admitted node, that person may stand for a federal PR3 mandate, but receives no automatic promotion or authority. Hosting a copy grants no additional vote.

| Level | Scope | How it is obtained | Authority |
| --- | --- | --- | --- |
| **PR1** | personal account | confirmed email address and password | own data and collections; no political vote |
| **PR2** | one specific node | application, that node's social proof and admission by existing PR2 members | one person, one vote in that node's assembly |
| **PR3** | AgoràNode federation | candidacy by an active PR2, federal election and acceptance | enumerated powers only, until expiry or recall |

PR3 is an elected, limited and revocable mandate rather than a superior personal rank. The federal runtime stores admitted nodes, signed PR2 attestations, frozen electorates, ballots, certificates and append-only PR3 transitions in PostgreSQL. Tests cover the cycle from candidacy to recall and reject important signature, replay and cross-node errors; that evidence does not open the service. No user is presented as an active PR3 until UI, real keys and nodes, operational configuration and production testing exist.

## How to use it

The news review is the starting point for current affairs. Search, time period, region, language, source and topic filters let readers move from an international overview to the publications they want. Ordering can prioritize time or alternate countries and publishers so that one prolific outlet does not occupy the page on its own. The Observatory uses the same collection with the “Last 6 hours” period. Articles and videos open on the publisher’s site.

The Library adds context. Books and reading paths introduce topics and authors; Achievements presents events, people, repression and social transformations along a timeline; Data and charts supports comparisons between indicators, countries and periods. These three entry points remain connected, but serve different tasks: reading a text, following a historical development or checking a measurement.

Participate separates the personal account from community admission. The first registration page offers either PR1 for collections and reading position or a route that continues towards PR2. Both choices first create the same PR1 account with an email address and password; the second choice only sets the return path and does not submit or store an application. After confirming the email address and signing in, a PR2 applicant must actually connect Facebook through OAuth, provide a public name and introduction, and explicitly submit the application. The Facebook reference shown to reviewers is derived from that OAuth connection and cannot be replaced by an arbitrary URL entered in the form. Facebook proves control of that account at that moment, not civil identity, and cannot be used to sign in to PR1. Discord, Instagram and a personal website do not replace this step.

The selected no-cost email path is Gmail SMTP for account confirmation and password reset only; it must be configured and tested on the deployed instance before those flows are considered operational. `ACCOUNT_ACCESS_HASH` is an optional compatibility barrier for invitation-only installations. When configured, it applies only to new registrations, not password recovery, and it does not replace email verification or abuse limits. Facebook credentials are required only when `FORUM_OPEN=true`; a PR1-only instance can operate without them. Permanent discussions, proposals and outcomes live in PostgreSQL; chat is intentionally temporary and remains in the memory of a single process. Features available on a public instance depend on its configuration and actual testing, not merely on the presence of code.

Infrastructure and content can evolve without overturning the appearance of the site. News, Library and Participate remain the three main entry points; new permalinks, encyclopedic pages and custody functions must fit into the existing navigation.

## What exists today

- **International news review:** direct sources and thematic searches, combinable filters, concurrent refreshes and caching of public data only.
- **Separate languages:** interface language, reading language and the original language of sources are separate choices. The original remains available.
- **Video:** filterable international channels; playback takes place on the source platform and does not start automatically.
- **Library:** a multilingual catalogue of works, editions and external archives; internal online reading uses only persistent copies with a registered right to redistribute, while other editions open at their source.
- **History:** a timeline in seven eras with 64 event pages, an initial index of 17 people, dossiers and an archive searchable by country and topic.
- **Data and charts:** annual series, metadata, country comparisons, tables, CSV, permalinks and chart export with unit, period, source and URL. Missing years are not invented or interpolated.
- **Personal collection:** account-persistent bookmarks and reading position in the independent runtime.
- **Community:** admissions, discussions, proposals, votes and verifiable exports in the independent runtime; temporary chat is not an archive.
- **Independent server:** the Node.js application, PostgreSQL and HTTPS can be started with Docker Compose without depending on a preview environment or a specific provider.

Catalogue counts and verification status change as the project is revised: [LIBRARY.md](docs/LIBRARY.md) describes provenance and coverage, while [QUALITY.md](docs/QUALITY.md) distinguishes verified code, local tests and behavior actually observed online.

## Where the data lives

PolisRossa does not have a single kind of content and must not treat a public statistical series in the same way as a personal session.

| Information | Current state | Boundary |
| --- | --- | --- |
| Catalogues, reading paths and editorial text | Files versioned with the code | Public and reviewable through Git |
| Knowledge pages | Content-addressed revisions in PostgreSQL | Append-only administrative import; the initial set contains 64 events and 17 people |
| Historical series and metadata | Public files loaded per indicator | Source, unit, period and values remain together |
| Retrieved feeds, images and documents | Limited cache of public data | Destinations, redirects, types and sizes are checked |
| Book texts read online | Persistent revisions in PostgreSQL, imported only from an explicit rights register | No remote retrieval during a visit; other editions remain in the original archive |
| Accounts, sessions, bookmarks and progress | PostgreSQL | Private to each account, never part of the public cache |
| Forum, admissions and votes | PostgreSQL of the instance that accepts writes | Public or restricted according to the rules; not replicated between nodes |
| Chat | Process memory, in 48-hour windows | It can disappear sooner after a restart; it is not included in database backups |

PolisRossa public knowledge uses stable identifiers, SHA-256 fingerprints and append-only revisions: a correction may change the current revision without rewriting an earlier one. The schema already distinguishes repository-reviewed seed content from future community contributions. For the latter, the publication record retains the author, the public license selected for that contribution alone, consent to the versioned AgoràNode grant, the predecessor, requester, discussion and approval decision. AgoràNode imposes no single editorial license and does not seek Wikipedia compatibility: the author's public-license choice remains separate from the `org.agoranode.contribution-grant.v1` minimum grant that lets the node preserve the contribution, display it without an access fee and publish democratically approved revisions. The grant text is still a **draft requiring legal review**, so public editing is not open. Ordinary APIs expose no destructive delete for public entities. Personal data remains separate and subject to applicable erasure rights.

The ordinary path is `browser → Node server → public source` for consultation and `browser → Node server → PostgreSQL` for personal and community data. The server does not accept arbitrary proxy destinations from visitors and renders remote text as inert content without executing source markup.

## Sharing custody without inventing a blockchain

Continuity requires distinct tasks. Copying the code, attesting a release, keeping a backup and deciding on a change are not the same operation.

It is currently possible to:

1. clone the repository and build the same application;
2. start an independent read-only node with its own database and configuration;
3. sign a deterministic release checkpoint with Ed25519 and verify that another node has already built the same executable files;
4. produce an age-encrypted PostgreSQL backup and give copies to multiple custodians;
5. test restoration in a separate database without touching the operational one;
6. validate and atomically import finalized public-knowledge packages between distinct local databases.

The current checkpoint is `release-only`: it contains a manifest and signature, but does not transfer code, books, forum, accounts or a database. Importing it records only provenance and the local chain head. A public key must be verified through an independent channel; the signature proves correspondence with that key, not the political or technical quality of the software.

An age backup can be read by every recipient whose public key was included. This allows several custodians to keep a copy, but it does **not** automatically divide decryption power among them and does not replace consensus, replication or access control.

These foundations do not yet keep “one shared site” alive if the server that owns the database disappears. The replication agent can import a valid package placed in its inbox and an optional Syncthing overlay can transport that folder, but this path is neither enabled by default nor tested between independent computers. A surviving node does not automatically inherit private data, write authority or the public address of an offline instance. The local procedure is documented in [PUBLIC-REPLICATION.md](docs/PUBLIC-REPLICATION.md); self-hosting and recovery are in [SELF-HOSTING.md](docs/SELF-HOSTING.md).

Saying that PolisRossa must not disappear means building several safeguards, not making a physically impossible promise. While disks, keys and backups remain under one operator, that operator can still destroy them. Non-destructive revisions, deterministic exports, encrypted copies held by independent custodians and restore drills reduce the risk; the local kernel is only the first step. Stronger continuity still requires replication and recovery tested across several independently administered computers.

## Ownership, operator role and decisions

Someone who keeps a computer running provides a technical resource: doing so does not grant editorial rights, additional votes or ownership of the project. Likewise, the technical name `primary` indicates only an instance on which writes may be enabled; it does not mean primary political authority.

Today, however, production decisions and writes still depend on the instance and its administrative credentials. The governance contract and PR3 runtime can verify electorates, ballots, quorum, mandate duration and recall locally, but they are not active in the UI or production and do not yet enforce a decision across independent computers. It would be inaccurate to present the current system as already guaranteeing collective ownership.

The governance goal is a **temporary, limited and revocable** custody mandate, not a permanent personal right to the final word. To become real, it will need to define at least:

- who may propose, approve and revoke a mandate, and with what threshold;
- duration, expiry and narrowly scoped emergency powers;
- a verifiable decision record and a challenge procedure;
- key rotation and recovery without entrusting keys to one person;
- transfer of service and public data to new custodians;
- separate treatment of personal data, which cannot be copied to a public network by default.

Until these constraints are activated and tested across independent nodes, Git preserves technical history and the instance forum preserves community discussion, but neither one alone creates distributed sovereignty.

## Persistent library, encyclopedia and shareable content

A first part of this work is implemented without changing the site’s main structure. The administrative importer accepts only book/language pairs present in the rights register; it stores chapters, attribution, license, source, revision date and SHA-256 fingerprints in PostgreSQL. Revisions are not overwritten. During a visit the reader uses only the persistent copy and the server checks permission again: absence or revocation does not trigger a remote retrieval of the text. The initial register contains one English edition, *Free, Fair and Alive* under CC BY-SA 4.0; all other editions remain linked to their respective archives until the specific edition has been verified.

The timeline is no longer only one long page: all 64 entries have stable identifiers and shareable pages. An initial encyclopedic index brings together 17 referenced people, with roles, events and sources already present in the project. The same set of 81 entities can be imported idempotently into the PostgreSQL knowledge store and exported internally as a deterministic public bundle without accounts or secrets. This is a verifiable beginning of the AgoràNode encyclopedia, not a complete catalogue: organizations, places, works and many other people still need a uniform model and editorial review.

A book position, an event or person page, and the state of a chart have permanent links. Charts can also be exported as images that keep title, source, unit, period and link together. For books, articles and events the built-in sharing function shares the link; it cannot prevent a manual screenshot from cropping out attribution or context. A screenshot does not authorize republication of protected material and does not replace the source.

Still to be built are the documented expansion of the book archive, pages for all other entity types, and the public workflow for proposing and publishing revisions. The kernel and filesystem agent can verify, import and relay finalized packages; tests observed convergence, restart, idempotence and rejection of tampering between local databases. The Syncthing overlay is optional and separate from normal startup. Transport between independent PCs, discovery, quorum run by real independent administrations, automatic takeover and end-to-end encryption **are not tested or active yet**.

## Development setup

Node.js 24 and npm are required.

```sh
npm ci
npm run dev
```

To verify a change:

```sh
npm run build
npm test
npm run typecheck
```

The complete server requires PostgreSQL and the variables described in [DEPLOYMENT.md](docs/DEPLOYMENT.md). GitHub Actions verifies the source code, but does not publish the service or demonstrate that providers, feeds or email work live.

## Starting a server or local node

On a computer with Node.js 24 and Docker Compose, from the repository root:

```sh
node scripts/selfhost.mjs init
node scripts/selfhost.mjs start
node scripts/selfhost.mjs knowledge-import
node scripts/selfhost.mjs status
```

The default installation listens only on the local computer and keeps configuration, data and keys outside Git. Stopping it with `node scripts/selfhost.mjs stop` does not delete volumes. Do not use `docker compose down -v` on an installation that must be preserved.

A second checkout can be initialized as an independent read-only installation of the same PolisRossa application, with a distinct Compose project and ports:

```sh
node scripts/selfhost.mjs init https://localhost:9543 mirror --project polisrossa-node2 --http-port 9080
node scripts/selfhost.mjs start
```

`mirror` makes the same PolisRossa application read-only: it does not create a new topic or node identity and does not synchronize content with other hosts. Each new installation gets its own PostgreSQL user and database as well as separate Compose volumes; existing configurations without these fields continue to use the historical `polisrossa` names. Do not publish `.selfhost`, `.env` files, tokens, keys, cookies or database copies.

**Creating a custom thematic node and contributing hardware to a shared pool are not yet supported by the runtime.** The home-page map lists possible topics, not installations that can be generated; the portal does not register remote nodes and hosts do not automatically receive or replicate data. Today you can host an independent copy of the existing application by following [SELF-HOSTING.md](docs/SELF-HOSTING.md). [PUBLICATION.md](docs/PUBLICATION.md) describes the prepared no-cost path with a `workers.dev` Worker in front of Tailscale Funnel, without WAN port forwarding; that Worker has not yet been deployed or activated. Custom nodes first need runtime-loaded manifests, per-instance content and API isolation, and an interoperable registry. Shared hardware additionally needs a tested protocol for authorization, monitoring, replication and recovery. Hosting a server does not confer governance power or ownership.

## Participate

No programming knowledge is required. A useful report names the page, what is unclear or broken, and the desired result; for books, events and data, it adds verifiable references and, when available, the license. Do not publish personal data or confidential documents.

Editorial and product proposals belong in the community instance’s forum when that service is operational. GitHub preserves source changes and technical reviews: you can use the pencil icon on a file, create a fork and open a pull request. The [contribution guide](CONTRIBUTING.md) explains both paths for people who have never used them before.

## Privacy, security and licenses

Original code is distributed under **AGPL-3.0-or-later**. Anyone offering a modified version online must make the corresponding source available as required by the license. [NOTICE](NOTICE) collects notices and warranty limitations; [TRADEMARKS.md](TRADEMARKS.md) distinguishes the right to modify the code from the use of the name and logo to present a service as official.

Articles, photographs, videos, books, translations and datasets retain the terms set by their respective rights holders. Free access does not imply a right to copy or redistribute them. Every persistent import must therefore record provenance and rights, and provide for correction or removal.

For a future original community article, the author selects the public license for their contribution; Wikipedia compatibility is not required. Publication will separately require acceptance of the versioned AgoràNode grant and will expose the revision author, request, discussion, decision and predecessor. The current grant is a technical draft, not legal advice or authorization to open public editing now.

Accounts, sessions, collections, reading progress and admission requests are personal data. They are not included in public checkpoints and must not be replicated among volunteers until there is a purpose, consent or another legal basis, access control, retention periods, deletion and genuinely verified end-to-end encryption. Passwords, OAuth tokens and keys remain runtime secrets and are never repository content.

## Documentation

| Document | Contents |
| --- | --- |
| [QUALITY.md](docs/QUALITY.md) | Observed evidence, partial verification and open work |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Flows, contracts, persistence and trust boundaries |
| [AGORANODE.md](docs/AGORANODE.md) | Common format, instances, separate governance and preservation (Italian) |
| [GOVERNANCE.md](docs/GOVERNANCE.md) | PR1, PR2, PR3, assemblies, mandates and constitutional limits (Italian) |
| [DISTRIBUTED-NETWORK.md](docs/DISTRIBUTED-NETWORK.md) | Network target, threat model, phases and measured limits (Italian) |
| [PUBLIC-REPLICATION.md](docs/PUBLIC-REPLICATION.md) | Locally tested public-knowledge replication kernel (Italian) |
| [SELF-HOSTING.md](docs/SELF-HOSTING.md) | Local server, read-only node, HTTPS, backup and checkpoints |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Server configuration and migrations |
| [PUBLICATION.md](docs/PUBLICATION.md) | Testing a public instance and operational requirements |
| [LIBRARY.md](docs/LIBRARY.md) | Catalogue, online reading, history, statistics and provenance |
| [COMMUNITY.md](docs/COMMUNITY.md) | Accounts, admissions, discussions and voting |
| [SOURCES.md](docs/SOURCES.md) | News sources and link checks |
| [LEGAL-OPERATIONS.md](docs/LEGAL-OPERATIONS.md) | Privacy, moderation, content and operator responsibility |
| [LICENSING.md](docs/LICENSING.md) | Licenses for code, dependencies and third-party content |
