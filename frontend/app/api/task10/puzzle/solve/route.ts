import { NextResponse } from "next/server";
import { appendAuditLog } from "@/lib/backendStore";
import { DEMO_QUEST_ID } from "@/lib/finalSceneDemo";
import { evaluateTask10Candidate, getTask10Hint, type Task10HintLevel } from "@/lib/task10Puzzle";
import { getTask10QuestState, markTask10PuzzleAttempt } from "@/lib/task10StateStore";

export const runtime = "nodejs";
const REQUIRED_HINT_REQUESTS = 3;

type Body = {
  questId?: string;
  candidateId?: string;
};

function resolveHintLevel(hintRequests: number): Task10HintLevel {
  if (hintRequests >= 3) return 3;
  if (hintRequests >= 2) return 2;
  return 1;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const questId = body.questId || DEMO_QUEST_ID;
  if (!body.candidateId) {
    return NextResponse.json({ ok: false, error: "missing_candidateId" }, { status: 400 });
  }

  const result = evaluateTask10Candidate(body.candidateId);
  if (!result.ok && result.reason === "invalid_candidate") {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  }

  const currentState = await getTask10QuestState(questId);
  const solved = result.ok && currentState.hintRequests >= REQUIRED_HINT_REQUESTS;
  const state = await markTask10PuzzleAttempt(questId, solved);

  if (solved) {
    await appendAuditLog("verification_succeeded", questId, true, {
      kind: "task10_puzzle_solved",
      candidateId: body.candidateId,
      attempts: state.puzzleAttempts,
      hintRequests: state.hintRequests,
    });
    return NextResponse.json({
      ok: true,
      solved: true,
      attempts: state.puzzleAttempts,
      hintRequests: state.hintRequests,
      requiredHintRequests: REQUIRED_HINT_REQUESTS,
    });
  }

  const needsMoreHints = result.ok && currentState.hintRequests < REQUIRED_HINT_REQUESTS;
  const nextHintLevel = resolveHintLevel(currentState.hintRequests + 1);
  const hint = getTask10Hint(nextHintLevel);

  await appendAuditLog("verification_failed", questId, false, {
    kind: "task10_puzzle_failed",
    candidateId: body.candidateId,
    attempts: state.puzzleAttempts,
    hintRequests: state.hintRequests,
    needsMoreHints,
  });

  return NextResponse.json({
    ok: true,
    solved: false,
    attempts: state.puzzleAttempts,
    hintRequests: state.hintRequests,
    requiredHintRequests: REQUIRED_HINT_REQUESTS,
    needsMoreHints,
    hintLevel: hint.level,
    role: hint.role,
    hint: hint.text,
    guidance: needsMoreHints ? "候補は悪くない。ヒント3まで確認し、根拠を固めてから確定せよ。" : undefined,
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const questId = url.searchParams.get("questId") || DEMO_QUEST_ID;
  const state = await getTask10QuestState(questId);
  return NextResponse.json({
    ok: true,
    questId,
    puzzleSolved: state.puzzleSolved,
    puzzleAttempts: state.puzzleAttempts,
    hintRequests: state.hintRequests,
  });
}

