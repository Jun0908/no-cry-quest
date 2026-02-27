"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell, Panel, Pill } from "@/app/_components/shell";
import { connectWallet } from "@/app/_components/wallet";
import { readFlowState, writeFlowState } from "@/app/_components/flow-state";

type SessionInfo = {
  questId: string;
  threshold: number;
  shares: number;
  status: string;
  expiresAt: number;
  participants: { walletAddress: string; claimedAt?: string }[];
};

type Submission = {
  walletAddress: string;
  shard: string;
  timestamp: number;
};

export default function UnlockPage() {
  const flow = useMemo(() => readFlowState(), []);
  const [sessionId, setSessionId] = useState(flow.shamirSessionId || "");
  const [questId, setQuestId] = useState(flow.questId || "");
  const [shard, setShard] = useState("");
  const [contractAddress, setContractAddress] = useState(flow.contractAddress || "");
  const [nonce, setNonce] = useState("1");
  const [chainId, setChainId] = useState(String(flow.chainId || 31337));
  const [wallet, setWallet] = useState("");

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [unlockTxHash, setUnlockTxHash] = useState("");

  async function refresh() {
    if (!sessionId) return;
    const [sRes, subRes] = await Promise.all([
      fetch(`/api/shamir/sessions/${sessionId}`),
      questId ? fetch(`/api/submit-shard?questId=${encodeURIComponent(questId)}`) : Promise.resolve(null),
    ]);
    const s = await sRes.json();
    if (s.ok) {
      setSession(s.session);
      if (!questId) setQuestId(s.session.questId);
      setError("");
    } else {
      setError(s.error || "session_error");
    }

    if (subRes) {
      const sub = await subRes.json();
      if (sub.ok) setSubmissions(sub.submissions || []);
    }
  }

  async function onConnect() {
    try {
      const { address, chainId: cid } = await connectWallet();
      setWallet(address);
      setChainId(String(cid));
      writeFlowState({ chainId: cid });
    } catch (e) {
      setError(e instanceof Error ? e.message : "wallet_error");
    }
  }

  async function submitShard() {
    try {
      const { signer, address } = await connectWallet();
      const timestamp = Date.now();
      const message = `${sessionId}:${questId}:${shard}:${timestamp}`;
      const signature = await signer.signMessage(message);
      const res = await fetch("/api/submit-shard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, questId, shard, walletAddress: address, signature, timestamp }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "submit_failed");
      setStatus(`submitted:${j.submissions}/4`);
      setError("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "submit_error");
    }
  }

  async function reinvite() {
    const res = await fetch(`/api/shamir/sessions/${sessionId}/reinvite`, { method: "POST" });
    const j = await res.json();
    if (!j.ok) {
      setError(j.error || "reinvite_failed");
      return;
    }
    setStatus(`reinvited:${j.reinviteCount}`);
    setError("");
    await refresh();
  }

  async function reconstructAndSend() {
    try {
      const payloadRes = await fetch(`/api/shamir/sessions/${sessionId}/reconstruct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainId: Number(chainId),
          contractAddress,
          nonce: Number(nonce),
        }),
      });
      const payload = await payloadRes.json();
      if (!payload.ok) throw new Error(payload.error || "reconstruct_failed");

      const { signer } = await connectWallet();
      const tx = await signer.sendTransaction({ to: payload.tx.to, data: payload.tx.data });
      setUnlockTxHash(tx.hash);
      writeFlowState({ lastTxHash: tx.hash, contractAddress, shamirSessionId: sessionId, questId });
      setStatus(`unlock_tx_sent:${tx.hash}`);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "unlock_error");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, questId]);

  const submittedWallets = submissions.map((s) => s.walletAddress.toLowerCase());
  const threshold = session?.threshold || 4;
  const ready = submissions.length >= threshold;

  return (
    <AppShell title="Unlock">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Shard提出">
          <div className="grid gap-2">
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={sessionId} onChange={(e) => setSessionId(e.target.value)} placeholder="sessionId" />
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={questId} onChange={(e) => setQuestId(e.target.value)} placeholder="questId" />
            <textarea className="min-h-[80px] rounded-lg border border-slate-300 px-3 py-2 text-sm" value={shard} onChange={(e) => setShard(e.target.value)} placeholder="your shard" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="rounded-lg border border-slate-400 px-3 py-2 text-sm" onClick={onConnect}>
              Wallet接続
            </button>
            <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white" onClick={submitShard}>
              shardを提出
            </button>
            <button className="rounded-lg bg-amber-600 px-3 py-2 text-sm text-white" onClick={reinvite}>
              再招集通知
            </button>
            <button className="rounded-lg border border-slate-400 px-3 py-2 text-sm" onClick={refresh}>
              更新
            </button>
          </div>
          <div className="mt-3 text-xs text-slate-500">wallet: {wallet || "not connected"}</div>
          <div className="mt-1 text-xs text-slate-500">status: {status}</div>
          <div className="mt-1 text-xs text-rose-600">{error}</div>
        </Panel>

        <Panel title="参加進捗">
          <div className="mb-3 flex gap-2">
            <Pill ok={ready} text={`shard: ${submissions.length}/${threshold}`} />
            <Pill ok={session?.status === "collecting"} text={`session: ${session?.status || "unknown"}`} />
          </div>
          <ul className="space-y-2 text-sm">
            {(session?.participants || []).map((p) => {
              const done = submittedWallets.includes(p.walletAddress.toLowerCase());
              return (
                <li key={p.walletAddress} className="rounded-lg border border-slate-200 p-2">
                  <div className="font-mono text-xs">{p.walletAddress}</div>
                  <div className={`text-xs ${done ? "text-emerald-700" : "text-slate-500"}`}>{done ? "提出済" : "未提出"}</div>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 text-sm">復元可否: {ready ? "復元可能" : "復元不可"}</div>
        </Panel>

        <Panel title="Unlockトランザクション">
          <div className="grid gap-2 sm:grid-cols-3">
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={contractAddress} onChange={(e) => setContractAddress(e.target.value)} placeholder="vault address" />
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={chainId} onChange={(e) => setChainId(e.target.value)} placeholder="chainId" />
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={nonce} onChange={(e) => setNonce(e.target.value)} placeholder="nonce" />
          </div>
          <button className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50" disabled={!ready} onClick={reconstructAndSend}>
            復元してunlock送信
          </button>
          <div className="mt-2 text-xs text-slate-500">tx: {unlockTxHash || "not sent"}</div>
        </Panel>
      </div>
    </AppShell>
  );
}
