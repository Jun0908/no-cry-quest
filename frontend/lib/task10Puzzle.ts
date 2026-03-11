import cipherTable from "@/data/task10/cipher-table.json";
import puzzle from "@/data/task10/puzzle.json";

type CipherRow = {
  id: string;
  symbol: string;
  category: "kao" | "kamon" | "jisha";
  meaning: string;
};

type PuzzleCandidate = {
  id: string;
  label: string;
  summary: string;
  isAnswer: boolean;
};

type PuzzleData = {
  title: string;
  storyLead: string;
  clueLines: string[];
  candidates: PuzzleCandidate[];
  hints: {
    level1: { role: string; text: string };
    level2: { role: string; text: string };
    level3: { role: string; text: string };
  };
};

const CIPHER_ROWS = cipherTable as CipherRow[];
const PUZZLE_DATA = puzzle as PuzzleData;

export type Task10HintLevel = 1 | 2 | 3;

export type Task10Hint = {
  level: Task10HintLevel;
  role: string;
  text: string;
};

export function getTask10PublicPuzzle() {
  return {
    title: PUZZLE_DATA.title,
    storyLead: PUZZLE_DATA.storyLead,
    clueLines: PUZZLE_DATA.clueLines,
    cipher: CIPHER_ROWS.map((row) => ({
      id: row.id,
      symbol: row.symbol,
      category: row.category,
    })),
    candidates: PUZZLE_DATA.candidates.map((c) => ({
      id: c.id,
      label: c.label,
      // Candidate summaries are intentionally hidden to avoid leaking narrowing clues too early.
      summary: "",
    })),
  };
}

export function evaluateTask10Candidate(candidateId: string) {
  const candidate = PUZZLE_DATA.candidates.find((c) => c.id === candidateId);
  if (!candidate) return { ok: false, reason: "invalid_candidate" as const };
  return { ok: candidate.isAnswer, reason: candidate.isAnswer ? "solved" as const : "wrong_candidate" as const };
}

export function getTask10Hint(level: Task10HintLevel): Task10Hint {
  const source = level === 1 ? PUZZLE_DATA.hints.level1 : level === 2 ? PUZZLE_DATA.hints.level2 : PUZZLE_DATA.hints.level3;
  return {
    level,
    role: source.role,
    text: source.text,
  };
}
