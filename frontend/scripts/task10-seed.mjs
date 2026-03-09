import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const questId = process.env.NEXT_PUBLIC_DEMO_QUEST_ID || "0x0900000000000000000000000000000000000000000000000000000000000009";
const root = process.cwd();
const task10Path = path.join(root, "data", "task10-state.json");

async function ensureDataDir() {
  await mkdir(path.join(root, "data"), { recursive: true });
}

async function readJson(filePath, fallback) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function main() {
  await ensureDataDir();
  const state = await readJson(task10Path, { quests: {} });
  state.quests[questId] = {
    puzzleAttempts: 0,
    puzzleSolved: false,
    checkAttempts: 0,
    forcedSuccess: false
  };
  await writeFile(task10Path, JSON.stringify(state, null, 2), "utf8");
  process.stdout.write(`task10 seed done: questId=${questId}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
