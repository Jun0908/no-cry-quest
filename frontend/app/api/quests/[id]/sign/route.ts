import { NextResponse } from "next/server";
import {
  appendAuditLog,
  getQuestState,
  markSignatureFailed,
  markSigned,
  reserveNonce,
} from "@/lib/backendStore";
import { signUnlockQuest, signVerifyQuest } from "@/lib/oracleSigner";
import { assertNotPaused } from "@/lib/opsGuard";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

type SignBody = {
  action: "verify" | "unlock";
  chainId: number;
  contractAddress: string;
  nonce: number;
  unlockProofHash?: string;
};

function isValidHash(value: unknown): value is string {
  return typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value);
}

export async function POST(req: Request, ctx: Params) {
  try {
    assertNotPaused();
  } catch (error) {
    const reason = error instanceof Error ? error.message : "service_paused";
    return NextResponse.json({ ok: false, error: reason }, { status: 503 });
  }

  const { id: questId } = await ctx.params;
  let body: SignBody;
  try {
    body = (await req.json()) as SignBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { action, chainId, contractAddress, nonce, unlockProofHash } = body;
  if (!questId || !action || !chainId || !contractAddress || nonce === undefined) {
    await appendAuditLog("signature_failed", questId || "unknown", false, { reason: "missing_fields" });
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const quest = await getQuestState(questId);
  if (!quest || quest.status === "proof_received" || !quest.verifiedProofHash) {
    await appendAuditLog("signature_failed", questId, false, { reason: "quest_not_verified" });
    return NextResponse.json({ ok: false, error: "quest_not_verified" }, { status: 400 });
  }

  try {
    await reserveNonce(questId, nonce);

    if (action === "verify") {
      const signed = await signVerifyQuest({
        chainId,
        contractAddress,
        questId,
        nonce,
        proofHash: quest.verifiedProofHash,
      });
      await markSigned(questId);
      await appendAuditLog("signature_issued", questId, true, {
        action,
        nonce,
        oracleAddress: signed.oracleAddress,
      });
      return NextResponse.json({
        ok: true,
        action,
        nonce,
        signature: signed.signature,
        oracleAddress: signed.oracleAddress,
        payload: {
          questId,
          proofHash: quest.verifiedProofHash,
        },
        warning: signed.isDevKey ? "using_dev_oracle_key_set_ORACLE_PRIVATE_KEY" : undefined,
      });
    }

    if (!isValidHash(unlockProofHash)) {
      throw new Error("invalid_unlockProofHash");
    }
    const signed = await signUnlockQuest({
      chainId,
      contractAddress,
      questId,
      nonce,
      unlockProofHash,
    });
    await markSigned(questId);
    await appendAuditLog("signature_issued", questId, true, {
      action,
      nonce,
      oracleAddress: signed.oracleAddress,
    });
    return NextResponse.json({
      ok: true,
      action,
      nonce,
      signature: signed.signature,
      oracleAddress: signed.oracleAddress,
      payload: {
        questId,
        unlockProofHash,
      },
      warning: signed.isDevKey ? "using_dev_oracle_key_set_ORACLE_PRIVATE_KEY" : undefined,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "sign_failed";
    await markSignatureFailed(questId);
    await appendAuditLog("signature_failed", questId, false, { reason, action, nonce });
    return NextResponse.json({ ok: false, error: reason }, { status: 400 });
  }
}
