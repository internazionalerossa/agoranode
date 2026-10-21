# PolisRossa

**News, knowledge and shared tools.** PolisRossa connects daily news with the books, history and data needed to understand it. It brings together socialist, communist, trade-union, anarchist and anticolonial sources from different countries while keeping their origin and original link visible. Readers are not asked to adopt a political position: the project offers material to verify, compare and discuss.

The editorial orientation is explicit. Automated classifications help organize content, but they do not certify the truth of a story or the political identity of a source. Translations can lose nuance; charts describe measurements and associations, but do not by themselves demonstrate causal relationships. PolisRossa therefore preserves dates, units, definitions, attribution and links to original documents.

The project aims to become a resource maintained by several people without turning the first server into the owner of the site. The current work prepares that direction in a verifiable way: the code can be copied, a local node can operate in read-only mode, a release can be attested with a signature, and encrypted database backups can be entrusted to multiple custodians. Automatic content replication, takeover between nodes, quorum and end-to-end encryption **are not implemented yet**.

[Italiano](README.md) · [Contribute](CONTRIBUTING.md) · [Architecture](docs/ARCHITECTURE.md) · [Self-hosting](docs/SELF-HOSTING.md) · [Verification status](docs/QUALITY.md)

## How to use it

The news review is the starting point for current affairs. Search, time period, region, language, source and topic filters let readers move from an international overview to the publications they want. Ordering can prioritize time or alternate countries and publishers so that one prolific outlet does not occupy the page on its own. The Observatory uses the same collection with the “Last 6 hours” period. Articles and videos open on the publisher’s site.

The Library adds context. Books and reading paths introduce topics and authors; Achievements presents events, people, repression and social transformations along a timeline; Data and charts supports comparisons between indicators, countries and periods. These three entry points remain connected, but serve different tasks: reading a text, following a historical development or checking a measurement.

Participate separates conversation from decision-making. A personal account with a confirmed email address is used for collections and reading position; PR2 admission is a separate step required to write in the forum and vote. The selected no-cost email path is Gmail SMTP for account confirmation and password reset only; it must be configured and tested on the deployed instance before those flows are considered operational. During launch, a private shared access code limits sign-ups and password-reset requests, but it is not identity evidence and does not replace email verification or abuse limits. An applicant declares a name, introduction and mandatory public HTTPS URL to Facebook, Instagram or a personal site. The reference is not verified or fetched by the server and is visible only to the applicant and PR2 reviewers. Facebook OAuth is optional evidence of account control, not civil identity; Discord does not qualify an application. Permanent discussions, proposals and outcomes live in PostgreSQL; chat is intentionally temporary and remains in the memory of a single process. Features available on a public instance depend on its configuration and actual testing, not merely on the presence of code.

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
| Historical series and metadata | Public files loaded per indicator | Source, unit, period and values remain together |
| Retrieved feeds, images and documents | Limited cache of public data | Destinations, redirects, types and sizes are checked |
| Book texts read online | Persistent revisions in PostgreSQL, imported only from an explicit rights register | No remote retrieval during a visit; other editions remain in the original archive |
| Accounts, sessions, bookmarks and progress | PostgreSQL | Private to each account, never part of the public cache |
| Forum, admissions and votes | PostgreSQL of the instance that accepts writes | Public or restricted according to the rules; not replicated between nodes |
| Chat | Process memory, in 48-hour windows | It can disappear sooner after a restart; it is not included in database backups |

The ordinary path is `browser → Node server → public source` for consultation and `browser → Node server → PostgreSQL` for personal and community data. The server does not accept arbitrary proxy destinations from visitors and renders remote text as inert content without executing source markup.

## Sharing custody without inventing a blockchain

Continuity requires distinct tasks. Copying the code, attesting a release, keeping a backup and deciding on a change are not the same operation.

It is currently possible to:

1. clone the repository and build the same application;
2. start an independent read-only node with its own database and configuration;
3. sign a deterministic release checkpoint with Ed25519 and verify that another node has already built the same executable files;
4. produce an age-encrypted PostgreSQL backup and give copies to multiple custodians;
5. test restoration in a separate database without touching the operational one.

The current checkpoint is `release-only`: it contains a manifest and signature, but does not transfer code, books, forum, accounts or a database. Importing it records only provenance and the local chain head. A public key must be verified through an independent channel; the signature proves correspondence with that key, not the political or technical quality of the software.

An age backup can be read by every recipient whose public key was included. This allows several custodians to keep a copy, but it does **not** automatically divide decryption power among them and does not replace consensus, replication or access control.

These foundations do not yet keep “one shared site” alive if the server that owns the database disappears. A node that remains online can serve its own code and retrieve public sources independently; it does not automatically receive data from the offline instance or inherit its address. The complete procedure and commands are in [SELF-HOSTING.md](docs/SELF-HOSTING.md).

## Ownership, operator role and decisions

Someone who keeps a computer running provides a technical resource: doing so does not grant editorial rights, additional votes or ownership of the project. Likewise, the technical name `primary` indicates only an instance on which writes may be enabled; it does not mean primary political authority.

Today, however, decisions and writes still depend on the instance and the credentials that administer it. The project does not yet have a protocol capable of enforcing the duration of a mandate, its revocation or a quorum decision across independent computers. It would be inaccurate to present the current system as already guaranteeing collective ownership.

The governance goal is a **temporary, limited and revocable** custody mandate, not a permanent personal right to the final word. To become real, it will need to define at least:

- who may propose, approve and revoke a mandate, and with what threshold;
- duration, expiry and narrowly scoped emergency powers;
- a verifiable decision record and a challenge procedure;
- key rotation and recovery without entrusting keys to one person;
- transfer of service and public data to new custodians;
- separate treatment of personal data, which cannot be copied to a public network by default.

Until these constraints are implemented and tested, Git preserves technical history and the instance forum preserves community discussion, but neither one alone creates distributed sovereignty.

## Persistent library, encyclopedia and shareable content

A first part of this work is implemented without changing the site’s main structure. The administrative importer accepts only book/language pairs present in the rights register; it stores chapters, attribution, license, source, revision date and SHA-256 fingerprints in PostgreSQL. Revisions are not overwritten. During a visit the reader uses only the persistent copy and the server checks permission again: absence or revocation does not trigger a remote retrieval of the text. The initial register contains one English edition, *Free, Fair and Alive* under CC BY-SA 4.0; all other editions remain linked to their respective archives until the specific edition has been verified.

The timeline is no longer only one long page: all 64 entries have stable identifiers and shareable pages. An initial encyclopedic index brings together 17 referenced people, with roles, events and sources already present in the project. This is a verifiable beginning, not a complete Wikipedia: organizations, places, works and many other people still need a uniform model and editorial review.

A book position, an event or person page, and the state of a chart have permanent links. Charts can also be exported as images that keep title, source, unit, period and link together. For books, articles and events the built-in sharing function shares the link; it cannot prevent a manual screenshot from cropping out attribution or context. A screenshot does not authorize republication of protected material and does not replace the source.

Still to be built are the documented expansion of the book archive, pages for all other entity types, exportable public snapshots, synchronization and automatic takeover between nodes. These must not be confused with encrypted backups or signed checkpoints: automatic replication, infrastructure quorum and end-to-end encryption **are not implemented**.

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
node scripts/selfhost.mjs status
```

The default installation listens only on the local computer and keeps configuration, data and keys outside Git. Stopping it with `node scripts/selfhost.mjs stop` does not delete volumes. Do not use `docker compose down -v` on an installation that must be preserved.

A second checkout can be initialized as a read-only node with a distinct project and ports:

```sh
node scripts/selfhost.mjs init https://localhost:9443 mirror --project polisrossa-node2 --http-port 9080
node scripts/selfhost.mjs start
```

A local node does not require router changes. [PUBLICATION.md](docs/PUBLICATION.md) describes the selected Tailscale Funnel path, without WAN port forwarding; [SELF-HOSTING.md](docs/SELF-HOSTING.md) instead documents the local runtime, backup, restore, checkpoints and the direct alternative that would require router and firewall changes. Do not publish `.selfhost`, `.env` files, tokens, keys, cookies or database copies.

## Participate

No programming knowledge is required. A useful report names the page, what is unclear or broken, and the desired result; for books, events and data, it adds verifiable references and, when available, the license. Do not publish personal data or confidential documents.

Editorial and product proposals belong in the community instance’s forum when that service is operational. GitHub preserves source changes and technical reviews: you can use the pencil icon on a file, create a fork and open a pull request. The [contribution guide](CONTRIBUTING.md) explains both paths for people who have never used them before.

## Privacy, security and licenses

Original code is distributed under **AGPL-3.0-or-later**. Anyone offering a modified version online must make the corresponding source available as required by the license. [NOTICE](NOTICE) collects notices and warranty limitations; [TRADEMARKS.md](TRADEMARKS.md) distinguishes the right to modify the code from the use of the name and logo to present a service as official.

Articles, photographs, videos, books, translations and datasets retain the terms set by their respective rights holders. Free access does not imply a right to copy or redistribute them. Every persistent import must therefore record provenance and rights, and provide for correction or removal.

Accounts, sessions, collections, reading progress and admission requests are personal data. They are not included in public checkpoints and must not be replicated among volunteers until there is a purpose, consent or another legal basis, access control, retention periods, deletion and genuinely verified end-to-end encryption. Passwords, OAuth tokens and keys remain runtime secrets and are never repository content.

## Documentation

| Document | Contents |
| --- | --- |
| [QUALITY.md](docs/QUALITY.md) | Observed evidence, partial verification and open work |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Flows, contracts, persistence and trust boundaries |
| [SELF-HOSTING.md](docs/SELF-HOSTING.md) | Local server, read-only node, HTTPS, backup and checkpoints |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Server configuration and migrations |
| [PUBLICATION.md](docs/PUBLICATION.md) | Testing a public instance and operational requirements |
| [LIBRARY.md](docs/LIBRARY.md) | Catalogue, online reading, history, statistics and provenance |
| [COMMUNITY.md](docs/COMMUNITY.md) | Accounts, admissions, discussions and voting |
| [SOURCES.md](docs/SOURCES.md) | News sources and link checks |
| [LEGAL-OPERATIONS.md](docs/LEGAL-OPERATIONS.md) | Privacy, moderation, content and operator responsibility |
| [LICENSING.md](docs/LICENSING.md) | Licenses for code, dependencies and third-party content |
