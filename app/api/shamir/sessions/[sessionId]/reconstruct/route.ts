import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { appendAuditLog, getQuestState, reserveNonce } from "@/lib/backendStore";
import { signUnlockQuest } from "@/lib/oracleSigner";
import { combineShares } from "@/lib/shamir";
import { getSubmissions } from "@/lib/shardStore";
import { getSession, markSessionCompleted } from "@/lib/shamirSessionStore";
import { assertNotPaused } from "@/lib/opsGuard";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ sessionId: string }>;
};

type ReconstructBody = {
  chainId: number;
  contractAddress: string;
  nonce: number;
};

const vaultInterface = new ethers.Interface([
  "function unlockQuest(bytes32 questId, bytes32 unlockProofHash, uint256 nonce, bytes signature)",
]);

export async function POST(req: Request, ctx: Params) {
  try {
    assertNotPaused();
  } catch (error) {
    const reason = error instanceof Error ? error.message : "service_paused";
    return NextResponse.json({ ok: false, error: reason }, { status: 503 });
  }

  const { sessionId } = await ctx.params;
  let body: ReconstructBody;
  try {
    body = (await req.json()) as ReconstructBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { chainId, contractAddress, nonce } = body;
  if (!chainId || !contractAddress || nonce === undefined) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const session = await getSession(sessionId);
  if (!session) return NextResponse.json({ ok: false, error: "session_not_found" }, { status: 404 });
  if (session.status === "cancelled" || session.status === "timed_out") {
    return NextResponse.json({ ok: false, error: "session_not_active" }, { status: 400 });
  }

  const quest = await getQuestState(session.questId);
  if (!quest || !quest.verifiedProofHash) {
    return NextResponse.json({ ok: false, error: "quest_not_verified" }, { status: 400 });
  }

  const submissions = await getSubmissions(session.questId);
  const submittedShares = submissions.map((s) => s.shard);
  if (submittedShares.length < session.threshold) {
    await appendAuditLog("verification_failed", session.questId, false, {
      kind: "reconstruct_failed",
      reason: "insufficient_shares",
      submitted: submittedShares.length,
      required: session.threshold,
      sessionId,
    });
    return NextResponse.json(
      {
        ok: false,
        error: "insufficient_shares",
        submitted: submittedShares.length,
        required: session.threshold,
      },
      { status: 400 }
    );
  }

  try {
    // Secret is only held in memory and never persisted to disk.
    const secret = combineShares(submittedShares.slice(0, session.threshold));
    const unlockProofHash = ethers.keccak256(
      ethers.solidityPacked(["bytes32", "string"], [quest.verifiedProofHash, secret])
    );
    const signed = await signUnlockQuest({
      chainId,
      contractAddress,
      nonce,
      questId: session.questId,
      unlockProofHash,
    });
    await reserveNonce(session.questId, nonce);
    await markSessionCompleted(sessionId);
    await appendAuditLog("verification_succeeded", session.questId, true, {
      kind: "reconstruct_succeeded",
      sessionId,
      submitted: submittedShares.length,
      threshold: session.threshold,
      nonce,
    });

    const calldata = vaultInterface.encodeFunctionData("unlockQuest", [
      session.questId,
      unlockProofHash,
      nonce,
      signed.signature,
    ]);

    return NextResponse.json({
      ok: true,
      questId: session.questId,
      unlockProofHash,
      oracleAddress: signed.oracleAddress,
      tx: {
        to: contractAddress,
        data: calldata,
      },
      warning: signed.isDevKey ? "using_dev_oracle_key_set_ORACLE_PRIVATE_KEY" : undefined,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "reconstruct_failed";
    await appendAuditLog("verification_failed", session.questId, false, {
      kind: "reconstruct_failed",
      sessionId,
      reason,
    });
    return NextResponse.json({ ok: false, error: reason }, { status: 400 });
  }
}
