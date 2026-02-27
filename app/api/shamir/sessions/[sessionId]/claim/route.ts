import { NextResponse } from "next/server";
import { appendAuditLog } from "@/lib/backendStore";
import { claimShare } from "@/lib/shamirSessionStore";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ sessionId: string }>;
};

type ClaimBody = {
  walletAddress: string;
  claimToken: string;
  timestamp: number;
  signature: string;
};

export async function POST(req: Request, ctx: Params) {
  const { sessionId } = await ctx.params;

  let body: ClaimBody;
  try {
    body = (await req.json()) as ClaimBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.walletAddress || !body.claimToken || !body.timestamp || !body.signature) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  try {
    const result = await claimShare({
      sessionId,
      walletAddress: body.walletAddress,
      claimToken: body.claimToken,
      timestamp: body.timestamp,
      signature: body.signature,
    });

    await appendAuditLog("proof_received", result.questId, true, {
      kind: "shard_claimed",
      sessionId,
      walletAddress: body.walletAddress,
    });

    return NextResponse.json({
      ok: true,
      sessionId,
      questId: result.questId,
      threshold: result.threshold,
      shares: result.shares,
      shard: result.share,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "claim_failed";
    await appendAuditLog("proof_rejected", "unknown", false, { kind: "shard_claim_failed", sessionId, reason });
    return NextResponse.json({ ok: false, error: reason }, { status: 400 });
  }
}
