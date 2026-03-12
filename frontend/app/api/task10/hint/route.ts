import { NextResponse } from "next/server";
import { DEMO_QUEST_ID } from "@/lib/finalSceneDemo";
import { getTask10Hint, type Task10HintLevel } from "@/lib/task10Puzzle";
import { getTask10QuestState, markTask10HintRequest } from "@/lib/task10StateStore";

export const runtime = "nodejs";
const REQUIRED_HINT_REQUESTS = 3;

type Body = {
  questId?: string;
};

function resolveHintLevel(hintRequests: number): Task10HintLevel {
  if (hintRequests >= 3) return 3;
  if (hintRequests >= 2) return 2;
  return 1;
}

export async function POST(req: Request) {
  try {
    let body: Body = {};
    try {
      body = (await req.json()) as Body;
    } catch {
      // ignore and fallback to default questId
    }

    const questId = body.questId || DEMO_QUEST_ID;
    const current = await getTask10QuestState(questId);
    const state = await markTask10HintRequest(questId);
    const level = resolveHintLevel(state.hintRequests);
    const hint = getTask10Hint(level);

    return NextResponse.json({
      ok: true,
      questId,
      level: hint.level,
      role: hint.role,
      hint: hint.text,
      attempts: state.puzzleAttempts,
      hintRequests: state.hintRequests,
      requiredHintRequests: REQUIRED_HINT_REQUESTS,
      readyToSolve: state.hintRequests >= REQUIRED_HINT_REQUESTS,
      previousHintRequests: current.hintRequests,
    });
  } catch (err) {
    console.error("[/api/task10/hint] unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "internal_error" },
      { status: 500 }
    );
  }
}
