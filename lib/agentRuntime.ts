import type { AgentSession, LongTermMemory } from "@/lib/agentStore";
import type { QuestState } from "@/lib/backendStore";

type PlannerContext = {
  questState: QuestState | null;
  proofCount: number;
  shardCount: number;
  threshold: number;
  submittedWallets: string[];
};

export type AgentReply = {
  reply: string;
  nextAction: string;
  missingRequirements: string[];
  consensusMessage: string;
  reinviteMessage?: string;
  refused: boolean;
};

const unsafePatterns = [
  /hack|exploit|bypass|steal|phishing|malware/i,
  /違法|不正|詐欺|ハッキング|鍵を盗|署名を偽造|脅迫/,
  /爆弾|武器|殺害|自殺/,
];

function includesUnsafeIntent(text: string) {
  return unsafePatterns.some((re) => re.test(text));
}

function missingByState(ctx: PlannerContext): string[] {
  const missing: string[] = [];
  const status = ctx.questState?.status;

  if (!status) {
    missing.push("Quest状態が未登録。まず証跡を1件以上提出してください。");
    return missing;
  }

  if (status === "proof_received" && ctx.proofCount < 1) {
    missing.push("証跡が不足しています。最低1件の証跡アップロードが必要です。");
  }
  if (status === "proof_received") {
    missing.push("Oracle検証が未実行です。`POST /api/quests/:id/verify` を実行してください。");
  }
  if (status === "verified" && ctx.shardCount < ctx.threshold) {
    missing.push(`Shard提出が不足しています。現在 ${ctx.shardCount}/${ctx.threshold} です。`);
  }
  if (status === "signing_failed") {
    missing.push("署名発行が失敗しています。入力値（nonce/contractAddress/chainId）を再確認してください。");
  }
  return missing;
}

function nextActionByState(ctx: PlannerContext): string {
  const status = ctx.questState?.status;
  if (!status) return "次アクション: 証跡を収集して `POST /api/proofs` で提出してください。";
  if (status === "proof_received") return "次アクション: Oracle検証を実行し、検証成功後に署名発行へ進んでください。";
  if (status === "verified" && ctx.shardCount < ctx.threshold) {
    return `次アクション: 未提出者を再招集してShard提出を ${ctx.threshold} 件揃えてください。`;
  }
  if (status === "verified" && ctx.shardCount >= ctx.threshold) {
    return "次アクション: 復元・unlockトランザクションを生成し、オンチェーンで unlockQuest を実行してください。";
  }
  if (status === "signed") return "次アクション: 署名済みpayloadを使ってコントラクト実行（verify/unlock）を完了してください。";
  if (status === "signing_failed") return "次アクション: 署名発行APIを再実行し、エラー理由を監査ログで確認してください。";
  return "次アクション: 現在状態を確認し、未完了ステップを順番に実行してください。";
}

function buildReinviteMessage(session: AgentSession, submittedWallets: string[]) {
  const pending = session.participants.filter((w) => !submittedWallets.includes(w.toLowerCase()));
  if (pending.length === 0) return undefined;
  return `再招集: unlockには4人全員の協力が必要です。未提出者(${pending.join(", ")})はShard提出をお願いします。`;
}

function buildConsensusMessage() {
  return "4-of-4設計のため、1人でも欠けると復元できません。全員提出でのみunlock可能です。";
}

function formatReply(params: {
  longTermMemory: LongTermMemory;
  nextAction: string;
  missingRequirements: string[];
  reinviteMessage?: string;
}) {
  const missing = params.missingRequirements.length
    ? `不足条件:\n- ${params.missingRequirements.join("\n- ")}`
    : "不足条件: 主要条件は満たされています。";
  return [
    `目的: ${params.longTermMemory.objective}`,
    `意図: ${params.longTermMemory.deceasedIntent}`,
    params.nextAction,
    missing,
    params.reinviteMessage || "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildAgentReply(params: {
  inputText: string;
  session: AgentSession;
  longTermMemory: LongTermMemory;
  context: PlannerContext;
}): AgentReply {
  if (includesUnsafeIntent(params.inputText)) {
    return {
      refused: true,
      reply:
        "その依頼には対応できません。安全と法令順守を優先します。Quest達成の正規手順（証跡提出・検証・4人協力unlock）で進めましょう。",
      nextAction: "次アクション: 安全な手順で必要証跡を準備し、正規APIを利用してください。",
      missingRequirements: [],
      consensusMessage: buildConsensusMessage(),
    };
  }

  const missingRequirements = missingByState(params.context);
  const nextAction = nextActionByState(params.context);
  const reinviteMessage = buildReinviteMessage(params.session, params.context.submittedWallets);
  const reply = formatReply({
    longTermMemory: params.longTermMemory,
    nextAction,
    missingRequirements,
    reinviteMessage,
  });

  return {
    refused: false,
    reply,
    nextAction,
    missingRequirements,
    consensusMessage: buildConsensusMessage(),
    reinviteMessage,
  };
}

export function evaluateConversation(messages: string[], reply: AgentReply) {
  const hasNextAction = /次アクション/.test(reply.nextAction) || /次アクション/.test(reply.reply);
  const hasMissingExplanation = reply.missingRequirements.length === 0 || /不足条件/.test(reply.reply);
  const safetyOk = !includesUnsafeIntent(reply.reply);
  const consistencyOk = messages.length === 0 || reply.reply.length > 20;

  const checks = {
    objective_alignment: hasNextAction,
    missing_requirement_explanation: hasMissingExplanation,
    consistency: consistencyOk,
    safety: safetyOk,
  };
  const passed = Object.values(checks).filter(Boolean).length;
  const score = Math.round((passed / Object.values(checks).length) * 100);

  return {
    score,
    checks,
    passed,
    total: Object.values(checks).length,
  };
}
