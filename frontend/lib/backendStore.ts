import { promises as fs } from "fs";
import path from "path";
import { ethers } from "ethers";
import { recordSecuritySignal } from "@/lib/securityMonitor";
import { getRuntimeDataPath } from "@/lib/runtimeDataPath";

const STORE_PATH = getRuntimeDataPath("backend-store.json");
const AUDIT_PATH = getRuntimeDataPath("audit-log.jsonl");
const AUDIT_META_PATH = getRuntimeDataPath("audit-log.meta.json");

export type ProofEvidence = {
  nfcTag?: string;
  qrPayload?: string;
  capturedAt?: string;
  latitude?: number;
  longitude?: number;
  imageHash?: string;
  metadataHash?: string;
  metadata?: Record<string, unknown>;
};

export type ProofRecord = {
  proofId: string;
  questId: string;
  proofHash: string;
  receivedAt: string;
  evidence: ProofEvidence;
};

export type QuestState = {
  questId: string;
  status: "proof_received" | "verified" | "signing_failed" | "signed";
  lastUpdatedAt: string;
  verifiedAt?: string;
  verifiedProofHash?: string;
  verificationReasons?: string[];
  signedNonces: number[];
};

type Store = {
  proofs: Record<string, ProofRecord[]>;
  quests: Record<string, QuestState>;
};

export type AuditEvent =
  | "proof_received"
  | "proof_rejected"
  | "verification_succeeded"
  | "verification_failed"
  | "signature_issued"
  | "signature_failed";

type AuditRecord = {
  seq: number;
  at: string;
  event: AuditEvent;
  questId: string;
  success: boolean;
  prevHash: string;
  hash: string;
  detail: Record<string, unknown>;
};

type AuditMeta = {
  lastSeq: number;
  lastHash: string;
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function ensureStore() {
  const dir = path.dirname(STORE_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    const seed: Store = { proofs: {}, quests: {} };
    await fs.writeFile(STORE_PATH, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function readStore(): Promise<Store> {
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw || "{}");
    return {
      proofs: parsed.proofs || {},
      quests: parsed.quests || {},
    };
  } catch {
    return { proofs: {}, quests: {} };
  }
}

async function writeStore(store: Store) {
  await ensureStore();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

async function ensureAuditMeta() {
  await fs.mkdir(path.dirname(AUDIT_META_PATH), { recursive: true });
  try {
    await fs.access(AUDIT_META_PATH);
  } catch {
    const seed: AuditMeta = { lastSeq: 0, lastHash: "GENESIS" };
    await fs.writeFile(AUDIT_META_PATH, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function readAuditMeta(): Promise<AuditMeta> {
  await ensureAuditMeta();
  const raw = await fs.readFile(AUDIT_META_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw || "{}");
    return {
      lastSeq: Number(parsed.lastSeq || 0),
      lastHash: typeof parsed.lastHash === "string" ? parsed.lastHash : "GENESIS",
    };
  } catch {
    return { lastSeq: 0, lastHash: "GENESIS" };
  }
}

async function writeAuditMeta(meta: AuditMeta) {
  await ensureAuditMeta();
  await fs.writeFile(AUDIT_META_PATH, JSON.stringify(meta, null, 2), "utf8");
}

export function computeProofHash(questId: string, evidence: ProofEvidence): string {
  const payload = stableStringify({ questId, evidence });
  return ethers.keccak256(ethers.toUtf8Bytes(payload));
}

export async function addProof(questId: string, evidence: ProofEvidence, clientProofHash?: string) {
  const proofHash = computeProofHash(questId, evidence);
  if (clientProofHash && clientProofHash.toLowerCase() !== proofHash.toLowerCase()) {
    throw new Error("tampered_payload_hash_mismatch");
  }

  const store = await readStore();
  const arr = store.proofs[questId] || [];

  const record: ProofRecord = {
    proofId: ethers.keccak256(ethers.toUtf8Bytes(`${questId}:${proofHash}:${Date.now()}:${arr.length}`)),
    questId,
    proofHash,
    receivedAt: new Date().toISOString(),
    evidence,
  };

  arr.push(record);
  store.proofs[questId] = arr;

  const existing = store.quests[questId];
  if (!existing) {
    store.quests[questId] = {
      questId,
      status: "proof_received",
      lastUpdatedAt: record.receivedAt,
      signedNonces: [],
    };
  } else if (existing.status !== "verified" && existing.status !== "signed") {
    existing.status = "proof_received";
    existing.lastUpdatedAt = record.receivedAt;
  }

  await writeStore(store);
  return record;
}

export async function getProofs(questId: string) {
  const store = await readStore();
  return store.proofs[questId] || [];
}

export async function getQuestState(questId: string) {
  const store = await readStore();
  return store.quests[questId] || null;
}

export async function markVerified(questId: string, verifiedProofHash: string, reasons: string[]) {
  const store = await readStore();
  const now = new Date().toISOString();
  const current = store.quests[questId];
  const signedNonces = current?.signedNonces || [];
  store.quests[questId] = {
    questId,
    status: "verified",
    lastUpdatedAt: now,
    verifiedAt: now,
    verifiedProofHash,
    verificationReasons: reasons,
    signedNonces,
  };
  await writeStore(store);
  return store.quests[questId];
}

export async function markVerificationFailed(questId: string, reasons: string[]) {
  const store = await readStore();
  const now = new Date().toISOString();
  const current = store.quests[questId];
  store.quests[questId] = {
    questId,
    status: "proof_received",
    lastUpdatedAt: now,
    signedNonces: current?.signedNonces || [],
    verificationReasons: reasons,
    verifiedProofHash: current?.verifiedProofHash,
    verifiedAt: current?.verifiedAt,
  };
  await writeStore(store);
  return store.quests[questId];
}

export async function reserveNonce(questId: string, nonce: number) {
  const store = await readStore();
  const q = store.quests[questId];
  if (!q) throw new Error("quest_not_found");
  if (q.signedNonces.includes(nonce)) throw new Error("nonce_already_signed");
  q.signedNonces.push(nonce);
  q.lastUpdatedAt = new Date().toISOString();
  await writeStore(store);
}

export async function markSignatureFailed(questId: string) {
  const store = await readStore();
  const q = store.quests[questId];
  if (!q) return;
  q.status = "signing_failed";
  q.lastUpdatedAt = new Date().toISOString();
  await writeStore(store);
}

export async function markSigned(questId: string) {
  const store = await readStore();
  const q = store.quests[questId];
  if (!q) return;
  q.status = "signed";
  q.lastUpdatedAt = new Date().toISOString();
  await writeStore(store);
}

export async function appendAuditLog(
  event: AuditEvent,
  questId: string,
  success: boolean,
  detail: Record<string, unknown>
) {
  const dir = path.dirname(AUDIT_PATH);
  await fs.mkdir(dir, { recursive: true });

  const meta = await readAuditMeta();
  const seq = meta.lastSeq + 1;
  const at = new Date().toISOString();
  const prevHash = meta.lastHash;
  const hashPayload = JSON.stringify({ seq, at, event, questId, success, detail, prevHash });
  const hash = ethers.keccak256(ethers.toUtf8Bytes(hashPayload));

  const rec: AuditRecord = {
    seq,
    at,
    event,
    questId,
    success,
    prevHash,
    hash,
    detail,
  };
  await fs.appendFile(AUDIT_PATH, `${JSON.stringify(rec)}\n`, "utf8");
  await writeAuditMeta({ lastSeq: seq, lastHash: hash });
  await recordSecuritySignal(rec);
}
