"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell, Panel, Pill } from "@/app/_components/shell";
import { readFlowState, writeFlowState } from "@/app/_components/flow-state";

type ProofItem = {
  proofId: string;
  proofHash: string;
  receivedAt: string;
};

function QuestPageInner() {
  const search = useSearchParams();
  const flow = useMemo(() => readFlowState(), []);
  const initialQuestId = search.get("questId") || flow.questId || "0xquest-demo";

  const [questId, setQuestId] = useState(initialQuestId);
  const [proofs, setProofs] = useState<ProofItem[]>([]);
  const [questState, setQuestState] = useState<string>("unknown");
  const [missing, setMissing] = useState<string[]>([]);
  const [status, setStatus] = useState("");

  const [nfcTag, setNfcTag] = useState("nfc-demo");
  const [qrPayload, setQrPayload] = useState("qr-demo");
  const [latitude, setLatitude] = useState("35.6812");
  const [longitude, setLongitude] = useState("139.7671");

  async function refresh() {
    const res = await fetch(`/api/quests/${questId}`);
    const j = await res.json();
    if (!j.ok) {
      setStatus(`error:${j.error}`);
      return;
    }
    setProofs(j.proofs || []);
    setQuestState(j.quest?.status || "proof_received");
    setMissing(j.quest?.verificationReasons || []);
    writeFlowState({ questId });
  }

  async function submitProof() {
    setStatus("submitting");
    const metadata = { nfcTag, qrPayload, source: "quest-ui" };
    const metadataHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(metadata))).then((d) =>
      `0x${Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("")}`
    );
    const imageHash = metadataHash;

    const evidence = {
      nfcTag,
      qrPayload,
      capturedAt: new Date().toISOString(),
      latitude: Number(latitude),
      longitude: Number(longitude),
      imageHash,
      metadataHash,
      metadata,
    };
    const res = await fetch("/api/proofs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questId, evidence }),
    });
    const j = await res.json();
    setStatus(j.ok ? "proof_submitted" : `error:${j.error}`);
    await refresh();
  }

  async function verify() {
    setStatus("verifying");
    const res = await fetch(`/api/quests/${questId}/verify`, { method: "POST" });
    const j = await res.json();
    if (!j.ok) {
      setMissing(j.reasons || [j.error || "verify_failed"]);
      setStatus(`error:${j.error || "verify_failed"}`);
      return;
    }
    setQuestState(j.quest?.status || "verified");
    setMissing([]);
    setStatus("verified");
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questId]);

  return (
    <AppShell title="Quest">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel title="Quest進捗">
          <div className="mb-3 flex gap-2">
            <input className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" value={questId} onChange={(e) => setQuestId(e.target.value)} />
            <button className="rounded-lg border border-slate-400 px-3 py-2 text-sm" onClick={refresh}>
              更新
            </button>
          </div>
          <div className="mb-3 flex items-center gap-2 text-sm">
            <Pill ok={questState === "verified" || questState === "signed"} text={`state: ${questState}`} />
            <Pill ok={proofs.length > 0} text={`proofs: ${proofs.length}`} />
          </div>
          <ul className="space-y-2 text-sm">
            <li className="rounded-lg border border-slate-200 p-2">1. 証跡提出: {proofs.length > 0 ? "done" : "pending"}</li>
            <li className="rounded-lg border border-slate-200 p-2">2. Oracle検証: {questState === "verified" || questState === "signed" ? "done" : "pending"}</li>
            <li className="rounded-lg border border-slate-200 p-2">3. Unlock準備: verified後にUnlock画面へ</li>
          </ul>
          <div className="mt-4">
            <div className="mb-2 text-sm font-medium">不足条件</div>
            {missing.length === 0 ? (
              <div className="text-sm text-slate-500">不足なし</div>
            ) : (
              <ul className="list-disc pl-5 text-sm text-rose-700">
                {missing.map((m, i) => (
                  <li key={`${m}-${i}`}>{m}</li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        <Panel title="証跡アップロードと検証">
          <div className="grid gap-2">
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={nfcTag} onChange={(e) => setNfcTag(e.target.value)} placeholder="nfcTag" />
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={qrPayload} onChange={(e) => setQrPayload(e.target.value)} placeholder="qrPayload" />
            <div className="grid gap-2 sm:grid-cols-2">
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="latitude" />
              <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="longitude" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white" onClick={submitProof}>
              証跡を提出
            </button>
            <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm text-white" onClick={verify}>
              検証を依頼
            </button>
          </div>
          <div className="mt-2 text-xs text-slate-500">status: {status}</div>
          <div className="mt-4 max-h-52 overflow-y-auto rounded-xl border border-slate-200 p-3 text-xs">
            {proofs.length === 0 ? (
              <div className="text-slate-500">提出済み証跡はありません。</div>
            ) : (
              proofs.map((p) => (
                <div key={p.proofId} className="mb-2 rounded-lg bg-slate-50 p-2">
                  <div>proofId: {p.proofId}</div>
                  <div>proofHash: {p.proofHash}</div>
                  <div>at: {p.receivedAt}</div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

export default function QuestPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <QuestPageInner />
    </Suspense>
  );
}
