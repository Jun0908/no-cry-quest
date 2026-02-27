import { NextResponse } from "next/server";
import { appendAuditLog } from "@/lib/backendStore";
import { extendSession } from "@/lib/shamirSessionStore";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ sessionId: string }>;
};

type ReinviteBody = {
  ttlMs?: number;
};

export async function POST(req: Request, ctx: Params) {
  const { sessionId } = await ctx.params;
  let body: ReinviteBody = {};
  try {
    body = (await req.json()) as ReinviteBody;
  } catch {
    // optional body
  }

  try {
    const session = await extendSession(sessionId, body.ttlMs);
    await appendAuditLog("proof_received", session.questId, true, {
      kind: "session_reinvited",
      sessionId,
      reinviteCount: session.reinviteCount,
      expiresAt: session.expiresAt,
    });
    return NextResponse.json({ ok: true, sessionId, reinviteCount: session.reinviteCount, expiresAt: session.expiresAt });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "reinvite_failed";
    return NextResponse.json({ ok: false, error: reason }, { status: 400 });
  }
}
