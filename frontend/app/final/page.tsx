"use client";

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { AppShell, Panel, Pill } from "@/app/_components/shell";
import { connectWallet, switchToSepolia } from "@/app/_components/wallet";
import { readFlowState, writeFlowState } from "@/app/_components/flow-state";
import { FinalSceneVisual } from "@/app/_components/final-scene-visual";
import { DEMO_QUEST_ID, getExplorerTxUrl, SEPOLIA_CHAIN_ID } from "@/lib/finalSceneDemo";
import { resolveTask10Mode, type Task10Mode } from "@/lib/task10Config";

type SessionInfo = {
  threshold: number;
  status: string;
  participants: { walletAddress: string; claimedAt?: string }[];
};

type QuestOverview = {
  progress?: {
    shardCount: number;
  };
};

type PuzzleResponse = {
  ok: boolean;
  puzzle?: {
    title: string;
    storyLead: string;
    clueLines: string[];
    cipher: { id: string; symbol: string; category: string }[];
    candidates: { id: string; label: string; summary: string }[];
  };
  state?: {
    puzzleSolved: boolean;
    puzzleAttempts: number;
  };
  error?: string;
};

type Task10CheckResult = {
  unlockable: boolean;
  checks: {
    puzzle: boolean;
    position: boolean;
    heading: boolean;
    pitch: boolean;
    view: boolean;
  };
  detail: Record<string, unknown>;
};

function shortHash(value: string) {
  if (!value) return "";
  if (value.length < 14) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImageFromUrl(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function toGrayArray(img: HTMLImageElement, size = 32) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_context_unavailable");
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  const gray = new Float32Array(size * size);
  for (let i = 0; i < size * size; i += 1) {
    const offset = i * 4;
    gray[i] = 0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2];
  }
  return gray;
}

function calcSimilarity(a: Float32Array, b: Float32Array) {
  if (a.length !== b.length) throw new Error("array_size_mismatch");
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff += Math.abs(a[i] - b[i]);
  const mae = diff / a.length;
  return Math.max(0, 1 - mae / 255);
}

export default function FinalPage() {
  const flow = useMemo(() => readFlowState(), []);
  const [wallet, setWallet] = useState("");
  const [chainId, setChainId] = useState(Number(flow.chainId || 0));

  const [questId, setQuestId] = useState(flow.questId || DEMO_QUEST_ID);
  const [sessionId, setSessionId] = useState(flow.shamirSessionId || "");
  const [contractAddress, setContractAddress] = useState(flow.contractAddress || process.env.NEXT_PUBLIC_VAULT_ADDRESS || "");
  const [nonce, setNonce] = useState("101");

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [finalShare, setFinalShare] = useState("");
  const [unlockTxHash, setUnlockTxHash] = useState("");
  const [payoutTxHash, setPayoutTxHash] = useState("");

  const [status, setStatus] = useState("waiting_setup");
  const [error, setError] = useState("");

  const [mode, setMode] = useState<Task10Mode>(resolveTask10Mode(flow.task10Mode));
  const [puzzle, setPuzzle] = useState<PuzzleResponse["puzzle"] | null>(null);
  const [puzzleSolved, setPuzzleSolved] = useState(false);
  const [puzzleAttempts, setPuzzleAttempts] = useState(0);
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [hint, setHint] = useState("");

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [heading, setHeading] = useState("");
  const [pitch, setPitch] = useState("");
  const [viewScore, setViewScore] = useState("0");
  const [photoProvided, setPhotoProvided] = useState(false);
  const [photoName, setPhotoName] = useState("");
  const [task10Check, setTask10Check] = useState<Task10CheckResult | null>(null);

  const chainOk = chainId === SEPOLIA_CHAIN_ID;
  const threshold = session?.threshold || 4;
  const ready = submittedCount >= threshold;
  const unlocked = Boolean(unlockTxHash);
  const paid = Boolean(payoutTxHash);
  const task10Unlockable = Boolean(task10Check?.unlockable);

  async function refresh() {
    try {
      const questRes = await fetch(`/api/quests/${questId}`);
      const questJson = (await questRes.json()) as { ok: boolean; error?: string } & QuestOverview;
      if (!questJson.ok) throw new Error(questJson.error || "quest_fetch_failed");
      setSubmittedCount(questJson.progress?.shardCount || 0);

      if (sessionId) {
        const sessionRes = await fetch(`/api/shamir/sessions/${sessionId}`);
        const sessionJson = (await sessionRes.json()) as { ok: boolean; error?: string; session?: SessionInfo };
        if (sessionJson.ok && sessionJson.session) setSession(sessionJson.session);
      }

      const puzzleRes = await fetch(`/api/task10/puzzle?questId=${encodeURIComponent(questId)}`);
      const puzzleJson = (await puzzleRes.json()) as PuzzleResponse;
      if (puzzleJson.ok && puzzleJson.puzzle && puzzleJson.state) {
        setPuzzle(puzzleJson.puzzle);
        setPuzzleSolved(puzzleJson.state.puzzleSolved);
        setPuzzleAttempts(puzzleJson.state.puzzleAttempts);
        if (!selectedCandidate && puzzleJson.puzzle.candidates[0]) {
          setSelectedCandidate(puzzleJson.puzzle.candidates[0].id);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "refresh_failed");
    }
  }

  async function onConnect() {
    try {
      const { address, chainId: cid } = await connectWallet();
      setWallet(address);
      setChainId(cid);
      writeFlowState({ chainId: cid });
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "wallet_connect_failed");
    }
  }

  async function onSwitchSepolia() {
    try {
      await switchToSepolia();
      await onConnect();
      setStatus("switched_to_sepolia");
    } catch (e) {
      setError(e instanceof Error ? e.message : "switch_failed");
    }
  }

  async function bootstrap() {
    try {
      if (!wallet) throw new Error("wallet_not_connected");
      if (!chainOk) throw new Error("wrong_chain_switch_to_sepolia");
      setStatus("bootstrapping");
      const res = await fetch("/api/demo/final-scene/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: wallet, questId }),
      });
      const j = (await res.json()) as {
        ok: boolean;
        error?: string;
        sessionId?: string;
        finalPlayerShare?: string;
      };
      if (!j.ok || !j.sessionId || !j.finalPlayerShare) throw new Error(j.error || "bootstrap_failed");

      setSessionId(j.sessionId);
      setFinalShare(j.finalPlayerShare);
      setNonce(String(Math.floor(Date.now() / 1000)));
      writeFlowState({ questId, shamirSessionId: j.sessionId, contractAddress, chainId: SEPOLIA_CHAIN_ID, task10Mode: mode });
      setStatus("bootstrap_ready_3of4");
      setError("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "bootstrap_failed");
    }
  }

  async function solvePuzzle() {
    try {
      if (!selectedCandidate) throw new Error("candidate_not_selected");
      const res = await fetch("/api/task10/puzzle/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId, candidateId: selectedCandidate }),
      });
      const j = (await res.json()) as { ok: boolean; solved?: boolean; hint?: string; attempts?: number; error?: string };
      if (!j.ok) throw new Error(j.error || "solve_failed");
      setPuzzleSolved(Boolean(j.solved));
      setPuzzleAttempts(j.attempts || 0);
      setHint(j.hint || "");
      setStatus(j.solved ? "task10_puzzle_solved" : "task10_puzzle_failed");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "solve_failed");
    }
  }

  async function requestHint() {
    try {
      const res = await fetch("/api/task10/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId }),
      });
      const j = (await res.json()) as { ok: boolean; hint?: string; error?: string };
      if (!j.ok) throw new Error(j.error || "hint_failed");
      setHint(j.hint || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "hint_failed");
    }
  }

  async function captureLocation() {
    try {
      if (!navigator.geolocation) throw new Error("geolocation_not_supported");
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0,
        });
      });
      setLatitude(String(pos.coords.latitude));
      setLongitude(String(pos.coords.longitude));
    } catch (e) {
      setError(e instanceof Error ? e.message : "capture_location_failed");
    }
  }

  async function captureOrientation() {
    try {
      const result = await new Promise<{ heading: number; pitch: number }>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error("orientation_timeout")), 8000);
        const handler = (event: DeviceOrientationEvent) => {
          const h = typeof event.alpha === "number" ? event.alpha : null;
          const p = typeof event.beta === "number" ? event.beta : null;
          if (h === null || p === null) return;
          window.clearTimeout(timeout);
          window.removeEventListener("deviceorientation", handler);
          resolve({ heading: h, pitch: p });
        };
        window.addEventListener("deviceorientation", handler, { once: true });
      });
      setHeading(String(result.heading.toFixed(2)));
      setPitch(String(result.pitch.toFixed(2)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "capture_orientation_failed");
    }
  }

  async function onPhotoChange(file: File | null) {
    if (!file) {
      setPhotoProvided(false);
      setPhotoName("");
      setViewScore("0");
      return;
    }
    setPhotoProvided(true);
    setPhotoName(file.name);
    try {
      const [target, ref] = await Promise.all([
        loadImageFromFile(file),
        loadImageFromUrl("/demo/reference/toyokuni-gate.svg"),
      ]);
      const score = calcSimilarity(toGrayArray(target), toGrayArray(ref));
      setViewScore(score.toFixed(3));
    } catch {
      // Demo fallback: photo is accepted even if similarity calc fails.
      setViewScore("0.8");
    }
  }

  async function runTask10Check() {
    try {
      const res = await fetch("/api/task10/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questId,
          mode,
          latitude: latitude ? Number(latitude) : undefined,
          longitude: longitude ? Number(longitude) : undefined,
          heading: heading ? Number(heading) : undefined,
          pitch: pitch ? Number(pitch) : undefined,
          viewScore: Number(viewScore),
          photoProvided,
        }),
      });
      const j = (await res.json()) as {
        ok: boolean;
        error?: string;
        unlockable?: boolean;
        checks?: Task10CheckResult["checks"];
        detail?: Task10CheckResult["detail"];
      };
      if (!j.ok || !j.checks || !j.detail || j.unlockable === undefined) throw new Error(j.error || "task10_check_failed");
      setTask10Check({
        unlockable: j.unlockable,
        checks: j.checks,
        detail: j.detail,
      });
      setStatus(j.unlockable ? "task10_check_ok" : "task10_check_ng");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "task10_check_failed");
    }
  }

  async function simulateTask10Success() {
    try {
      const res = await fetch("/api/task10/check/simulate-success", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questId }),
      });
      const j = (await res.json()) as { ok: boolean; error?: string };
      if (!j.ok) throw new Error(j.error || "simulate_failed");
      setTask10Check({
        unlockable: true,
        checks: {
          puzzle: true,
          position: true,
          heading: true,
          pitch: true,
          view: true,
        },
        detail: { forcedSuccess: true },
      });
      setPuzzleSolved(true);
      setStatus("task10_simulate_success");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "simulate_failed");
    }
  }

  async function submitLastShard() {
    try {
      if (!sessionId) throw new Error("session_not_ready");
      if (!wallet) throw new Error("wallet_not_connected");
      if (!finalShare) throw new Error("final_share_missing");
      if (!chainOk) throw new Error("wrong_chain_switch_to_sepolia");

      setStatus("submitting_last_shard");
      const { signer, address } = await connectWallet();
      const timestamp = Date.now();
      const message = `${sessionId}:${questId}:${finalShare}:${timestamp}`;
      const signature = await signer.signMessage(message);
      const res = await fetch("/api/submit-shard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, questId, shard: finalShare, walletAddress: address, signature, timestamp }),
      });
      const j = (await res.json()) as { ok: boolean; error?: string };
      if (!j.ok) throw new Error(j.error || "submit_failed");
      setStatus("last_shard_submitted");
      setError("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "submit_failed");
    }
  }

  async function unlock() {
    try {
      if (!sessionId) throw new Error("session_not_ready");
      if (!contractAddress) throw new Error("contract_address_missing");
      if (!chainOk) throw new Error("wrong_chain_switch_to_sepolia");
      if (!ready) throw new Error("insufficient_shards");
      if (!task10Unlockable) throw new Error("task10_check_not_passed");

      setStatus("unlock_preparing");
      const payloadRes = await fetch(`/api/shamir/sessions/${sessionId}/reconstruct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chainId: SEPOLIA_CHAIN_ID,
          contractAddress,
          nonce: Number(nonce),
        }),
      });
      const payload = (await payloadRes.json()) as {
        ok: boolean;
        error?: string;
        tx?: { to: string; data: string };
      };
      if (!payload.ok || !payload.tx) throw new Error(payload.error || "reconstruct_failed");

      const { signer } = await connectWallet();
      const tx = await signer.sendTransaction({ to: payload.tx.to, data: payload.tx.data });
      setUnlockTxHash(tx.hash);
      writeFlowState({
        lastTxHash: tx.hash,
        questId,
        contractAddress,
        shamirSessionId: sessionId,
        chainId: SEPOLIA_CHAIN_ID,
        task10Mode: mode,
      });
      const rc = await tx.wait();
      if (rc?.status !== 1) throw new Error("unlock_tx_reverted");
      setStatus("unlock_confirmed");
      setError("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "unlock_failed");
    }
  }

  async function payout() {
    try {
      if (!contractAddress) throw new Error("contract_address_missing");
      if (!chainOk) throw new Error("wrong_chain_switch_to_sepolia");
      if (!unlockTxHash) throw new Error("unlock_not_done");

      setStatus("payout_pending");
      const { signer } = await connectWallet();
      const contract = new ethers.Contract(contractAddress, ["function payout(bytes32 questId)"], signer);
      const tx = await contract.payout(questId);
      setPayoutTxHash(tx.hash);
      writeFlowState({ lastTxHash: tx.hash, questId, contractAddress, chainId: SEPOLIA_CHAIN_ID, task10Mode: mode });
      const rc = await tx.wait();
      if (rc?.status !== 1) throw new Error("payout_tx_reverted");
      setStatus("payout_confirmed");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "payout_failed");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questId, sessionId]);

  useEffect(() => {
    writeFlowState({ task10Mode: mode });
  }, [mode]);

  return (
    <AppShell title="Final Scene Demo">
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Final Scene Progress">
          <FinalSceneVisual submitted={submittedCount} threshold={threshold} unlocked={unlocked} paid={paid} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill ok={chainOk} text={`chain: ${chainId || "not connected"}`} />
            <Pill ok={submittedCount >= 3} text={`preload: ${Math.min(submittedCount, 3)}/3`} />
            <Pill ok={ready} text={`keys: ${submittedCount}/${threshold}`} />
            <Pill ok={task10Unlockable} text={`task10: ${task10Unlockable ? "pass" : "pending"}`} />
            <Pill ok={unlocked} text={`unlock: ${unlocked ? "done" : "pending"}`} />
            <Pill ok={paid} text={`payout: ${paid ? "done" : "pending"}`} />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button className="rounded-lg border border-slate-400 px-3 py-2 text-sm" onClick={onConnect}>
              Wallet接続
            </button>
            <button className="rounded-lg border border-amber-700 bg-amber-600 px-3 py-2 text-sm text-white" onClick={onSwitchSepolia}>
              Sepoliaへ切替
            </button>
            <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50" disabled={!chainOk || !wallet} onClick={bootstrap}>
              Demo初期化（3/4）
            </button>
            <button className="rounded-lg border border-slate-400 px-3 py-2 text-sm" onClick={refresh}>
              状態を更新
            </button>
          </div>
          <div className="mt-3 text-xs text-slate-500">wallet: {wallet || "not connected"}</div>
          <div className="mt-1 text-xs text-slate-500">session: {sessionId || "not created"}</div>
          <div className="mt-1 text-xs text-slate-500">status: {status}</div>
          <div className="mt-1 text-xs text-rose-600">{error}</div>
        </Panel>

        <Panel title="Task10 謎解きと判定">
          <div className="grid gap-2">
            <label className="text-xs text-slate-600">判定モード</label>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={mode}
              onChange={(e) => setMode(resolveTask10Mode(e.target.value))}
            >
              <option value="current_location">current_location（現在地）</option>
              <option value="toyokuni_photo">toyokuni_photo（写真）</option>
            </select>
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-semibold">{puzzle?.title || "秀吉の花押鍵"}</div>
            <div className="mt-1 text-xs text-slate-600">{puzzle?.storyLead}</div>
            <ul className="mt-2 list-disc pl-5 text-xs text-slate-700">
              {(puzzle?.clueLines || []).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {(puzzle?.cipher || []).map((row) => (
                <span key={row.id} className="rounded-full border border-slate-300 bg-white px-2 py-1">
                  {row.symbol} ({row.category})
                </span>
              ))}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={selectedCandidate} onChange={(e) => setSelectedCandidate(e.target.value)}>
                {(puzzle?.candidates || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white" onClick={solvePuzzle}>
                候補を確定
              </button>
              <button className="rounded-lg border border-slate-400 px-3 py-2 text-sm" onClick={requestHint}>
                ヒント
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-600">puzzle: {puzzleSolved ? "solved" : "unsolved"} / attempts: {puzzleAttempts}</div>
            {hint ? <div className="mt-1 text-xs text-amber-700">hint: {hint}</div> : null}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="latitude" />
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="longitude" />
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={heading} onChange={(e) => setHeading(e.target.value)} placeholder="heading (deg)" />
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={pitch} onChange={(e) => setPitch(e.target.value)} placeholder="pitch (deg)" />
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={viewScore} onChange={(e) => setViewScore(e.target.value)} placeholder="viewScore (0-1)" />
            <div className="flex items-center gap-2 text-xs text-slate-600">photo: {photoName || "none"}</div>
          </div>

          {mode === "toyokuni_photo" ? (
            <div className="mt-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => onPhotoChange(e.target.files?.[0] || null)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          ) : null}

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button className="rounded-lg border border-slate-400 px-3 py-2 text-sm" onClick={captureLocation}>
              現在地取得
            </button>
            <button className="rounded-lg border border-slate-400 px-3 py-2 text-sm" onClick={captureOrientation}>
              端末向き取得
            </button>
            <button className="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white" onClick={runTask10Check}>
              Task10判定を実行
            </button>
            <button className="rounded-lg border border-fuchsia-700 px-3 py-2 text-sm text-fuchsia-700" onClick={simulateTask10Success}>
              simulate-success
            </button>
          </div>

          <div className="mt-2 text-xs text-slate-600">
            checks:
            {task10Check ? (
              <span>
                {" "}
                puzzle={String(task10Check.checks.puzzle)}, position={String(task10Check.checks.position)}, heading=
                {String(task10Check.checks.heading)}, pitch={String(task10Check.checks.pitch)}, view={String(task10Check.checks.view)}
              </span>
            ) : (
              " pending"
            )}
          </div>
        </Panel>

        <Panel title="Last Key -> Unlock -> Payout">
          <div className="grid gap-2">
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={questId} onChange={(e) => setQuestId(e.target.value)} placeholder="questId(bytes32)" />
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={contractAddress} onChange={(e) => setContractAddress(e.target.value)} placeholder="vault contract address" />
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={nonce} onChange={(e) => setNonce(e.target.value)} placeholder="nonce" />
            <textarea className="min-h-[88px] rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs" value={finalShare} onChange={(e) => setFinalShare(e.target.value)} placeholder="final shard" />
          </div>

          <div className="mt-3 grid gap-2">
            <button
              className="rounded-lg bg-blue-700 px-3 py-2 text-sm text-white disabled:opacity-50"
              disabled={!chainOk || !sessionId || !finalShare || submittedCount >= threshold}
              onClick={submitLastShard}
            >
              最後の鍵を提出
            </button>
            <button
              className="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50"
              disabled={!chainOk || !ready || !contractAddress || !task10Unlockable}
              onClick={unlock}
            >
              unlock送信
            </button>
            <button className="rounded-lg bg-fuchsia-700 px-3 py-2 text-sm text-white disabled:opacity-50" disabled={!chainOk || !unlockTxHash || !contractAddress} onClick={payout}>
              payout送信
            </button>
          </div>

          <div className="mt-4 space-y-1 text-xs text-slate-600">
            <div>unlock tx: {unlockTxHash ? shortHash(unlockTxHash) : "not sent"}</div>
            <div>payout tx: {payoutTxHash ? shortHash(payoutTxHash) : "not sent"}</div>
          </div>
          <div className="mt-2 space-y-1 text-xs">
            {unlockTxHash ? (
              <a className="text-blue-700 underline" href={getExplorerTxUrl(unlockTxHash)} target="_blank" rel="noreferrer">
                unlockをEtherscanで確認
              </a>
            ) : null}
            {payoutTxHash ? (
              <a className="block text-blue-700 underline" href={getExplorerTxUrl(payoutTxHash)} target="_blank" rel="noreferrer">
                payoutをEtherscanで確認
              </a>
            ) : null}
          </div>
        </Panel>

        <Panel title="Participants">
          <ul className="space-y-2 text-xs">
            {(session?.participants || []).map((p) => (
              <li key={p.walletAddress} className="rounded-lg border border-slate-200 p-2">
                <div className="font-mono">{p.walletAddress}</div>
                <div className="text-slate-500">{p.claimedAt ? "claimed" : "claim pending"}</div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </AppShell>
  );
}
