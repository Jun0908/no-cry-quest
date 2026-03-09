import { NextResponse } from "next/server";
import { appendAuditLog } from "@/lib/backendStore";
import { createSession } from "@/lib/shamirSessionStore";
import { assertNotPaused } from "@/lib/opsGuard";

export const runtime = "nodejs";

type CreateSessionBody = {
  questId: string;
  secret: string;
  participantWallets: string[];
  threshold?: number;
  shares?: number;
  ttlMs?: number;
};

export async function POST(req: Request) {
  try {
    assertNotPaused();
  } catch (error) {
    const reason = error instanceof Error ? error.message : "service_paused";
    return NextResponse.json({ ok: false, error: reason }, { status: 503 });
  }

  let body: CreateSessionBody;
  try {
    body = (await req.json()) as CreateSessionBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { questId, secret, participantWallets, threshold, shares, ttlMs } = body;
  if (!questId || !secret || !Array.isArray(participantWallets)) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  try {
    const created = await createSession({
      questId,
      secret,
      participantWallets,
      threshold,
      shares,
      ttlMs,
    });

    await appendAuditLog("proof_received", questId, true, {
      kind: "shamir_session_created",
      sessionId: created.session.sessionId,
      threshold: created.session.threshold,
      shares: created.session.shares,
    });

    return NextResponse.json({
      ok: true,
      sessionId: created.session.sessionId,
      questId: created.session.questId,
      threshold: created.session.threshold,
      shares: created.session.shares,
      expiresAt: created.session.expiresAt,
      delivery: created.delivery,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "create_session_failed";
    return NextResponse.json({ ok: false, error: reason }, { status: 400 });
  }
}
