# Continuous synchronization without continuous full-database backups

**Engineering design and partial implementation, 22 October 2026.** The protocol is not a globally consistent distributed database. A one-second index poll is available for previously finalized public packages; real user writes and finalized network replication still have separate lifecycle and authorization requirements.

## Three distinct clocks

A system receiving a user contribution has at least three different notions of time:

1. **Local commit:** a transaction is durably committed to the user's responsible server/database. For local PostgreSQL this depends on WAL/fsync and configuration. Database consistency is local to that server, not automatically global.
2. **Approval/finality:** public editorial or governance publication is approved; a verified checkpoint is finalized. This may take minutes, hours or longer, and a quorum outage may stop advancement. A draft is never published merely because it was saved.
3. **Remote convergence:** independent peers learn which approved checkpoint exists and retrieve/validate the missing objects. Connectivity and custody determine the delay.

Do **not** promise «every user write is backed up to everyone within one second». Such a rule would expose personal data, require all peers to store everything, and force the slowest home network to control application latency. Private recovery uses a restricted encrypted backup mechanism, not the public knowledge network.

## The minimal mechanism

```text
User edits a private draft / submits a forum proposal
            |
      authn/authz and SQL transaction
            |
        local durable state
            |
    review, source rights and local decision
            |
     approved public revision
            |
       knowledge_audit_events
       (transactionally generated on SQL change)
            |
  readCommittedKnowledgeDeltas(spaceId, cursor)
            |
    validate licence + governing authorization
            |
       signed finalized checkpoint
            |
        public peer index + ETag
            |
     poll/watch: If-None-Match, 304 when unchanged
            |
    download only missing verified packages
            |
    import/verify into local PostgreSQL index
```

The **existing** knowledge store has `knowledge_audit_events` and SQL triggers for revision import/current-pointer changes. `server/knowledge-delta.ts` now provides a bounded **local-only** cursor into those committed events, keyed by `spaceId`, without copying account rows, payloads or the whole database. The cursor's global numeric sequence can contain gaps when different communities write interleaved events; the order is meaningful, not the density of numbers.

This is not a public endpoint, federation consensus, or a permission to automatically publish every event. A later authorized publishing worker must sign/finalize the appropriate state before handing it to the network.

The opt-in `peer:watch` runner periodically polls one to eight explicitly configured HTTPS origins. With a persistent in-process ETag and a server-side verification cache, unchanged indexes can return HTTP 304 with no JSON body. The configured default is **one-second polling**, not guaranteed propagation within one second. Failures do not roll back a previously finalized local head. Unchanged locally verified files can skip repeat body downloads; periodic revalidation is required to detect storage errors.

## Future v2 incremental object protocol

Current knowledge v1 packages contain cumulative bundles. This is expensive if a new public fact produces another full bundle. The experimental public content-addressed codec can split a large object into deterministic SHA-256 blocks. Before using it for live knowledge:

- Bind a v2 manifest to an authorized, finalized checkpoint, including `networkId`, `spaceId`, immutable block hashes, source/rights metadata, root hash and protocol version.
- Announce checkpoint heads only after all required public blocks are durable and verified. Do not publish incomplete bundles or accept a signer with authority over a different space.
- Compare missing hashes; fetch only the missing blocks from available custodians. Verify size, hash, source authorization, schema and namespace before committing the new head atomically.
- Keep storage quotas and explicit pinning per community. A peer may offer 20 GiB for one space, not every archive of every space. Distribution capacity grows by participant choice.
- Maintain an authenticated checkpoint history and GC policy; retain legally required correction history without indiscriminately preserving user-private data.
- Use separate protocols for public forum events, transient rooms and user-private content. A Atlante checkpoint does not become a master blockchain for all interactions.

## Strong consistency only where required

| Workload | Consistency model | Reason |
| --- | --- | --- |
| Draft saved by user | Local transactional durability + restricted recovery | Privacy and low latency |
| Forum post/moderation | Locally authoritative signed events, eventually delivered under policy | Availability and local autonomy |
| Temporary chat | Per-room ephemeral delivery, bounded retention; E2E for private rooms when implemented | Not an immutable ledger |
| RSS and third-party references | Local cache/scheduled retrieval plus external attribution | No expensive consensus needed |
| Atlante revision **current pointer** | Locally authorized decision and finalized checkpoint before global promotion | Prevent forked official history |
| Federation mandates and constitutional votes | Separately certified political decision, technical BFT finality | Authority cannot depend on host count |
| Large public licensed editions/media | Immutable content-addressed blocks with selective custody | Store once per peer, deduplicate reusable blocks |
| Personal backup | Encrypted, restricted, versioned recovery with deletion process | Not suitable for open replicas |

Network partitions force a choice. A minority disconnected from quorum can still **read** finalized material and collect drafts locally. It cannot silently become the authoritative source for irreversible governed decisions. When the connection returns, drafts may need conflict resolution and explicit user consent.

## Why not deploy a huge distributed SQL cluster on home PCs?

CockroachDB/YugabyteDB/Raft, Cassandra/ScyllaDB, rqlite/SQLite, NATS, libp2p, IPFS, K3s, Ceph and Nomad address *different operational needs*. None can repeal Internet latency, NAT, heterogeneous participant trust, copyright and privacy constraints.

| Candidate | Where it could help | Why it is **not** automatically the default |
| --- | --- | --- |
| PostgreSQL/WAL, a small transactional outbox | Current single-space transactions, indexing and immutable audit | Does not replicate safely across untrusted peers by itself |
| SQLite + local object store | A low-resource read replica/client | Separate migrations, storage and protocol required |
| Raft-based distributed SQL | Trusted, low-latency, administered cluster | Not appropriate as automatic quorum for untrusted global home PCs |
| Cassandra/Scylla | High-volume AP/event workloads | Significant administration, different query model and no political finality |
| NATS | Service-to-service event transport in a managed installation | Another operational component; not durable public consensus |
| libp2p | Peer identity, NAT traversal and discovery | Must be integrated and tested; does not provide the knowledge business rules |
| IPFS/CAR | Standardized public immutable objects | Requires pinning, content rights, quotas and trusted publication |
| Ceph/K3s/Nomad/KubeEdge | Managed infrastructure clusters | Often excess complexity for a volunteer laptop with intermittent uptime |
| WireGuard/Tailscale | Operator-approved encrypted network | Trust/discovery still require dependencies; one vendor must not be obligatory |

For AgoràNode, the first sensible production topology is a **small modular Node/PostgreSQL application**, plus explicitly opted-in read-only public replicas. Introduce other systems only after reproducible bottlenecks, failure models and cost comparison.

## Reliability and sustainability metrics

Measure, don't extrapolate from a one-byte synthetic benchmark:

- **RPO** (committed private changes lost on host failure) and **RTO** (time to recover), separately from network checkpoint latency.
- P50/P95/P99 observed time from **finalized public checkpoint** to receipt at online peers, accounting for offline custodians.
- Bytes over the wire per changed public byte; distinct blocks pinned per community; verification CPU, peak RAM and energy.
- Availability of independently controlled gateways, distribution of peer ownership, disk pressure, rate of failed/slow transports.
- Permission leakage tests, legal takedown response, recoverability after key loss and restoration drills.

Starting **proposed** service targets are in [DISTRIBUTED-NETWORK.md](DISTRIBUTED-NETWORK.md). They are not measured guarantees.

## Operational and safety gates

Do not attach `peer:watch` to production user-private databases or a public write API. It observes read-only signed packages. The experimental cursor is for local approved public knowledge only and must not become an unrestricted remote feed. Before any general release of v2, require network host tests, external cryptographic review, copyright/privacy assessment, long-running disk/partition tests, signed upgrades, non-divergence proofs and a well-defined rollback or read-only recovery strategy.

See [PEER-EXCHANGE.md](PEER-EXCHANGE.md), [LEAN-STORAGE.md](LEAN-STORAGE.md), [NODE-KNOWLEDGE-GRAPH.md](NODE-KNOWLEDGE-GRAPH.md), and [SECURITY-REVIEW.md](SECURITY-REVIEW.md).
