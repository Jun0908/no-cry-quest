import { NextResponse } from "next/server";
import { appendAuditLog } from "@/lib/backendStore";
import { DEMO_QUEST_ID } from "@/lib/finalSceneDemo";
import { getTask10Config } from "@/lib/task10Config";
import { setTask10PuzzleSolved } from "@/lib/task10StateStore";

export const runtime = "nodejs";

type Body = {
  questId?: string;
};

export async function POST(req: Request) {
  const cfg = getTask10Config();
  if (!cfg.enableSimulateSuccess) {
    return NextResponse.json({ ok: false, error: "simulate_disabled" }, { status: 403 });
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    // fallback
  }

  const questId = body.questId || DEMO_QUEST_ID;
  await setTask10PuzzleSolved(questId, true);
  await appendAuditLog("verification_succeeded", questId, true, {
    kind: "task10_puzzle_simulate_success",
  });

  return NextResponse.json({
    ok: true,
    questId,
    puzzleSolved: true,
  });
}

