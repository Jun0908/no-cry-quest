import { NextResponse } from "next/server";
import { appendAuditLog } from "@/lib/backendStore";
import { createAgentSession } from "@/lib/agentStore";

export const runtime = "nodejs";

type CreateSessionBody = {
  questId: string;
  participants: string[];
  personaStyle?: string;
};

export async function POST(req: Request) {
  let body: CreateSessionBody;
  try {
    body = (await req.json()) as CreateSessionBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.questId || !Array.isArray(body.participants) || body.participants.length === 0) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  try {
    const session = await createAgentSession({
      questId: body.questId,
      participants: body.participants,
      personaStyle: body.personaStyle,
    });
    await appendAuditLog("proof_received", body.questId, true, {
      kind: "agent_session_created",
      sessionId: session.sessionId,
    });

    return NextResponse.json({
      ok: true,
      sessionId: session.sessionId,
      questId: session.questId,
      persona: session.persona,
      safetyRules: session.safetyRules,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "create_session_failed";
    return NextResponse.json({ ok: false, error: reason }, { status: 400 });
  }
}
