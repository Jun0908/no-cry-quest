import { ethers } from "ethers";
import type { ProofRecord } from "./backendStore";

const HASH_RE = /^0x[0-9a-fA-F]{64}$/;

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

export function verifyProofs(proofs: ProofRecord[]) {
  const reasons: string[] = [];
  if (proofs.length === 0) {
    reasons.push("no_proof_uploaded");
    return { ok: false, reasons };
  }

  for (const proof of proofs) {
    const e = proof.evidence;
    if (!e.nfcTag && !e.qrPayload) {
      reasons.push(`proof:${proof.proofId}:missing_nfc_or_qr`);
    }

    if (!e.capturedAt) {
      reasons.push(`proof:${proof.proofId}:missing_capturedAt`);
    } else {
      const capturedAt = Date.parse(e.capturedAt);
      const now = Date.now();
      if (Number.isNaN(capturedAt)) {
        reasons.push(`proof:${proof.proofId}:invalid_capturedAt`);
      } else {
        const maxFuture = now + 5 * 60 * 1000;
        const maxPast = now - 30 * 24 * 60 * 60 * 1000;
        if (capturedAt > maxFuture || capturedAt < maxPast) {
          reasons.push(`proof:${proof.proofId}:capturedAt_out_of_range`);
        }
      }
    }

    if (!isFiniteNumber(e.latitude) || !isFiniteNumber(e.longitude)) {
      reasons.push(`proof:${proof.proofId}:missing_location`);
    } else if (e.latitude < -90 || e.latitude > 90 || e.longitude < -180 || e.longitude > 180) {
      reasons.push(`proof:${proof.proofId}:invalid_location_range`);
    }

    if (!e.imageHash || !HASH_RE.test(e.imageHash)) {
      reasons.push(`proof:${proof.proofId}:invalid_image_hash`);
    }
    if (!e.metadataHash || !HASH_RE.test(e.metadataHash)) {
      reasons.push(`proof:${proof.proofId}:invalid_metadata_hash`);
    }

    if (e.metadata && e.metadataHash) {
      const metadataHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(e.metadata)));
      if (metadataHash.toLowerCase() !== e.metadataHash.toLowerCase()) {
        reasons.push(`proof:${proof.proofId}:metadata_hash_mismatch`);
      }
    }
  }

  return { ok: reasons.length === 0, reasons };
}
