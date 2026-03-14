import { promises as fs } from "fs";
import path from "path";
import { ethers } from "ethers";
import { getRuntimeDataPath } from "@/lib/runtimeDataPath";

const STORE_PATH = getRuntimeDataPath("agent-runtime.json");

export type AgentRole = "player" | "operator" | "agent";

export type AgentMessage = {
  id: string;
  role: AgentRole;
  speaker: string;
  text: string;
  createdAt: string;
};

export type LongTermMemory = {
  deceasedIntent: string;
  distributionPhilosophy: string;
  tone: string;
  objective: string;
};

export type AgentSession = {
  sessionId: string;
  questId: string;
  createdAt: string;
  updatedAt: string;
  participants: string[];
  persona: {
    style: string;
    values: string[];
    objective: string;
  };
  safetyRules: string[];
  memory: {
    messages: AgentMessage[];
    shardSubmissions: string[];
    plannerNotes: string[];
  };
};

type AgentStore = {
  sessions: Record<string, AgentSession>;
  longTermMemory: LongTermMemory;
};

function defaultLongTermMemory(): LongTermMemory {
  return {
    deceasedIntent: "家族と仲間の信頼を守り、透明性を優先して資産を引き継ぐ",
    distributionPhilosophy: "単独判断を避け、4人の合意確認を経て分配を進める",
    tone: "冷静で敬意のある口調",
    objective: "常に次アクションを明確化し、条件不足を具体的に示す",
  };
}

async function ensureStore() {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    const seed: AgentStore = {
      sessions: {},
      longTermMemory: defaultLongTermMemory(),
    };
    await fs.writeFile(STORE_PATH, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function readStore(): Promise<AgentStore> {
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw || "{}");
    return {
      sessions: parsed.sessions || {},
      longTermMemory: parsed.longTermMemory || defaultLongTermMemory(),
    };
  } catch {
    return {
      sessions: {},
      longTermMemory: defaultLongTermMemory(),
    };
  }
}

async function writeStore(store: AgentStore) {
  await ensureStore();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

export async function createAgentSession(params: {
  questId: string;
  participants: string[];
  personaStyle?: string;
}) {
  const store = await readStore();
  const sessionId = ethers.keccak256(ethers.toUtf8Bytes(`${params.questId}:${Date.now()}:${Math.random()}`));
  const now = new Date().toISOString();

  const session: AgentSession = {
    sessionId,
    questId: params.questId,
    createdAt: now,
    updatedAt: now,
    participants: [...new Set(params.participants.map((p) => p.toLowerCase()))],
    persona: {
      style: params.personaStyle || "誠実で簡潔、断定よりも根拠提示を優先",
      values: ["透明性", "安全性", "合意形成", "再現可能性"],
      objective: "Questを完了に進める具体アクション提示",
    },
    safetyRules: [
      "違法行為、危険行為、鍵の漏えいを助長しない",
      "本人以外のなりすましや署名偽造を案内しない",
      "不確実な場合は不明点を明示し追加情報を要求する",
    ],
    memory: {
      messages: [],
      shardSubmissions: [],
      plannerNotes: [],
    },
  };

  store.sessions[sessionId] = session;
  await writeStore(store);
  return session;
}

export async function getAgentSession(sessionId: string) {
  const store = await readStore();
  return store.sessions[sessionId] || null;
}

export async function updateAgentSession(session: AgentSession) {
  const store = await readStore();
  session.updatedAt = new Date().toISOString();
  store.sessions[session.sessionId] = session;
  await writeStore(store);
  return session;
}

export async function appendSessionMessage(
  sessionId: string,
  message: Omit<AgentMessage, "id" | "createdAt">
) {
  const store = await readStore();
  const session = store.sessions[sessionId];
  if (!session) throw new Error("session_not_found");

  const entry: AgentMessage = {
    id: ethers.keccak256(ethers.toUtf8Bytes(`${sessionId}:${Date.now()}:${Math.random()}`)),
    role: message.role,
    speaker: message.speaker,
    text: message.text,
    createdAt: new Date().toISOString(),
  };
  session.memory.messages.push(entry);
  session.updatedAt = new Date().toISOString();
  await writeStore(store);
  return entry;
}

export async function setSessionShardSnapshot(sessionId: string, walletAddresses: string[]) {
  const store = await readStore();
  const session = store.sessions[sessionId];
  if (!session) throw new Error("session_not_found");
  session.memory.shardSubmissions = [...new Set(walletAddresses.map((w) => w.toLowerCase()))];
  session.updatedAt = new Date().toISOString();
  await writeStore(store);
}

export async function appendPlannerNote(sessionId: string, note: string) {
  const store = await readStore();
  const session = store.sessions[sessionId];
  if (!session) throw new Error("session_not_found");
  session.memory.plannerNotes.push(note);
  session.updatedAt = new Date().toISOString();
  await writeStore(store);
}

export async function getLongTermMemory() {
  const store = await readStore();
  return store.longTermMemory;
}
