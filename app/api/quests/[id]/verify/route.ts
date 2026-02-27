import { NextResponse } from "next/server";
import { appendAuditLog, getProofs, getQuestState, markVerificationFailed, markVerified } from "@/lib/backendStore";
import { verifyProofs } from "@/lib/proofVerifier";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: Request, ctx: Params) {
  const { id: questId } = await ctx.params;
  if (!questId) {
    return NextResponse.json({ ok: false, error: "missing_quest_id" }, { status: 400 });
  }

  const quest = await getQuestState(questId);
  if (quest?.status === "signed") {
    return NextResponse.json({ ok: false, error: "already_signed" }, { status: 409 });
  }

  const proofs = await getProofs(questId);
  const result = verifyProofs(proofs);

  if (!result.ok) {
    await markVerificationFailed(questId, result.reasons);
    await appendAuditLog("verification_failed", questId, false, { reasons: result.reasons });
    return NextResponse.json({ ok: false, verified: false, reasons: result.reasons }, { status: 400 });
  }

  const latestProof = proofs[proofs.length - 1];
  const state = await markVerified(questId, latestProof.proofHash, result.reasons);
  await appendAuditLog("verification_succeeded", questId, true, {
    proofCount: proofs.length,
    verifiedProofHash: latestProof.proofHash,
  });

  return NextResponse.json({
    ok: true,
    verified: true,
    quest: state,
  });
}
