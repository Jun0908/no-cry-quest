import { NextResponse } from "next/server";
import { appendAuditLog } from "@/lib/backendStore";
import { cancelSession } from "@/lib/shamirSessionStore";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ sessionId: string }>;
};

type CancelBody = {
  reason?: string;
};

export async function POST(req: Request, ctx: Params) {
  const { sessionId } = await ctx.params;
  let body: CancelBody = {};
  try {
    body = (await req.json()) as CancelBody;
  } catch {
    // optional body
  }

  try {
    const reason = body.reason || "operator_cancelled";
    const result = await cancelSession(sessionId, reason);
    await appendAuditLog("proof_rejected", result.session.questId, false, {
      kind: "session_cancelled",
      sessionId,
      reason,
    });
    return NextResponse.json({ ok: true, sessionId, status: result.session.status, reason });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "cancel_failed";
    return NextResponse.json({ ok: false, error: reason }, { status: 400 });
  }
}
