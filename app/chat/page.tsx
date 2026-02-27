"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell, Panel } from "@/app/_components/shell";
import { readFlowState, writeFlowState } from "@/app/_components/flow-state";

type AgentMessage = {
  role: "player" | "agent";
  speaker: string;
  text: string;
};

export default function ChatPage() {
  const flow = useMemo(() => readFlowState(), []);
  const [questId, setQuestId] = useState(flow.questId || "0xquest-demo");
  const [participants, setParticipants] = useState("0x1111,0x2222,0x3333,0x4444");
  const [agentSessionId, setAgentSessionId] = useState(flow.agentSessionId);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [nextAction, setNextAction] = useState("次アクション: Agentセッションを開始してください。");
  const [hint, setHint] = useState("ヒント: Quest IDを固定して4画面を往復してください。");
  const [status, setStatus] = useState("");

  async function createSession() {
    setStatus("creating_session");
    const wallets = participants.split(",").map((s) => s.trim()).filter(Boolean);
    const res = await fetch("/api/agent/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questId, participants: wallets }),
    });
    const j = await res.json();
    if (!j.ok) {
      setStatus(`error:${j.error}`);
      return;
    }
    setAgentSessionId(j.sessionId);
    writeFlowState({ questId, agentSessionId: j.sessionId });
    setStatus(`session_ready:${j.sessionId}`);
  }

  async function send() {
    if (!agentSessionId || !input.trim()) return;
    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "player", speaker: "you", text }]);

    const res = await fetch(`/api/agent/sessions/${agentSessionId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "player", speaker: "you", text }),
    });
    const j = await res.json();
    if (!j.ok) {
      setStatus(`error:${j.error}`);
      return;
    }

    setMessages((prev) => [...prev, { role: "agent", speaker: "deceased-agent", text: j.response.reply }]);
    setNextAction(j.response.nextAction);
    setHint(j.response.consensusMessage);
    setStatus(j.response.refused ? "refused" : "ok");
  }

  return (
    <AppShell title="Chat">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Conversation">
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={questId} onChange={(e) => setQuestId(e.target.value)} placeholder="Quest ID" />
            <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white" onClick={createSession}>
              Agentセッション作成
            </button>
          </div>
          <textarea
            className="mb-3 min-h-[70px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={participants}
            onChange={(e) => setParticipants(e.target.value)}
            placeholder="participants wallet addresses"
          />
          <div className="mb-3 h-[260px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
            {messages.length === 0 ? (
              <div className="text-sm text-slate-500">メッセージを送ると履歴が表示されます。</div>
            ) : (
              messages.map((m, i) => (
                <div key={`${m.role}-${i}`} className={`mb-2 rounded-lg px-3 py-2 text-sm ${m.role === "agent" ? "bg-white" : "bg-slate-900 text-white"}`}>
                  <div className="mb-1 text-xs opacity-70">{m.speaker}</div>
                  <div className="whitespace-pre-wrap">{m.text}</div>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Agentへメッセージ"
            />
            <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm text-white" onClick={send}>
              送信
            </button>
          </div>
          <div className="mt-2 text-xs text-slate-500">status: {status}</div>
        </Panel>
        <div className="grid gap-4">
          <Panel title="次アクション">
            <p className="text-sm whitespace-pre-wrap">{nextAction}</p>
          </Panel>
          <Panel title="ヒントカード">
            <p className="text-sm">{hint}</p>
            <ul className="mt-3 list-disc pl-5 text-sm text-slate-600">
              <li>期限・不足条件を確認</li>
              <li>4-of-4の合意が必要</li>
              <li>危険/違法な提案は拒否される</li>
            </ul>
          </Panel>
          <Link className="rounded-xl border border-slate-300 bg-white p-3 text-center text-sm hover:border-slate-600" href={`/quest?questId=${encodeURIComponent(questId)}`}>
            証跡を提出する
          </Link>
          <div className="text-xs text-slate-500">agentSessionId: {agentSessionId || "not set"}</div>
        </div>
      </div>
    </AppShell>
  );
}
