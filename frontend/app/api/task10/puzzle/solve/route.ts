import { NextResponse } from "next/server";
import { appendAuditLog } from "@/lib/backendStore";
import { DEMO_QUEST_ID } from "@/lib/finalSceneDemo";
import { evaluateTask10Candidate, getTask10Hint } from "@/lib/task10Puzzle";
import { getTask10QuestState, markTask10PuzzleAttempt } from "@/lib/task10StateStore";

export const runtime = "nodejs";

type Body = {
  questId?: string;
  candidateId?: string;
};

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

  const solved = result.ok;
  const state = await markTask10PuzzleAttempt(questId, solved);

  if (solved) {
    await appendAuditLog("verification_succeeded", questId, true, {
      kind: "task10_puzzle_solved",
      candidateId: body.candidateId,
      attempts: state.puzzleAttempts,
    });
    return NextResponse.json({
      ok: true,
      solved: true,
      attempts: state.puzzleAttempts,
    });
  }

  const hintLevel = state.puzzleAttempts >= 2 ? 2 : 1;
  await appendAuditLog("verification_failed", questId, false, {
    kind: "task10_puzzle_failed",
    candidateId: body.candidateId,
    attempts: state.puzzleAttempts,
  });
  return NextResponse.json({
    ok: true,
    solved: false,
    attempts: state.puzzleAttempts,
    hintLevel,
    hint: getTask10Hint(hintLevel as 1 | 2),
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
  });
}
