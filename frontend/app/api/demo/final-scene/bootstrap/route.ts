import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { appendAuditLog, markVerified } from "@/lib/backendStore";
import { assertNotPaused } from "@/lib/opsGuard";
import { createSession } from "@/lib/shamirSessionStore";
import { setSubmissions, type Submission } from "@/lib/shardStore";
import { createDemoProofHash, DEMO_NPC_WALLETS, DEMO_QUEST_ID } from "@/lib/finalSceneDemo";
import { resetTask10QuestState } from "@/lib/task10StateStore";

export const runtime = "nodejs";

type BootstrapBody = {
  walletAddress: string;
  questId?: string;
  secret?: string;
  ttlMs?: number;
};

function normalizeAddress(addr: string) {
  return addr.toLowerCase();
}

export async function POST(req: Request) {
  try {
    assertNotPaused();
  } catch (error) {
    const reason = error instanceof Error ? error.message : "service_paused";
    return NextResponse.json({ ok: false, error: reason }, { status: 503 });
  }

  let body: BootstrapBody;
  try {
    body = (await req.json()) as BootstrapBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const questId = body.questId || DEMO_QUEST_ID;
  const walletAddress = body.walletAddress;
  const secret = body.secret || `final-scene-demo:${questId}`;
  const ttlMs = body.ttlMs;

  if (!walletAddress || !ethers.isAddress(walletAddress)) {
    return NextResponse.json({ ok: false, error: "invalid_wallet_address" }, { status: 400 });
  }

  if (!ethers.isHexString(questId, 32)) {
    return NextResponse.json({ ok: false, error: "invalid_quest_id_bytes32" }, { status: 400 });
  }

  const participantWallets = [...DEMO_NPC_WALLETS, walletAddress];
  const deduped = [...new Set(participantWallets.map(normalizeAddress))];
  if (deduped.length !== 4) {
    return NextResponse.json({ ok: false, error: "participants_must_be_4_unique_wallets" }, { status: 400 });
  }

  try {
    const created = await createSession({
      questId,
      secret,
      participantWallets,
      threshold: 4,
      shares: 4,
      ttlMs,
    });

    const player = created.session.participants.find(
      (p) => normalizeAddress(p.walletAddress) === normalizeAddress(walletAddress)
    );
    if (!player) {
      return NextResponse.json({ ok: false, error: "player_not_in_session" }, { status: 500 });
    }

    const now = Date.now();
    const preloaded: Submission[] = created.session.participants
      .filter((p) => normalizeAddress(p.walletAddress) !== normalizeAddress(walletAddress))
      .slice(0, 3)
      .map((p, idx) => ({
        walletAddress: p.walletAddress,
        shard: p.share,
        timestamp: now - (3 - idx) * 30_000,
      }));

    await setSubmissions(questId, preloaded);
    await resetTask10QuestState(questId);
    const verifiedProofHash = createDemoProofHash(questId);
    await markVerified(questId, verifiedProofHash, ["demo_bootstrap"]);
    await appendAuditLog("verification_succeeded", questId, true, {
      kind: "final_scene_bootstrap",
      sessionId: created.session.sessionId,
      preloadedShardCount: preloaded.length,
      participantWallets: deduped,
    });

    return NextResponse.json({
      ok: true,
      questId,
      sessionId: created.session.sessionId,
      threshold: created.session.threshold,
      shares: created.session.shares,
      expiresAt: created.session.expiresAt,
      preloadedShardCount: preloaded.length,
      preloadedWallets: preloaded.map((s) => s.walletAddress),
      finalPlayerShare: player.share,
      verifiedProofHash,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "bootstrap_failed";
    await appendAuditLog("verification_failed", questId, false, {
      kind: "final_scene_bootstrap_failed",
      reason,
    });
    return NextResponse.json({ ok: false, error: reason }, { status: 400 });
  }
}
