"use client";

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import {
    GameShell,
    PhaseCard,
    GoldButton,
    StatusBadge,
    GoldDivider,
    TextSm,
} from "@/app/_components/GameShell";
import { connectWallet, switchToSepolia, switchToMinato } from "@/app/_components/wallet";
import { readFlowState, writeFlowState } from "@/app/_components/flow-state";
import { DEMO_QUEST_ID, getExplorerTxUrl, SEPOLIA_CHAIN_ID, MINATO_CHAIN_ID } from "@/lib/finalSceneDemo";
import { resolveTask10Mode, type Task10Mode } from "@/lib/task10Config";
import Image from "next/image";

/* ── Types (reused from app/final) ── */
type SessionInfo = {
    threshold: number;
    status: string;
    participants: { walletAddress: string; claimedAt?: string }[];
};
type QuestOverview = { progress?: { shardCount: number } };
type PuzzleResponse = {
    ok: boolean;
    puzzle?: {
        title: string;
        storyLead: string;
        clueLines: string[];
        cipher: { id: string; symbol: string; category: string }[];
        candidates: { id: string; label: string; summary: string }[];
    };
    state?: { puzzleSolved: boolean; puzzleAttempts: number; hintRequests: number };
    error?: string;
};
type Task10CheckResult = {
    unlockable: boolean;
    checks: { puzzle: boolean; position: boolean; heading: boolean; pitch: boolean; view: boolean };
    detail: Record<string, unknown>;
};

function shortHash(v: string) {
    if (!v || v.length < 14) return v;
    return `${v.slice(0, 8)}…${v.slice(-6)}`;
}

function loadImageFromFile(file: File) {
    return new Promise<HTMLImageElement>((res, rej) => {
        const r = new FileReader();
        r.onload = () => { const i = new window.Image(); i.onload = () => res(i); i.onerror = rej; i.src = String(r.result); };
        r.onerror = rej; r.readAsDataURL(file);
    });
}
function loadImageFromUrl(url: string) {
    return new Promise<HTMLImageElement>((res, rej) => { const i = new window.Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
}
function toGrayArray(img: HTMLImageElement, size = 32) {
    const c = document.createElement("canvas"); c.width = c.height = size;
    const ctx = c.getContext("2d"); if (!ctx) throw new Error("no_ctx");
    ctx.drawImage(img, 0, 0, size, size);
    const d = ctx.getImageData(0, 0, size, size).data;
    const g = new Float32Array(size * size);
    for (let i = 0; i < size * size; i++) { const o = i * 4; g[i] = 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2]; }
    return g;
}
function calcSimilarity(a: Float32Array, b: Float32Array) {
    let diff = 0; for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i]);
    return Math.max(0, 1 - diff / a.length / 255);
}

/* ── Phase label map ── */
const PHASES = [
    { icon: "📖", label: "序章 — 花押残影" },
    { icon: "🔣", label: "換字暗号を解読せよ" },
    { icon: "📍", label: "現地へ向かえ" },
    { icon: "🗝️", label: "最後の鍵を提出" },
    { icon: "⛓️", label: "封印を解く" },
    { icon: "🏮", label: "継承 — 完了" },
];

/* ════════════════════════════════════════════
   Main Page
════════════════════════════════════════════ */
export default function ZaneiPage() {
    const flow = useMemo(() => readFlowState(), []);
    const normalizedQuestId = useMemo(
        () => (ethers.isHexString(flow.questId, 32) ? flow.questId : DEMO_QUEST_ID),
        [flow.questId]
    );
    useEffect(() => {
        if (flow.questId !== normalizedQuestId) writeFlowState({ questId: normalizedQuestId });
    }, [flow.questId, normalizedQuestId]);

    /* wallet / chain */
    const [wallet, setWallet] = useState("");
    const [chainId, setChainId] = useState(Number(flow.chainId || 0));
    const [selectedNetwork, setSelectedNetwork] = useState<"sepolia" | "minato">("sepolia");
    const targetChainId = selectedNetwork === "minato" ? MINATO_CHAIN_ID : SEPOLIA_CHAIN_ID;
    const chainOk = chainId === targetChainId;

    /* quest ids */
    const [questId] = useState(normalizedQuestId);
    const [sessionId, setSessionId] = useState(flow.shamirSessionId || "");
    const [contractAddress] = useState(process.env.NEXT_PUBLIC_VAULT_ADDRESS || flow.contractAddress || "");
    const [nonce, setNonce] = useState("101");

    /* session */
    const [session, setSession] = useState<SessionInfo | null>(null);
    const [submittedCount, setSubmittedCount] = useState(0);
    const [finalShare, setFinalShare] = useState("");
    const [unlockTxHash, setUnlockTxHash] = useState("");
    const [payoutTxHash, setPayoutTxHash] = useState("");

    /* puzzle */
    const [mode] = useState<Task10Mode>(resolveTask10Mode(flow.task10Mode));
    const [puzzle, setPuzzle] = useState<PuzzleResponse["puzzle"] | null>(null);
    const [puzzleSolved, setPuzzleSolved] = useState(false);
    const [puzzleAttempts, setPuzzleAttempts] = useState(0);
    const [selectedCandidate, setSelectedCandidate] = useState("");
    const [hint, setHint] = useState("");
    const [hintRole, setHintRole] = useState("");
    const [hintLevel, setHintLevel] = useState(0);
    const [hintRequests, setHintRequests] = useState(0);
    const [requiredHintRequests, setRequiredHintRequests] = useState(3);

    /* location */
    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");
    const [heading, setHeading] = useState("");
    const [pitch, setPitch] = useState("");
    const [viewScore, setViewScore] = useState("0");
    const [photoProvided, setPhotoProvided] = useState(false);
    const [photoName, setPhotoName] = useState("");
    const [task10Check, setTask10Check] = useState<Task10CheckResult | null>(null);

    /* ui state */
    const [phase, setPhase] = useState(0); // 0=intro 1=cipher 2=locate 3=key 4=unlock 5=payout
    const [opStatus, setOpStatus] = useState("");
    const [error, setError] = useState("");
    const [movieEnded, setMovieEnded] = useState(false);
    const [movieEnded1, setMovieEnded1] = useState(false);
    const [movieEnded2, setMovieEnded2] = useState(false);
    const [movieEnded3, setMovieEnded3] = useState(false);
    const [movieEnded4, setMovieEnded4] = useState(false);
    const [movieEnded5, setMovieEnded5] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    /* derived */
    const threshold = session?.threshold || 4;
    const ready = submittedCount >= threshold;
    const unlocked = Boolean(unlockTxHash);
    const paid = Boolean(payoutTxHash);
    const task10Unlockable = Boolean(task10Check?.unlockable);
    const hintProgress = Math.min(hintRequests, requiredHintRequests);
    const canConfirmCandidate = Boolean(selectedCandidate) && hintProgress >= requiredHintRequests;

    /* ── Side-effect: auto-advance phase ── */
    useEffect(() => {
        if (puzzleSolved && phase === 1) setPhase(2);
    }, [puzzleSolved, phase]);
    useEffect(() => {
        if (task10Unlockable && phase === 2) setPhase(3);
    }, [task10Unlockable, phase]);
    useEffect(() => {
        if (ready && sessionId && phase === 3) setPhase(4);
    }, [ready, sessionId, phase]);
    useEffect(() => {
        if (unlocked && phase === 4) setPhase(5);
    }, [unlocked, phase]);
    useEffect(() => {
        setHydrated(true);
    }, []);

    /* ── API helpers (identical logic to app/final) ── */
    async function refresh() {
        try {
            const qr = await fetch(`/api/quests/${questId}`);
            const qj = (await qr.json()) as { ok: boolean; error?: string } & QuestOverview;
            if (qj.ok) setSubmittedCount(qj.progress?.shardCount || 0);
            if (sessionId) {
                const sr = await fetch(`/api/shamir/sessions/${sessionId}`);
                const sj = (await sr.json()) as { ok: boolean; session?: SessionInfo };
                if (sj.ok && sj.session) setSession(sj.session);
            }
            const pr = await fetch(`/api/task10/puzzle?questId=${encodeURIComponent(questId)}`);
            const pj = (await pr.json()) as PuzzleResponse;
            if (pj.ok && pj.puzzle && pj.state) {
                setPuzzle(pj.puzzle);
                setPuzzleSolved(pj.state.puzzleSolved);
                setPuzzleAttempts(pj.state.puzzleAttempts);
                setHintRequests(pj.state.hintRequests || 0);
                if (!selectedCandidate && pj.puzzle.candidates[0]) setSelectedCandidate(pj.puzzle.candidates[0].id);
            }
        } catch (e) { setError(e instanceof Error ? e.message : "refresh_failed"); }
    }

    async function onConnect() {
        try { const { address, chainId: c } = await connectWallet(); setWallet(address); setChainId(c); writeFlowState({ chainId: c }); setError(""); }
        catch (e) { setError(e instanceof Error ? e.message : "connect_failed"); }
    }
    async function onSwitchNetwork() {
        try {
            if (selectedNetwork === "minato") { await switchToMinato(); } else { await switchToSepolia(); }
            await onConnect();
        } catch (e) { setError(e instanceof Error ? e.message : "switch_failed"); }
    }
    async function bootstrap() {
        try {
            if (!wallet || !chainOk) throw new Error("wallet_or_chain_missing");
            setOpStatus("セッション初期化中…");
            const r = await fetch("/api/demo/final-scene/bootstrap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ walletAddress: wallet, questId }) });
            const j = (await r.json()) as { ok: boolean; error?: string; sessionId?: string; finalPlayerShare?: string };
            if (!j.ok || !j.sessionId || !j.finalPlayerShare) throw new Error(j.error || "bootstrap_failed");
            setSessionId(j.sessionId); setFinalShare(j.finalPlayerShare); setNonce(String(Math.floor(Date.now() / 1000)));
            writeFlowState({ questId, shamirSessionId: j.sessionId, contractAddress, chainId, task10Mode: mode });
            setOpStatus("3/4 鍵がセットされました"); setError(""); await refresh();
        } catch (e) { setError(e instanceof Error ? e.message : "bootstrap_failed"); setOpStatus(""); }
    }
    async function solvePuzzle() {
        try {
            if (!selectedCandidate) throw new Error("candidate_missing");
            const r = await fetch("/api/task10/puzzle/solve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questId, candidateId: selectedCandidate }) });
            const j = (await r.json()) as {
                ok: boolean;
                solved?: boolean;
                needsMoreHints?: boolean;
                hint?: string;
                role?: string;
                hintLevel?: number;
                hintRequests?: number;
                requiredHintRequests?: number;
                guidance?: string;
                attempts?: number;
                error?: string;
            };
            if (!j.ok) throw new Error(j.error || "solve_failed");
            setPuzzleSolved(Boolean(j.solved));
            setPuzzleAttempts(j.attempts || 0);
            if (typeof j.hintRequests === "number") setHintRequests(j.hintRequests);
            if (typeof j.requiredHintRequests === "number") setRequiredHintRequests(j.requiredHintRequests);
            if (typeof j.hintLevel === "number") setHintLevel(j.hintLevel);
            if (j.role) setHintRole(j.role);
            if (j.hint) setHint(j.hint);
            if (j.guidance) setOpStatus(j.guidance);
            if (!j.solved && j.needsMoreHints && !j.guidance) {
                setOpStatus("ヒントを3段階まで進めてから候補を確定してください。");
            }
            setError("");
        } catch (e) { setError(e instanceof Error ? e.message : "solve_failed"); }
    }
    async function requestHint() {
        try {
            const r = await fetch("/api/task10/hint", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questId }) });
            const j = (await r.json()) as {
                ok: boolean;
                hint?: string;
                role?: string;
                level?: number;
                hintRequests?: number;
                requiredHintRequests?: number;
                error?: string;
            };
            if (!j.ok) throw new Error(j.error || "hint_failed");
            setHint(j.hint || "");
            if (j.role) setHintRole(j.role);
            if (typeof j.level === "number") setHintLevel(j.level);
            if (typeof j.hintRequests === "number") setHintRequests(j.hintRequests);
            if (typeof j.requiredHintRequests === "number") setRequiredHintRequests(j.requiredHintRequests);
            if (typeof j.level === "number" && typeof j.requiredHintRequests === "number") {
                setOpStatus(`ヒント ${j.level}/${j.requiredHintRequests} を表示中`);
            }
            setError("");
        } catch (e) { setError(e instanceof Error ? e.message : "hint_failed"); }
    }
    async function simulatePuzzleSuccess() {
        try {
            const r = await fetch("/api/task10/puzzle/simulate-success", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questId }) });
            const j = (await r.json()) as { ok: boolean; error?: string };
            if (!j.ok) throw new Error(j.error || "simulate_puzzle_failed");
            setPuzzleSolved(true);
            setTask10Check(null);
            setPhase(2);
            setOpStatus("換字暗号フェーズをスキップしました。");
            setError("");
            await refresh();
        } catch (e) { setError(e instanceof Error ? e.message : "simulate_puzzle_failed"); }
    }
    async function captureLocation() {
        try {
            if (!navigator.geolocation) throw new Error("geolocation_not_supported");
            const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }));
            setLatitude(String(pos.coords.latitude)); setLongitude(String(pos.coords.longitude));
        } catch (e) { setError(e instanceof Error ? e.message : "capture_location_failed"); }
    }
    async function captureOrientation() {
        try {
            const result = await new Promise<{ heading: number; pitch: number }>((res, rej) => {
                const t = window.setTimeout(() => rej(new Error("orientation_timeout")), 8000);
                const h = (ev: DeviceOrientationEvent) => {
                    if (ev.alpha === null || ev.beta === null) return;
                    window.clearTimeout(t); window.removeEventListener("deviceorientation", h);
                    res({ heading: ev.alpha, pitch: ev.beta });
                };
                window.addEventListener("deviceorientation", h, { once: true });
            });
            setHeading(String(result.heading.toFixed(2))); setPitch(String(result.pitch.toFixed(2)));
        } catch (e) { setError(e instanceof Error ? e.message : "capture_orientation_failed"); }
    }
    async function onPhotoChange(file: File | null) {
        if (!file) { setPhotoProvided(false); setPhotoName(""); setViewScore("0"); return; }
        setPhotoProvided(true); setPhotoName(file.name);
        try {
            const [tgt, ref] = await Promise.all([loadImageFromFile(file), loadImageFromUrl("/demo/reference/toyokuni-gate.svg")]);
            setViewScore(calcSimilarity(toGrayArray(tgt), toGrayArray(ref)).toFixed(3));
        } catch { setViewScore("0.8"); }
    }
    async function runTask10Check() {
        try {
            setOpStatus("判定中…");
            const r = await fetch("/api/task10/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questId, mode, latitude: latitude ? Number(latitude) : undefined, longitude: longitude ? Number(longitude) : undefined, heading: heading ? Number(heading) : undefined, pitch: pitch ? Number(pitch) : undefined, viewScore: Number(viewScore), photoProvided }) });
            const j = (await r.json()) as { ok: boolean; error?: string; unlockable?: boolean; checks?: Task10CheckResult["checks"]; detail?: Task10CheckResult["detail"] };
            if (!j.ok || !j.checks || !j.detail || j.unlockable === undefined) throw new Error(j.error || "check_failed");
            setTask10Check({ unlockable: j.unlockable, checks: j.checks, detail: j.detail });
            setOpStatus(j.unlockable ? "✓ 判定通過" : "✗ 判定失敗"); setError("");
        } catch (e) { setError(e instanceof Error ? e.message : "check_failed"); setOpStatus(""); }
    }
    async function simulateTask10Success() {
        try {
            const r = await fetch("/api/task10/check/simulate-success", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questId }) });
            const j = (await r.json()) as { ok: boolean; error?: string };
            if (!j.ok) throw new Error(j.error || "simulate_failed");
            setTask10Check({ unlockable: true, checks: { puzzle: true, position: true, heading: true, pitch: true, view: true }, detail: { forcedSuccess: true } });
            setPuzzleSolved(true); setOpStatus("✓ シミュレート成功"); setError("");
        } catch (e) { setError(e instanceof Error ? e.message : "simulate_failed"); }
    }
    async function submitLastShard() {
        try {
            if (!sessionId || !wallet || !finalShare || !chainOk) throw new Error("前提条件が揃っていません");
            setOpStatus("署名中…");
            const { signer, address } = await connectWallet();
            const timestamp = Date.now();
            const sig = await signer.signMessage(`${sessionId}:${questId}:${finalShare}:${timestamp}`);
            const r = await fetch("/api/submit-shard", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, questId, shard: finalShare, walletAddress: address, signature: sig, timestamp }) });
            const j = (await r.json()) as { ok: boolean; error?: string };
            if (!j.ok) throw new Error(j.error || "submit_failed");
            setOpStatus("鍵を提出しました"); setError(""); await refresh();
        } catch (e) { setError(e instanceof Error ? e.message : "submit_failed"); setOpStatus(""); }
    }
    async function unlock() {
        try {
            if (!sessionId || !contractAddress || !chainOk || !ready || !task10Unlockable) throw new Error("解錠条件が揃っていません");
            setOpStatus("解錠準備中…");
            const pr = await fetch(`/api/shamir/sessions/${sessionId}/reconstruct`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chainId, contractAddress, nonce: Number(nonce) }) });
            const pl = (await pr.json()) as {
                ok: boolean;
                error?: string;
                hint?: string;
                contractAddress?: string;
                tx?: { to: string; data: string };
            };
            if (!pl.ok || !pl.tx) {
                const detail = [pl.error || "reconstruct_failed", pl.hint, pl.contractAddress].filter(Boolean).join(" | ");
                throw new Error(detail || "reconstruct_failed");
            }
            setOpStatus("トランザクション送信中…");
            const { signer } = await connectWallet();
            const tx = await signer.sendTransaction({ to: pl.tx.to, data: pl.tx.data });
            setUnlockTxHash(tx.hash);
            writeFlowState({ lastTxHash: tx.hash, questId, contractAddress, shamirSessionId: sessionId, chainId, task10Mode: mode });
            const rc = await tx.wait();
            if (rc?.status !== 1) throw new Error("unlock_tx_reverted");
            setOpStatus("✓ 解錠完了"); setError(""); await refresh();
        } catch (e) {
            const msg = e instanceof Error ? e.message : "unlock_failed";
            if (msg.includes("onchain_no_quest") || msg.includes("no quest")) {
                setError(`onchain_no_quest: createQuest must be executed for this questId before unlock. (contract=${contractAddress})`);
            } else {
                setError(msg);
            }
            setOpStatus("");
        }
    }
    async function payout() {
        try {
            if (!contractAddress || !chainOk || !unlockTxHash) throw new Error("支払い条件が揃っていません");
            setOpStatus("継承物を送信中…");
            const { signer } = await connectWallet();
            const contract = new ethers.Contract(contractAddress, ["function payout(bytes32 questId)"], signer);
            const tx = await contract.payout(questId);
            setPayoutTxHash(tx.hash);
            writeFlowState({ lastTxHash: tx.hash, questId, contractAddress, chainId, task10Mode: mode });
            const rc = await tx.wait();
            if (rc?.status !== 1) throw new Error("payout_tx_reverted");
            setOpStatus("✓ 継承完了"); setError("");
        } catch (e) { setError(e instanceof Error ? e.message : "payout_failed"); setOpStatus(""); }
    }

    useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [questId, sessionId]);

    /* ════ RENDER ════ */
    if (!hydrated) {
        return (
            <GameShell>
                <div className="mb-4 rounded-xl px-4 py-3 text-xs" style={{ background: "rgba(201,150,42,0.08)", border: "1px solid rgba(201,150,42,0.28)", color: "#c9962a" }}>
                    読み込み中...
                </div>
            </GameShell>
        );
    }
    return (
        <GameShell>
            {/* ── Hero banner ── */}
            <div className="relative mb-6 overflow-hidden rounded-2xl" style={{ height: 180 }}>
                <Image
                    src="/zanei/kyoto-intro-bg.png"
                    alt="花押残影"
                    fill
                    className="object-cover"
                    priority
                />
                <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to bottom, rgba(10,10,26,0.3) 0%, rgba(10,10,26,0.85) 100%)" }}
                />
                <div className="absolute bottom-0 left-0 p-5">
                    <p className="text-xs tracking-[0.25em]" style={{ color: "rgba(201,150,42,0.8)" }}>残影 — ZANEI</p>
                    <h1 className="text-2xl font-bold tracking-tight" style={{ color: "#f5e8c0", textShadow: "0 0 20px rgba(201,150,42,0.4)" }}>
                        花押残影
                    </h1>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>最後の継承鍵</p>
                </div>
                {/* Status badges top-right */}
                <div className="absolute right-3 top-3 flex flex-col gap-1 items-end">
                    <StatusBadge ok={chainOk} text={chainOk ? (selectedNetwork === "minato" ? "Minato" : "Sepolia") : "未接続"} />
                    <StatusBadge ok={ready} text={`鍵 ${submittedCount}/${threshold}`} />
                </div>
            </div>

            {/* ── Error banner ── */}
            {error && (
                <div className="mb-4 rounded-xl px-4 py-3 text-xs" style={{ background: "rgba(180,30,30,0.2)", border: "1px solid rgba(200,60,60,0.4)", color: "#e07070" }}>
                    ⚠ {error}
                </div>
            )}
            {opStatus && !error && (
                <div className="mb-4 rounded-xl px-4 py-3 text-xs" style={{ background: "rgba(40,80,40,0.2)", border: "1px solid rgba(60,180,80,0.3)", color: "#60d080" }}>
                    {opStatus}
                </div>
            )}

            {/* ════ PHASE 0: INTRO ════ */}
            <PhaseCard phase={0} currentPhase={phase} icon={PHASES[0].icon} title={PHASES[0].label} done={phase > 0}>
                <TextSm>慶長五年。関ヶ原の戦いから十五年が過ぎた。旧臣たちは秘かに継承物を隠し、最後の鍵を次代へと残した。</TextSm>
                <GoldDivider />

                {/* Video player with fallback */}
                <div className="relative mb-4 overflow-hidden rounded-xl" style={{ background: "rgba(0,0,0,0.5)", minHeight: 120 }}>
                    <video
                        className="w-full rounded-xl"
                        src="/zanei/movie/01-intro.mp4"
                        playsInline
                        controls
                        onEnded={() => setMovieEnded(true)}
                        onError={() => setMovieEnded(true)} // fallback if no video
                        style={{ display: "block" }}
                    />
                    {!movieEnded && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: "rgba(0,0,0,0.6)" }}>
                            <p className="text-xs" style={{ color: "rgba(201,150,42,0.7)" }}>動画が再生されない場合</p>
                            <button
                                onClick={() => setMovieEnded(true)}
                                className="text-xs px-4 py-2 rounded-lg"
                                style={{ background: "rgba(201,150,42,0.2)", color: "#c9962a", border: "1px solid rgba(201,150,42,0.4)" }}
                            >
                                スキップして始める
                            </button>
                        </div>
                    )}
                </div>

                <GoldDivider />

                {/* Wallet setup */}
                <p className="mb-3 text-xs tracking-widest" style={{ color: "rgba(201,150,42,0.7)" }}>— WALLET —</p>
                {/* Network selector tabs */}
                <div className="mb-3 flex gap-2">
                    <button
                        onClick={() => setSelectedNetwork("sepolia")}
                        className="flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all"
                        style={selectedNetwork === "sepolia"
                            ? { background: "rgba(201,150,42,0.25)", border: "1px solid rgba(201,150,42,0.7)", color: "#f5e8c0" }
                            : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}
                    >
                        Sepolia
                    </button>
                    <button
                        onClick={() => setSelectedNetwork("minato")}
                        className="flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all"
                        style={selectedNetwork === "minato"
                            ? { background: "rgba(80,160,255,0.2)", border: "1px solid rgba(80,160,255,0.6)", color: "#a0cfff" }
                            : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.4)" }}
                    >
                        Minato
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <GoldButton variant="secondary" onClick={onConnect}>ウォレット接続</GoldButton>
                    <GoldButton variant="ghost" onClick={onSwitchNetwork}>{selectedNetwork === "minato" ? "Minato切替" : "Sepolia切替"}</GoldButton>
                </div>
                {wallet && (
                    <p className="mt-2 text-center text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{shortHash(wallet)}</p>
                )}

                <GoldDivider />
                <GoldButton
                    onClick={async () => { await bootstrap(); if (!error) setPhase(1); }}
                    disabled={!chainOk || !wallet}
                >
                    旅を始める（Demo初期化）
                </GoldButton>
                <div className="mt-2 text-center">
                    <button
                        onClick={() => setPhase(1)}
                        className="text-xs"
                        style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                        スキップ →
                    </button>
                </div>
            </PhaseCard>

            {/* ════ PHASE 1: CIPHER PUZZLE ════ */}
            <PhaseCard phase={1} currentPhase={phase} icon={PHASES[1].icon} title={PHASES[1].label} done={phase > 1}>
                {/* Video player for Phase 1 */}
                <div className="relative mb-4 overflow-hidden rounded-xl" style={{ background: "rgba(0,0,0,0.5)", minHeight: 120 }}>
                    <video
                        className="w-full rounded-xl"
                        src="/zanei/movie/02-cipher.mp4"
                        playsInline
                        controls
                        onEnded={() => setMovieEnded1(true)}
                        onError={() => setMovieEnded1(true)}
                        style={{ display: "block" }}
                    />
                    {!movieEnded1 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: "rgba(0,0,0,0.6)" }}>
                            <p className="text-xs" style={{ color: "rgba(201,150,42,0.7)" }}>動画が再生されない場合</p>
                            <button
                                onClick={() => setMovieEnded1(true)}
                                className="text-xs px-4 py-2 rounded-lg"
                                style={{ background: "rgba(201,150,42,0.2)", color: "#c9962a", border: "1px solid rgba(201,150,42,0.4)" }}
                            >
                                スキップして進む
                            </button>
                        </div>
                    )}
                </div>

                <div className="mb-4 rounded-xl p-4" style={{ background: "rgba(201,150,42,0.06)", border: "1px solid rgba(201,150,42,0.2)" }}>
                    <p className="mb-1 text-sm font-semibold" style={{ color: "#c9962a" }}>{puzzle?.title || "秀吉の花押鍵"}</p>
                    <TextSm>{puzzle?.storyLead}</TextSm>
                    <ul className="mt-3 space-y-1">
                        {(puzzle?.clueLines || []).map((line) => (
                            <li key={line} className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>▸ {line}</li>
                        ))}
                    </ul>

                    {/* Cipher symbols */}
                    {puzzle?.cipher?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                            {puzzle.cipher.map((row) => (
                                <span key={row.id} className="rounded-full px-3 py-1 text-xs" style={{ background: "rgba(201,150,42,0.12)", border: "1px solid rgba(201,150,42,0.35)", color: "#e8c070" }}>
                                    {row.symbol}
                                </span>
                            ))}
                        </div>
                    ) : null}
                </div>

                {/* Candidate selection */}
                <p className="mb-2 text-xs tracking-widest" style={{ color: "rgba(201,150,42,0.6)" }}>— 候補地を選べ —</p>
                <div className="space-y-2 mb-4">
                    {(puzzle?.candidates || []).map((c) => (
                        <button
                            key={c.id}
                            onClick={() => setSelectedCandidate(c.id)}
                            className="w-full rounded-xl px-4 py-3 text-left transition-all"
                            style={{
                                background: selectedCandidate === c.id ? "rgba(201,150,42,0.18)" : "rgba(255,255,255,0.04)",
                                border: selectedCandidate === c.id ? "1px solid rgba(201,150,42,0.6)" : "1px solid rgba(255,255,255,0.1)",
                                color: selectedCandidate === c.id ? "#e8c070" : "rgba(255,255,255,0.5)",
                            }}
                        >
                            <p className="text-sm font-semibold">{c.label}</p>
                        </button>
                    ))}
                </div>

                {hint && (
                    <div className="mb-3 rounded-xl px-4 py-3 text-xs" style={{ background: "rgba(201,150,42,0.1)", border: "1px solid rgba(201,150,42,0.3)", color: "#c9962a" }}>
                        <p className="font-semibold">
                            💡 ヒント {hintLevel || hintProgress}/{requiredHintRequests}{hintRole ? ` - ${hintRole}` : ""}
                        </p>
                        <p className="mt-1">{hint}</p>
                    </div>
                )}
                <p className="mb-3 text-xs text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                    試行: {puzzleAttempts} 回 / ヒント: {hintProgress}/{requiredHintRequests} / 解読: {puzzleSolved ? "✓ 成功" : "未解読"}
                </p>
                {!puzzleSolved && hintProgress < requiredHintRequests && (
                    <p className="mb-3 text-xs text-center" style={{ color: "rgba(201,150,42,0.75)" }}>
                        先にヒントを{requiredHintRequests}段階まで進めると候補確定が解放されます。
                    </p>
                )}

                <div className="grid grid-cols-2 gap-2">
                    <GoldButton onClick={solvePuzzle} disabled={!canConfirmCandidate}>候補を確定する</GoldButton>
                    <GoldButton variant="ghost" onClick={requestHint}>ヒントを求める</GoldButton>
                </div>
                <div className="mt-2">
                    <GoldButton variant="danger" onClick={simulatePuzzleSuccess}>（DEMO: 謎解きのみスキップ）</GoldButton>
                </div>
            </PhaseCard>

            {/* ════ PHASE 2: LOCATION ════ */}
            <PhaseCard phase={2} currentPhase={phase} icon={PHASES[2].icon} title={PHASES[2].label} done={phase > 2}>
                <TextSm>豊国神社周辺（半径120m）へ向かい、正しい方向と視点で封印を解け。</TextSm>
                <GoldDivider />

                {/* Video player for Phase 2 */}
                <div className="relative mb-4 overflow-hidden rounded-xl" style={{ background: "rgba(0,0,0,0.5)", minHeight: 120 }}>
                    <video
                        className="w-full rounded-xl"
                        src="/zanei/movie/03-location.mp4"
                        playsInline
                        controls
                        onEnded={() => setMovieEnded2(true)}
                        onError={() => setMovieEnded2(true)}
                        style={{ display: "block" }}
                    />
                    {!movieEnded2 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: "rgba(0,0,0,0.6)" }}>
                            <p className="text-xs" style={{ color: "rgba(201,150,42,0.7)" }}>動画が再生されない場合</p>
                            <button
                                onClick={() => setMovieEnded2(true)}
                                className="text-xs px-4 py-2 rounded-lg"
                                style={{ background: "rgba(201,150,42,0.2)", color: "#c9962a", border: "1px solid rgba(201,150,42,0.4)" }}
                            >
                                スキップして進む
                            </button>
                        </div>
                    )}
                </div>

                {/* GPS / orientation data */}
                <div className="mb-4 grid grid-cols-2 gap-2">
                    {[
                        { label: "緯度", value: latitude, placeholder: "未取得" },
                        { label: "経度", value: longitude, placeholder: "未取得" },
                        { label: "方位 (°)", value: heading, placeholder: "未取得" },
                        { label: "ピッチ (°)", value: pitch, placeholder: "未取得" },
                    ].map(({ label, value, placeholder }) => (
                        <div key={label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                            <p className="text-xs mb-1" style={{ color: "rgba(201,150,42,0.6)" }}>{label}</p>
                            <p className="text-sm font-mono" style={{ color: value ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.2)" }}>{value || placeholder}</p>
                        </div>
                    ))}
                </div>

                {/* Photo upload (toyokuni_photo mode) */}
                {mode === "toyokuni_photo" && (
                    <div className="mb-4">
                        <label className="mb-1 block text-xs" style={{ color: "rgba(201,150,42,0.6)" }}>景色写真を提出</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => onPhotoChange(e.target.files?.[0] || null)}
                            className="w-full rounded-xl border px-3 py-2 text-xs"
                            style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(201,150,42,0.3)", color: "rgba(255,255,255,0.6)" }}
                        />
                        {photoName && <p className="mt-1 text-xs" style={{ color: "rgba(201,150,42,0.7)" }}>📷 {photoName} / score: {viewScore}</p>}
                    </div>
                )}

                {/* Check result */}
                {task10Check && (
                    <div className="mb-4 rounded-xl p-3" style={{ background: task10Check.unlockable ? "rgba(40,120,60,0.15)" : "rgba(120,40,40,0.15)", border: `1px solid ${task10Check.unlockable ? "rgba(60,180,80,0.3)" : "rgba(200,60,60,0.3)"}` }}>
                        <p className="mb-2 text-xs font-semibold" style={{ color: task10Check.unlockable ? "#60d080" : "#e07070" }}>
                            {task10Check.unlockable ? "✓ 判定通過 — 前進せよ" : "✗ 判定失敗 — 再挑戦せよ"}
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {Object.entries(task10Check.checks).map(([k, v]) => (
                                <StatusBadge key={k} ok={v} text={k} />
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <GoldButton variant="secondary" onClick={captureLocation}>📍 現在地を取得</GoldButton>
                    <GoldButton variant="secondary" onClick={captureOrientation}>🧭 端末の向きを取得</GoldButton>
                    <GoldButton onClick={runTask10Check}>判定を実行する</GoldButton>
                    <GoldButton variant="danger" onClick={simulateTask10Success}>（DEMOスキップ）</GoldButton>
                </div>
            </PhaseCard>

            {/* ════ PHASE 3: LAST KEY ════ */}
            <PhaseCard phase={3} currentPhase={phase} icon={PHASES[3].icon} title={PHASES[3].label} done={phase > 3}>
                <TextSm>最後の鍵を提出し、4枚のシャードを揃えよ。</TextSm>
                <GoldDivider />

                {/* Video player for Phase 3 */}
                <div className="relative mb-4 overflow-hidden rounded-xl" style={{ background: "rgba(0,0,0,0.5)", minHeight: 120 }}>
                    <video
                        className="w-full rounded-xl"
                        src="/zanei/movie/04-key.mp4"
                        playsInline
                        controls
                        onEnded={() => setMovieEnded3(true)}
                        onError={() => setMovieEnded3(true)}
                        style={{ display: "block" }}
                    />
                    {!movieEnded3 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: "rgba(0,0,0,0.6)" }}>
                            <p className="text-xs" style={{ color: "rgba(201,150,42,0.7)" }}>動画が再生されない場合</p>
                            <button
                                onClick={() => setMovieEnded3(true)}
                                className="text-xs px-4 py-2 rounded-lg"
                                style={{ background: "rgba(201,150,42,0.2)", color: "#c9962a", border: "1px solid rgba(201,150,42,0.4)" }}
                            >
                                スキップして進む
                            </button>
                        </div>
                    )}
                </div>

                {/* Shard progress visual */}
                <div className="mb-4 flex justify-center gap-3">
                    {Array.from({ length: threshold }).map((_, i) => (
                        <div
                            key={i}
                            className="flex h-12 w-12 items-center justify-center rounded-full text-xl transition-all"
                            style={{
                                background: i < submittedCount ? "linear-gradient(135deg, #c9962a, #e8b84b)" : "rgba(255,255,255,0.06)",
                                boxShadow: i < submittedCount ? "0 0 16px rgba(201,150,42,0.5)" : "none",
                                border: i < submittedCount ? "none" : "1px solid rgba(255,255,255,0.12)",
                            }}
                        >
                            {i < submittedCount ? "🗝️" : "○"}
                        </div>
                    ))}
                </div>
                <p className="mb-4 text-center text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {submittedCount}/{threshold} 鍵が揃っている
                </p>

                {finalShare && (
                    <div className="mb-4 rounded-xl p-3" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(201,150,42,0.2)" }}>
                        <p className="mb-1 text-xs" style={{ color: "rgba(201,150,42,0.6)" }}>保持している鍵の断片</p>
                        <p className="break-all font-mono text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{finalShare.slice(0, 48)}…</p>
                    </div>
                )}

                <GoldButton
                    onClick={submitLastShard}
                    disabled={!chainOk || !sessionId || !finalShare || submittedCount >= threshold}
                >
                    🗝️ 最後の鍵を提出する
                </GoldButton>
            </PhaseCard>

            {/* ════ PHASE 4: UNLOCK ════ */}
            <PhaseCard phase={4} currentPhase={phase} icon={PHASES[4].icon} title={PHASES[4].label} done={phase > 4}>
                <TextSm>4枚のシャードが揃った。Vaultの封印を解錠せよ。</TextSm>
                <GoldDivider />

                {/* Video player for Phase 4 */}
                <div className="relative mb-4 overflow-hidden rounded-xl" style={{ background: "rgba(0,0,0,0.5)", minHeight: 120 }}>
                    <video
                        className="w-full rounded-xl"
                        src="/zanei/movie/05-unlock.mp4"
                        playsInline
                        controls
                        onEnded={() => setMovieEnded4(true)}
                        onError={() => setMovieEnded4(true)}
                        style={{ display: "block" }}
                    />
                    {!movieEnded4 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: "rgba(0,0,0,0.6)" }}>
                            <p className="text-xs" style={{ color: "rgba(201,150,42,0.7)" }}>動画が再生されない場合</p>
                            <button
                                onClick={() => setMovieEnded4(true)}
                                className="text-xs px-4 py-2 rounded-lg"
                                style={{ background: "rgba(201,150,42,0.2)", color: "#c9962a", border: "1px solid rgba(201,150,42,0.4)" }}
                            >
                                スキップして進む
                            </button>
                        </div>
                    )}
                </div>

                {/* All-check badges */}
                <div className="mb-4 flex flex-wrap gap-2">
                    <StatusBadge ok={chainOk} text={selectedNetwork === "minato" ? "Minato" : "Sepolia"} />
                    <StatusBadge ok={ready} text={`鍵 ${submittedCount}/${threshold}`} />
                    <StatusBadge ok={task10Unlockable} text="判定 OK" />
                    <StatusBadge ok={Boolean(contractAddress)} text="Contract" />
                </div>

                {/* Unlock animation area */}
                {unlocked ? (
                    <div
                        className="mb-4 flex flex-col items-center justify-center rounded-2xl py-8"
                        style={{ background: "rgba(40,120,60,0.15)", border: "1px solid rgba(60,180,80,0.3)" }}
                    >
                        <div className="text-5xl mb-3" style={{ animation: "pulse 2s infinite", filter: "drop-shadow(0 0 16px gold)" }}>🏮</div>
                        <p className="text-sm font-semibold" style={{ color: "#60d080" }}>封印が解かれた</p>
                        <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{shortHash(unlockTxHash)}</p>
                        <a href={getExplorerTxUrl(unlockTxHash, chainId)} target="_blank" rel="noreferrer" className="mt-2 text-xs underline" style={{ color: "rgba(201,150,42,0.7)" }}>
                            Etherscanで確認 →
                        </a>
                    </div>
                ) : null}

                <GoldButton
                    onClick={unlock}
                    disabled={!chainOk || !ready || !contractAddress || !task10Unlockable}
                >
                    ⛓️ 封印を解く（Unlock）
                </GoldButton>
            </PhaseCard>

            {/* ════ PHASE 5: PAYOUT ════ */}
            <PhaseCard phase={5} currentPhase={phase} icon={PHASES[5].icon} title={PHASES[5].label} done={paid}>
                <div
                    className="mb-6 rounded-2xl p-6 text-center"
                    style={{ background: "rgba(201,150,42,0.07)", border: "1px solid rgba(201,150,42,0.3)" }}
                >
                    <p className="text-3xl mb-3">🏮</p>
                    <p className="text-sm leading-loose" style={{ color: "rgba(201,150,42,0.9)", fontStyle: "italic" }}>
                        「黄金は朽ちる。誓いは残る。<br />名は消えても、道は継がれる。」
                    </p>
                </div>
                <TextSm>鍵が開き、継承物が解放された。誓紙と継承印をオンチェーンで受け取れ。</TextSm>
                <GoldDivider />

                {/* Video player for Phase 5 */}
                <div className="relative mb-4 overflow-hidden rounded-xl" style={{ background: "rgba(0,0,0,0.5)", minHeight: 120 }}>
                    <video
                        className="w-full rounded-xl"
                        src="/zanei/movie/06-payout.mp4"
                        playsInline
                        controls
                        onEnded={() => setMovieEnded5(true)}
                        onError={() => setMovieEnded5(true)}
                        style={{ display: "block" }}
                    />
                    {!movieEnded5 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: "rgba(0,0,0,0.6)" }}>
                            <p className="text-xs" style={{ color: "rgba(201,150,42,0.7)" }}>動画が再生されない場合</p>
                            <button
                                onClick={() => setMovieEnded5(true)}
                                className="text-xs px-4 py-2 rounded-lg"
                                style={{ background: "rgba(201,150,42,0.2)", color: "#c9962a", border: "1px solid rgba(201,150,42,0.4)" }}
                            >
                                スキップして進む
                            </button>
                        </div>
                    )}
                </div>

                {paid && (
                    <div className="mb-4 rounded-xl p-3" style={{ background: "rgba(40,120,60,0.15)", border: "1px solid rgba(60,180,80,0.3)" }}>
                        <p className="text-sm font-semibold text-center" style={{ color: "#60d080" }}>✓ 継承が完了した</p>
                        <p className="mt-1 text-center text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{shortHash(payoutTxHash)}</p>
                        <div className="mt-2 text-center">
                            <a href={getExplorerTxUrl(payoutTxHash, chainId)} target="_blank" rel="noreferrer" className="text-xs underline" style={{ color: "rgba(201,150,42,0.7)" }}>
                                Etherscanで確認 →
                            </a>
                        </div>
                    </div>
                )}

                <GoldButton
                    onClick={payout}
                    disabled={!chainOk || !unlockTxHash || !contractAddress}
                >
                    🏮 継承物を受け取る（Payout）
                </GoldButton>

                <div className="mt-6">
                    <GoldButton variant="ghost" onClick={refresh}>↻ 状態を更新</GoldButton>
                </div>

                {/* Participants list */}
                {(session?.participants?.length ?? 0) > 0 && (
                    <>
                        <GoldDivider />
                        <p className="mb-2 text-xs" style={{ color: "rgba(201,150,42,0.6)" }}>参加者</p>
                        <ul className="space-y-2">
                            {session!.participants.map((p) => (
                                <li key={p.walletAddress} className="rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                    <p className="font-mono text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>{shortHash(p.walletAddress)}</p>
                                    <p className="text-xs" style={{ color: p.claimedAt ? "#60d080" : "rgba(255,255,255,0.3)" }}>{p.claimedAt ? "✓ claimed" : "pending"}</p>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </PhaseCard>

            {/* ── Bottom note ── */}
            <div className="mt-8 text-center">
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
                    残影 ZANEI
                </p>
            </div>
        </GameShell>
    );
}
