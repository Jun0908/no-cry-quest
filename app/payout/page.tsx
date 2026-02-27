"use client";

import { useMemo, useState } from "react";
import { ethers } from "ethers";
import { AppShell, Panel, Pill } from "@/app/_components/shell";
import { connectWallet } from "@/app/_components/wallet";
import { readFlowState, writeFlowState } from "@/app/_components/flow-state";

const abi = [
  "function payout(bytes32 questId)",
  "function getRecipients(bytes32 questId) view returns (address[] recipients,uint256[] amounts)",
];

export default function PayoutPage() {
  const flow = useMemo(() => readFlowState(), []);
  const [questId, setQuestId] = useState(flow.questId || "");
  const [vaultAddress, setVaultAddress] = useState(flow.contractAddress || "");
  const [wallet, setWallet] = useState("");
  const [txHash, setTxHash] = useState(flow.lastTxHash || "");
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "failed">("idle");
  const [error, setError] = useState("");
  const [recipients, setRecipients] = useState<{ to: string; amount: string }[]>([]);

  async function connect() {
    try {
      const { address } = await connectWallet();
      setWallet(address);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "wallet_error");
    }
  }

  async function loadRecipients() {
    try {
      const { provider } = await connectWallet();
      const contract = new ethers.Contract(vaultAddress, abi, provider);
      const [to, amounts] = await contract.getRecipients(questId);
      const items = to.map((addr: string, i: number) => ({ to: addr, amount: ethers.formatEther(amounts[i]) }));
      setRecipients(items);
      writeFlowState({ questId, contractAddress: vaultAddress });
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "recipient_load_error");
    }
  }

  async function payout() {
    try {
      setStatus("pending");
      const { signer } = await connectWallet();
      const contract = new ethers.Contract(vaultAddress, abi, signer);
      const tx = await contract.payout(questId);
      setTxHash(tx.hash);
      writeFlowState({ lastTxHash: tx.hash, questId, contractAddress: vaultAddress });
      const rc = await tx.wait();
      setStatus(rc?.status === 1 ? "success" : "failed");
      if (rc?.status !== 1) setError("tx_reverted");
    } catch (e) {
      setStatus("failed");
      setError(e instanceof Error ? e.message : "tx_failed");
    }
  }

  const explorer = txHash ? `https://sepolia.etherscan.io/tx/${txHash}` : "";

  return (
    <AppShell title="Payout">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel title="Tx実行">
          <div className="grid gap-2">
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={questId} onChange={(e) => setQuestId(e.target.value)} placeholder="questId(bytes32)" />
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={vaultAddress} onChange={(e) => setVaultAddress(e.target.value)} placeholder="vault contract address" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="rounded-lg border border-slate-400 px-3 py-2 text-sm" onClick={connect}>
              Wallet接続
            </button>
            <button className="rounded-lg border border-slate-400 px-3 py-2 text-sm" onClick={loadRecipients}>
              受取先を取得
            </button>
            <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white" onClick={payout}>
              payout送信
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <Pill ok={status === "success"} text={`status: ${status}`} />
            <span className="text-xs text-slate-500">wallet: {wallet || "not connected"}</span>
          </div>
          <div className="mt-2 text-xs text-rose-600">{error}</div>
        </Panel>

        <Panel title="分配結果">
          <div className="mb-3 text-sm">Tx hash: {txHash || "none"}</div>
          {explorer ? (
            <a className="mb-3 inline-block text-sm text-blue-700 underline" href={explorer} target="_blank" rel="noreferrer">
              explorerで確認
            </a>
          ) : null}
          <div className="space-y-2 text-sm">
            {recipients.length === 0 ? (
              <div className="text-slate-500">受取先が未取得です。</div>
            ) : (
              recipients.map((r) => (
                <div key={r.to} className="rounded-lg border border-slate-200 p-2">
                  <div className="font-mono text-xs">{r.to}</div>
                  <div>{r.amount} ETH</div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 text-xs text-slate-500">イベント履歴: payout送信後はウォレットとエクスプローラで確認してください。</div>
        </Panel>
      </div>
    </AppShell>
  );
}
