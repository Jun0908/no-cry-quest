import { promises as fs } from "fs";
import path from "path";
import { ethers } from "ethers";
import { splitSecret } from "@/lib/shamir";

const STORE_PATH = path.resolve(process.cwd(), "data", "shamir-sessions.json");
const DEFAULT_TTL_MS = 30 * 60 * 1000;

export type SessionStatus = "collecting" | "ready" | "timed_out" | "cancelled" | "completed";

export type SessionPlayer = {
  walletAddress: string;
  share: string;
  claimToken: string;
  claimedAt?: string;
};

export type ShamirSession = {
  sessionId: string;
  questId: string;
  threshold: number;
  shares: number;
  status: SessionStatus;
  participants: SessionPlayer[];
  expiresAt: number;
  createdAt: string;
  updatedAt: string;
  policy: {
    allowReinvite: boolean;
    allowCancel: boolean;
  };
  reinviteCount: number;
  completedAt?: string;
};

type SessionStore = {
  sessions: Record<string, ShamirSession>;
};

async function ensureStore() {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify({ sessions: {} }, null, 2), "utf8");
  }
}

async function readStore(): Promise<SessionStore> {
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw || "{}");
    return { sessions: parsed.sessions || {} };
  } catch {
    return { sessions: {} };
  }
}

async function writeStore(store: SessionStore) {
  await ensureStore();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function normalizeAddress(addr: string) {
  return addr.toLowerCase();
}

function dedupAddresses(addrs: string[]) {
  return [...new Set(addrs.map(normalizeAddress))];
}

function createClaimToken(sessionId: string, walletAddress: string) {
  return ethers.keccak256(ethers.toUtf8Bytes(`${sessionId}:${walletAddress}:${Date.now()}:${Math.random()}`));
}

function deriveSessionId(questId: string) {
  return ethers.keccak256(ethers.toUtf8Bytes(`${questId}:${Date.now()}:${Math.random()}`));
}

function getExpiry(ttlMs?: number) {
  const ttl = ttlMs && ttlMs > 0 ? ttlMs : DEFAULT_TTL_MS;
  return Date.now() + ttl;
}

export async function createSession(params: {
  questId: string;
  secret: string;
  participantWallets: string[];
  threshold?: number;
  shares?: number;
  ttlMs?: number;
}) {
  const shares = params.shares ?? 4;
  const threshold = params.threshold ?? 4;
  if (shares < 2) throw new Error("invalid_shares");
  if (threshold < 2 || threshold > shares) throw new Error("invalid_threshold");

  const wallets = dedupAddresses(params.participantWallets);
  if (wallets.length !== shares) {
    throw new Error("participants_must_match_shares");
  }

  const generated = splitSecret(params.secret, shares, threshold);
  const sessionId = deriveSessionId(params.questId);
  const nowIso = new Date().toISOString();

  const participants: SessionPlayer[] = wallets.map((walletAddress, index) => ({
    walletAddress,
    share: generated[index],
    claimToken: createClaimToken(sessionId, walletAddress),
  }));

  const session: ShamirSession = {
    sessionId,
    questId: params.questId,
    threshold,
    shares,
    status: "collecting",
    participants,
    expiresAt: getExpiry(params.ttlMs),
    createdAt: nowIso,
    updatedAt: nowIso,
    policy: {
      allowReinvite: true,
      allowCancel: true,
    },
    reinviteCount: 0,
  };

  const store = await readStore();
  store.sessions[sessionId] = session;
  await writeStore(store);

  return {
    session,
    delivery: participants.map((p) => ({
      walletAddress: p.walletAddress,
      claimToken: p.claimToken,
    })),
  };
}

export async function getSession(sessionId: string) {
  const store = await readStore();
  const session = store.sessions[sessionId];
  if (!session) return null;
  if (Date.now() > session.expiresAt && session.status === "collecting") {
    session.status = "timed_out";
    session.updatedAt = new Date().toISOString();
    await writeStore(store);
  }
  return session;
}

export async function claimShare(params: {
  sessionId: string;
  walletAddress: string;
  claimToken: string;
  timestamp: number;
  signature: string;
}) {
  const session = await getSession(params.sessionId);
  if (!session) throw new Error("session_not_found");
  if (session.status !== "collecting") throw new Error("session_not_collecting");
  if (Date.now() > session.expiresAt) throw new Error("session_expired");
  if (Math.abs(Date.now() - params.timestamp) > 5 * 60 * 1000) throw new Error("timestamp_skew");

  const message = `${params.sessionId}:${params.claimToken}:${params.timestamp}`;
  const recovered = ethers.verifyMessage(message, params.signature);
  if (normalizeAddress(recovered) !== normalizeAddress(params.walletAddress)) throw new Error("invalid_signature");

  const player = session.participants.find((p) => normalizeAddress(p.walletAddress) === normalizeAddress(params.walletAddress));
  if (!player) throw new Error("wallet_not_in_session");
  if (player.claimToken !== params.claimToken) throw new Error("invalid_claim_token");

  player.claimedAt = new Date().toISOString();
  session.updatedAt = new Date().toISOString();

  const store = await readStore();
  store.sessions[session.sessionId] = session;
  await writeStore(store);

  return { share: player.share, questId: session.questId, threshold: session.threshold, shares: session.shares };
}

export async function extendSession(sessionId: string, ttlMs?: number) {
  const store = await readStore();
  const session = store.sessions[sessionId];
  if (!session) throw new Error("session_not_found");
  if (!session.policy.allowReinvite) throw new Error("reinvite_not_allowed");
  if (session.status === "cancelled" || session.status === "completed") throw new Error("session_closed");

  session.expiresAt = getExpiry(ttlMs);
  session.status = "collecting";
  session.reinviteCount += 1;
  session.updatedAt = new Date().toISOString();
  await writeStore(store);
  return session;
}

export async function cancelSession(sessionId: string, reason: string) {
  const store = await readStore();
  const session = store.sessions[sessionId];
  if (!session) throw new Error("session_not_found");
  if (!session.policy.allowCancel) throw new Error("cancel_not_allowed");

  session.status = "cancelled";
  session.updatedAt = new Date().toISOString();
  session.completedAt = new Date().toISOString();
  await writeStore(store);
  return { session, reason };
}

export async function markSessionCompleted(sessionId: string) {
  const store = await readStore();
  const session = store.sessions[sessionId];
  if (!session) throw new Error("session_not_found");
  session.status = "completed";
  session.updatedAt = new Date().toISOString();
  session.completedAt = new Date().toISOString();
  await writeStore(store);
  return session;
}
