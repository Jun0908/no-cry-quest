import { NextResponse } from "next/server";
import { DEMO_QUEST_ID } from "@/lib/finalSceneDemo";
import { getTask10Hint } from "@/lib/task10Puzzle";
import { getTask10QuestState } from "@/lib/task10StateStore";

export const runtime = "nodejs";

type Body = {
  questId?: string;
};

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    // ignore and fallback to default questId
  }

  const questId = body.questId || DEMO_QUEST_ID;
  const state = await getTask10QuestState(questId);
  const level: 1 | 2 = state.puzzleAttempts >= 2 ? 2 : 1;

  return NextResponse.json({
    ok: true,
    questId,
    level,
    hint: getTask10Hint(level),
    attempts: state.puzzleAttempts,
  });
}
