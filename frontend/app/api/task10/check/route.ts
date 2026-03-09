import { NextResponse } from "next/server";
import { appendAuditLog } from "@/lib/backendStore";
import { DEMO_QUEST_ID } from "@/lib/finalSceneDemo";
import { assertNotPaused } from "@/lib/opsGuard";
import { evaluateTask10Check } from "@/lib/task10Judge";
import { resolveTask10Mode } from "@/lib/task10Config";
import { recordTask10Check } from "@/lib/task10StateStore";

export const runtime = "nodejs";

type Body = {
  questId?: string;
  mode?: string;
  latitude?: number;
  longitude?: number;
  heading?: number;
  pitch?: number;
  viewScore?: number;
  photoProvided?: boolean;
};

export async function POST(req: Request) {
  try {
    assertNotPaused();
  } catch (error) {
    const reason = error instanceof Error ? error.message : "service_paused";
    return NextResponse.json({ ok: false, error: reason }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const questId = body.questId || DEMO_QUEST_ID;
  const mode = resolveTask10Mode(body.mode);

  const result = await evaluateTask10Check({
    questId,
    mode,
    latitude: body.latitude,
    longitude: body.longitude,
    heading: body.heading,
    pitch: body.pitch,
    viewScore: body.viewScore,
    photoProvided: body.photoProvided,
  });

  const state = await recordTask10Check(questId, {
    at: new Date().toISOString(),
    mode,
    unlockable: result.unlockable,
    checks: result.checks,
    detail: result.detail,
  });

  await appendAuditLog(result.unlockable ? "verification_succeeded" : "verification_failed", questId, result.unlockable, {
    kind: "task10_check",
    mode,
    checks: result.checks,
    detail: result.detail,
    checkAttempts: state.checkAttempts,
  });

  return NextResponse.json({
    ok: true,
    questId,
    mode,
    unlockable: result.unlockable,
    checks: result.checks,
    detail: result.detail,
    checkAttempts: state.checkAttempts,
  });
}
