import { NextResponse } from "next/server";
import { addProof, appendAuditLog, getProofs, type ProofEvidence } from "@/lib/backendStore";
import { assertNotPaused } from "@/lib/opsGuard";

export const runtime = "nodejs";

type CreateProofBody = {
  questId: string;
  evidence: ProofEvidence;
  clientProofHash?: string;
};

export async function POST(req: Request) {
  try {
    assertNotPaused();
  } catch (error) {
    const reason = error instanceof Error ? error.message : "service_paused";
    return NextResponse.json({ ok: false, error: reason }, { status: 503 });
  }

  let body: CreateProofBody;
  try {
    body = (await req.json()) as CreateProofBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { questId, evidence, clientProofHash } = body;
  if (!questId || !evidence || typeof evidence !== "object") {
    await appendAuditLog("proof_rejected", questId || "unknown", false, { reason: "missing_fields" });
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  try {
    const proof = await addProof(questId, evidence, clientProofHash);
    await appendAuditLog("proof_received", questId, true, { proofId: proof.proofId, proofHash: proof.proofHash });
    return NextResponse.json({
      ok: true,
      proofId: proof.proofId,
      proofHash: proof.proofHash,
      receivedAt: proof.receivedAt,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "proof_store_failed";
    await appendAuditLog("proof_rejected", questId, false, { reason });
    return NextResponse.json({ ok: false, error: reason }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const questId = url.searchParams.get("questId");
  if (!questId) {
    return NextResponse.json({ ok: false, error: "missing_questId" }, { status: 400 });
  }
  const proofs = await getProofs(questId);
  return NextResponse.json({ ok: true, proofs });
}
