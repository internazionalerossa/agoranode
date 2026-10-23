# AgoràNode

**Open-source software for communities that explore knowledge, follow news, and make decisions together.**

[Italiano](README.md) · [Contributing](CONTRIBUTING.md) · [Self-hosting](docs/SELF-HOSTING.md) · [Architecture](docs/ARCHITECTURE.md) · [Verified status](docs/QUALITY.md)

AgoràNode brings a news and video reader, a digital library, an **Atlante of interconnected articles**, narrative timelines, data and charts, and public discussion into one familiar site. Communities can focus on different topics while using shared software and retaining authority over their own sources, participants and decisions.

The code is released under **AGPL-3.0-or-later**. This is an evolving alpha, not a fully deployed peer-to-peer social network.

## Where to start

**Agorà** (site route `/agora`) is the technology reference alpha. It collects original technology sources, maintains the first published Atlante articles and offers a visual workshop for planning new communities.

**PolisRossa** (route `/polisrossa`) is the earlier application prototype whose interface, rich reading experience and forum inspired the shared product. It remains an independent thematic community, with its original data, URLs and governance.

**The directory** (route `/`) helps visitors choose a community. These routes work when the application is running; they are not evidence that an internet deployment is currently online.

## What visitors see

The top-level menu separates **News**, **Library** and **Agorà** (participation). The feed shows publishers and source links. A visitor can select *All feeds* or *Favourite feeds* without changing anyone else's reading choices.

Within **Library**, there are exactly three primary choices:

| Section | Purpose |
| --- | --- |
| **Books & reading paths** | Works, editions, documentation and reading guides |
| **Timeline & Atlante** | Narrated chronology and a searchable collection of articles |
| **Data & charts** | Measurements, comparisons and documented sources |

Only after selecting **Timeline & Atlante** do the two secondary choices appear: **Timeline** and **Atlante — Index & Search**. The Timeline is a curated narrative; an article remains searchable even if it is not selected for the main story. See [Library navigation](docs/LIBRARY-TWO-LEVEL-NAVIGATION.md).

The Agorà participation area includes a public discussion forum and **Node Studio**, a block-based editor for preparing a new community's appearance, source catalogue and introductory material. Saving a draft does not publish or politically authorize it.

## Participation and permissions

| Role | What it means |
| --- | --- |
| **Visitor** | Read public pages and conversations; select sources locally |
| **PR1** | Verified account with private drafts and permitted discussion posting |
| **PR2** | Admitted member of a specific community, subject to its governance process |
| **PR3** | Scoped, revocable federal mandate; not an infrastructure administrator |

PR2 or PR3 rights **cannot be obtained by choosing a role in the UI**. The Agorà role tour is an unprivileged preview. Its alpha forum uses authenticated PR1 discussions; it is not a PR2 voting authority or a PR3 mandate issuer. The current PR1 account infrastructure still derives from the historical PolisRossa runtime and is not yet fully independent per node.

## Run it locally

Requirements: **Node.js 24+** and Git.

```bash
git clone https://github.com/internazionalerossa/agoranode.git
cd agoranode
npm ci
npm run dev
```

Vite runs the browser interface. It proxies API requests to the Node server on port 8000. Unless that backend and its PostgreSQL database are configured and running, accounts, live forum posts and other backend-backed features will show unavailable states.

For an actual self-hosted stack with Docker, PostgreSQL and HTTPS, read [Self-hosting](docs/SELF-HOSTING.md). The historical deployment preserves existing PolisRossa data; do not assume it provisions fully independent governance for every new community.

Before submitting a change, run:

```bash
npm run typecheck
npm run build
npm test
npm run benchmark:cas
```

Database migrations require a configured `DATABASE_URL` and a tested backup. Use `npm run db:migrate` deliberately; do not apply it to a live production database without a recovery plan.

## Code map

| Directory | What is there |
| --- | --- |
| `app/components/` | React interface, library, forum, editor and shared widgets |
| `app/instances/` | The initial content and sources of Agorà and PolisRossa |
| `app/lib/` | Shared navigation, search, domain contracts and validation |
| `app/platform/` | Cross-community data formats and governance contracts |
| `server/` | Node APIs, accounts, PostgreSQL migrations, public replication primitives |
| `tests/` | Automated behaviour, data and security regression checks |
| `docs/` | Deployment guides, verified status, technical decisions and remaining work |

New contributors can improve usability, accessibility, sourcing or documentation without being distributed-systems experts. Read [Contributing](CONTRIBUTING.md) for the workflow and practical review expectations.

## What works, and what does not yet

**Implemented in the repository:** reusable thematic frontend, technology news feed and saved preferences, Agorà's first published Atlante and curated timeline, the historical PolisRossa library and narrative, a visual community-draft editor, a PR1-authenticated alpha discussion forum, public revision verification, optional public read databases, and experimental signed HTTPS peer exchange and content-addressed storage.

**Not yet complete:** independent account realms and PR2 forums for every new community, automated publication after verified PR2 decisions, portable identities, distributed real-time chat, production BFT consensus, peer discovery and independently tested multi-host failover. A green CI run is not a certification of a worldwide network.

[Engineering baseline](docs/ALPHA-BASELINE.md) · [Current evidence](docs/QUALITY.md) · [Node bootstrap](docs/THEMATIC-BOOTSTRAP.md) · [Security](docs/SECURITY-REVIEW.md)

---

**One shared platform without making a single community the owner of all others.** Hardware peers should store only authorized public material; political participation is separate from hardware ownership. Private accounts and messages must never enter the public replica.
