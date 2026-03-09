import { NextResponse } from "next/server";
import { DEMO_QUEST_ID } from "@/lib/finalSceneDemo";
import { getTask10PublicPuzzle } from "@/lib/task10Puzzle";
import { getTask10QuestState } from "@/lib/task10StateStore";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const questId = url.searchParams.get("questId") || DEMO_QUEST_ID;
  const state = await getTask10QuestState(questId);
  return NextResponse.json({
    ok: true,
    questId,
    puzzle: getTask10PublicPuzzle(),
    state: {
      puzzleSolved: state.puzzleSolved,
      puzzleAttempts: state.puzzleAttempts,
    },
  });
}
