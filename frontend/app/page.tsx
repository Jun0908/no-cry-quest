import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#ede5da_0%,#d8e4f0_50%,#f4f5f6_100%)] px-6 py-16 text-slate-900">
      <main className="mx-auto max-w-5xl">
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-500">MVP Frontend Loop</p>
        <h1 className="mb-8 text-5xl font-semibold tracking-tight">Conversation to Payout</h1>
        <p className="mb-10 max-w-2xl text-slate-600">
          Chatで行動を定め、Questで証跡を管理し、Unlockで4-of-4を成立させ、Payoutで分配を確認します。
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Link className="rounded-2xl border border-slate-200 bg-white/85 p-6 hover:border-slate-400" href="/final">
            <h2 className="text-xl font-semibold">Final Scene Demo</h2>
            <p className="mt-2 text-sm text-slate-600">Shibuya固定で3/4から最後の1鍵だけ操作</p>
          </Link>
          <Link className="rounded-2xl border border-slate-200 bg-white/85 p-6 hover:border-slate-400" href="/chat">
            <h2 className="text-xl font-semibold">1. Chat</h2>
            <p className="mt-2 text-sm text-slate-600">Agentと会話し、次アクションを確定</p>
          </Link>
          <Link className="rounded-2xl border border-slate-200 bg-white/85 p-6 hover:border-slate-400" href="/quest">
            <h2 className="text-xl font-semibold">2. Quest</h2>
            <p className="mt-2 text-sm text-slate-600">証跡提出・検証・不足条件の確認</p>
          </Link>
          <Link className="rounded-2xl border border-slate-200 bg-white/85 p-6 hover:border-slate-400" href="/unlock">
            <h2 className="text-xl font-semibold">3. Unlock</h2>
            <p className="mt-2 text-sm text-slate-600">4人のShard進捗と復元、unlock実行</p>
          </Link>
          <Link className="rounded-2xl border border-slate-200 bg-white/85 p-6 hover:border-slate-400" href="/payout">
            <h2 className="text-xl font-semibold">4. Payout</h2>
            <p className="mt-2 text-sm text-slate-600">Tx実行と受取先・金額・履歴を確認</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
