import { promises as fs } from "fs";
import path from "path";

const STORE_PATH = path.resolve(process.cwd(), "data", "task10-state.json");

type Anchor = {
  latitude: number;
  longitude: number;
  createdAt: string;
};

export type Task10CheckRecord = {
  at: string;
  mode: "current_location" | "toyokuni_photo";
  unlockable: boolean;
  checks: {
    puzzle: boolean;
    position: boolean;
    heading: boolean;
    pitch: boolean;
    view: boolean;
  };
  detail: Record<string, unknown>;
};

type QuestTask10State = {
  puzzleAttempts: number;
  puzzleSolved: boolean;
  checkAttempts: number;
  forcedSuccess: boolean;
  currentLocationAnchor?: Anchor;
  lastCheck?: Task10CheckRecord;
};

type Task10Store = {
  quests: Record<string, QuestTask10State>;
};

const INITIAL_QUEST_STATE: QuestTask10State = {
  puzzleAttempts: 0,
  puzzleSolved: false,
  checkAttempts: 0,
  forcedSuccess: false,
};

async function ensureStore() {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    const seed: Task10Store = { quests: {} };
    await fs.writeFile(STORE_PATH, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function readStore(): Promise<Task10Store> {
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw || "{}") as Partial<Task10Store>;
    return { quests: parsed.quests || {} };
  } catch {
    return { quests: {} };
  }
}

async function writeStore(store: Task10Store) {
  await ensureStore();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function getQuestState(store: Task10Store, questId: string): QuestTask10State {
  const current = store.quests[questId];
  if (current) return current;
  const next = { ...INITIAL_QUEST_STATE };
  store.quests[questId] = next;
  return next;
}

export async function getTask10QuestState(questId: string) {
  const store = await readStore();
  return getQuestState(store, questId);
}

export async function markTask10PuzzleAttempt(questId: string, solved: boolean) {
  const store = await readStore();
  const state = getQuestState(store, questId);
  state.puzzleAttempts += 1;
  if (solved) state.puzzleSolved = true;
  await writeStore(store);
  return state;
}

export async function setTask10PuzzleSolved(questId: string, solved = true) {
  const store = await readStore();
  const state = getQuestState(store, questId);
  state.puzzleSolved = solved;
  await writeStore(store);
  return state;
}

export async function setTask10ForcedSuccess(questId: string, forcedSuccess: boolean) {
  const store = await readStore();
  const state = getQuestState(store, questId);
  state.forcedSuccess = forcedSuccess;
  await writeStore(store);
  return state;
}

export async function resolveCurrentLocationAnchor(questId: string, latitude: number, longitude: number) {
  const store = await readStore();
  const state = getQuestState(store, questId);
  if (!state.currentLocationAnchor) {
    state.currentLocationAnchor = {
      latitude,
      longitude,
      createdAt: new Date().toISOString(),
    };
    await writeStore(store);
  }
  return state.currentLocationAnchor;
}

export async function recordTask10Check(questId: string, record: Task10CheckRecord) {
  const store = await readStore();
  const state = getQuestState(store, questId);
  state.checkAttempts += 1;
  state.lastCheck = record;
  await writeStore(store);
  return state;
}

export async function resetTask10QuestState(questId: string) {
  const store = await readStore();
  store.quests[questId] = { ...INITIAL_QUEST_STATE };
  await writeStore(store);
}
