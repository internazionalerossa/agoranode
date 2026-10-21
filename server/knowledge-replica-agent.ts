import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
} from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalKnowledgeJson } from "../app/lib/knowledge-model";
import type { Connections } from "./database";
import {
  importKnowledgeReplicationPackage,
  type KnowledgeReplicaImportOptions,
  type KnowledgeReplicaImportResult,
} from "./knowledge-replica-import";
import {
  KnowledgeReplicationError,
} from "./knowledge-replication";
import {
  validateKnowledgeReplicationPackage,
  type KnowledgeReplicationPackage,
} from "./knowledge-replication-finality";
import { migrateDatabase } from "./migrations";
import { connections, createPool } from "./pool";

const FINAL_NAME = /^[0-9]{16}-[0-9a-f]{64}\.knowledge-final\.json$/;
const MAX_PACKAGE_BYTES = 64 * 1024 * 1024;
const MAX_FILES_PER_SCAN = 10_000;

export type KnowledgeReplicaDirectoryOptions = KnowledgeReplicaImportOptions & {
  pool: Connections;
  inboxDirectory: string;
  outboxDirectory?: string;
};

export type KnowledgeReplicaFileResult =
  | {
      file: string;
      status: "accepted" | "already-accepted";
      import: KnowledgeReplicaImportResult;
    }
  | { file: string; status: "rejected"; error: string; retryable: boolean };

async function finalizedNames(directory: string) {
  const entries = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && FINAL_NAME.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  if (entries.length > MAX_FILES_PER_SCAN) {
    throw new Error("Replication inbox contains too many finalized files");
  }
  return entries;
}

function safeFileName(value: string) {
  if (!FINAL_NAME.test(value) || basename(value) !== value) {
    throw new Error("Replication package name is invalid");
  }
  return value;
}

async function readFinalPackage(path: string) {
  const before = await lstat(path);
  if (!before.isFile() || before.isSymbolicLink() || before.size > MAX_PACKAGE_BYTES) {
    throw new Error("Replication package is not a regular bounded file");
  }
  const bytes = await readFile(path);
  const after = await lstat(path);
  if (
    after.size !== before.size ||
    after.mtimeMs !== before.mtimeMs ||
    bytes.length !== before.size
  ) {
    throw new Error("Replication package changed while it was being read");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("Replication package is not JSON");
  }
  return { parsed, text: bytes.toString("utf8"), stamp: `${before.size}:${before.mtimeMs}` };
}

function packageFileName(material: KnowledgeReplicationPackage) {
  const sequence = String(material.finality.statement.sequence).padStart(16, "0");
  return `${sequence}-${material.sha256}.knowledge-final.json`;
}

/**
 * Atomically publishes an already finalized public package. Synchronizers see
 * only the final filename: temporary or half-written files are ignored.
 */
export async function writeKnowledgeReplicationOutbox(
  directoryValue: string,
  value: unknown,
  options: Omit<KnowledgeReplicaImportOptions, "expectedNetworkId" | "expectedSpaceId">,
) {
  const directory = resolve(directoryValue);
  const material = await validateKnowledgeReplicationPackage(value, options);
  const text = `${canonicalKnowledgeJson(material)}\n`;
  if (Buffer.byteLength(text) > MAX_PACKAGE_BYTES) {
    throw new Error("Replication package exceeds the filesystem-agent limit");
  }
  await mkdir(directory, { recursive: true });
  const name = packageFileName(material);
  const target = join(directory, name);
  try {
    const existing = await readFile(target, "utf8");
    if (existing !== text) throw new Error("Finalized outbox filename conflicts");
    return { path: target, created: false, material };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const temporary = join(
    directory,
    `.${name}.${process.pid}.${crypto.randomUUID()}.tmp`,
  );
  try {
    const handle = await open(temporary, "wx", 0o644);
    try {
      await handle.writeFile(text, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, target);
  } catch (error) {
    await rm(temporary, { force: true });
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    const existing = await readFile(target, "utf8");
    if (existing !== text) throw new Error("Finalized outbox filename conflicts");
    return { path: target, created: false, material };
  }
  return { path: target, created: true, material };
}

export async function processKnowledgeReplicationInbox(
  options: KnowledgeReplicaDirectoryOptions,
  selectedNames?: readonly string[],
): Promise<KnowledgeReplicaFileResult[]> {
  const inbox = resolve(options.inboxDirectory);
  await mkdir(inbox, { recursive: true });
  const entries = selectedNames
    ? [...selectedNames].map(safeFileName).sort()
    : await finalizedNames(inbox);
  const results: KnowledgeReplicaFileResult[] = [];
  for (const name of entries) {
    try {
      safeFileName(name);
      const { parsed, text } = await readFinalPackage(join(inbox, name));
      const material = await validateKnowledgeReplicationPackage(parsed, {
        validatorSet: options.validatorSet,
        allowLegacyBootstrap: options.allowLegacyBootstrap,
        verifyGovernanceAuthorization: options.verifyGovernanceAuthorization,
      });
      if (`${canonicalKnowledgeJson(material)}\n` !== text) {
        throw new Error("Replication package file is not canonical JSON");
      }
      if (name !== packageFileName(material)) {
        throw new Error("Replication filename does not match package sequence and digest");
      }
      const imported = await importKnowledgeReplicationPackage(
        options.pool,
        material,
        options,
      );
      if (options.outboxDirectory) {
        await writeKnowledgeReplicationOutbox(
          options.outboxDirectory,
          material,
          options,
        );
      }
      results.push({ file: name, status: imported.status, import: imported });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown replication error";
      const waitingForPredecessor =
        /must begin with the finalized genesis|leaves a gap/.test(message);
      const waitingForAuthorization =
        Boolean(options.verifyGovernanceAuthorization) &&
        /governance authorization is absent or invalid/.test(message);
      const malformedFinalFile =
        /is not JSON|is not canonical JSON|filename does not match|name is invalid|not a regular bounded file/.test(
          message,
        );
      results.push({
        file: name,
        status: "rejected",
        error: message,
        retryable:
          waitingForPredecessor ||
          waitingForAuthorization ||
          (!(error instanceof KnowledgeReplicationError) && !malformedFinalFile),
      });
    }
  }
  return results;
}

export class KnowledgeReplicaDirectoryAgent {
  readonly #seen = new Map<string, string>();

  constructor(readonly options: KnowledgeReplicaDirectoryOptions) {}

  async scan() {
    const inbox = resolve(this.options.inboxDirectory);
    await mkdir(inbox, { recursive: true });
    const names = await finalizedNames(inbox);
    const changedNames: string[] = [];
    const stamps = new Map<string, string>();
    for (const name of names) {
      const path = join(inbox, name);
      const info = await lstat(path);
      const stamp = `${info.size}:${info.mtimeMs}`;
      stamps.set(name, stamp);
      if (this.#seen.get(name) !== stamp) changedNames.push(name);
    }
    const changed = await processKnowledgeReplicationInbox(
      this.options,
      changedNames,
    );
    for (const name of changedNames) this.#seen.set(name, stamps.get(name)!);
    for (const result of changed) {
      if (result.status === "rejected" && result.retryable) {
        this.#seen.delete(result.file);
      }
    }
    for (const oldName of this.#seen.keys()) {
      if (!stamps.has(oldName)) {
        this.#seen.delete(oldName);
      }
    }
    return changed;
  }

  async run(options: { pollIntervalMs?: number; signal?: AbortSignal } = {}) {
    const interval = options.pollIntervalMs ?? 5_000;
    if (!Number.isSafeInteger(interval) || interval < 250 || interval > 3_600_000) {
      throw new Error("Replication poll interval is invalid");
    }
    while (!options.signal?.aborted) {
      const results = await this.scan();
      for (const result of results) {
        const line = JSON.stringify({
          file: result.file,
          status: result.status,
          ...(result.status === "rejected"
            ? { retryable: result.retryable, error: result.error }
            : {
                sequence: result.import.sequence,
                checkpointId: result.import.checkpointId,
              }),
        });
        (result.status === "rejected" ? process.stderr : process.stdout).write(
          `${line}\n`,
        );
      }
      await new Promise<void>((resolveWait) => {
        const timer = setTimeout(resolveWait, interval);
        options.signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            resolveWait();
          },
          { once: true },
        );
      });
    }
  }
}

function requiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing configuration: ${name}`);
  return value;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const databaseUrl = requiredEnvironment("DATABASE_URL");
    const validatorSet = JSON.parse(
      await readFile(requiredEnvironment("KNOWLEDGE_REPLICA_VALIDATOR_SET"), "utf8"),
    );
    const pool = createPool(databaseUrl);
    try {
      await migrateDatabase(connections(pool), new URL("./migrations/", import.meta.url));
      const agent = new KnowledgeReplicaDirectoryAgent({
        pool: connections(pool),
        inboxDirectory: requiredEnvironment("KNOWLEDGE_REPLICA_INBOX"),
        outboxDirectory: process.env.KNOWLEDGE_REPLICA_OUTBOX || undefined,
        validatorSet,
        expectedNetworkId: requiredEnvironment("KNOWLEDGE_REPLICA_NETWORK_ID"),
        expectedSpaceId: requiredEnvironment("KNOWLEDGE_REPLICA_SPACE_ID"),
        allowLegacyBootstrap:
          process.env.KNOWLEDGE_REPLICA_ALLOW_LEGACY_BOOTSTRAP === "true",
      });
      const once = process.argv.includes("--once");
      if (once) {
        const results = await agent.scan();
        process.stdout.write(`${JSON.stringify(results)}\n`);
      } else {
        const controller = new AbortController();
        process.once("SIGINT", () => controller.abort());
        process.once("SIGTERM", () => controller.abort());
        await agent.run({
          pollIntervalMs: Number(process.env.KNOWLEDGE_REPLICA_POLL_MS || 5_000),
          signal: controller.signal,
        });
      }
    } finally {
      await pool.end();
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Knowledge replication failed");
    process.exitCode = 1;
  }
}
