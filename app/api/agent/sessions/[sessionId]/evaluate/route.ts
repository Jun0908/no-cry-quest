import { NextResponse } from "next/server";
import { appendAuditLog } from "@/lib/backendStore";
import { evaluateConversation, type AgentReply } from "@/lib/agentRuntime";
import { getAgentSession } from "@/lib/agentStore";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ sessionId: string }>;
};

type EvaluateBody = {
  response?: AgentReply;
};

export async function POST(req: Request, ctx: Params) {
  const { sessionId } = await ctx.params;
  const session = await getAgentSession(sessionId);
  if (!session) return NextResponse.json({ ok: false, error: "session_not_found" }, { status: 404 });

  let body: EvaluateBody = {};
  try {
    body = (await req.json()) as EvaluateBody;
  } catch {
    // optional body
  }

  const recent = session.memory.messages.slice(-10).map((m) => m.text);
  const latestAgent = [...session.memory.messages].reverse().find((m) => m.role === "agent");
  if (!body.response && !latestAgent) {
    return NextResponse.json({ ok: false, error: "no_agent_response" }, { status: 400 });
  }

  const fallback: AgentReply = {
    reply: latestAgent?.text || "",
    nextAction: "次アクション: 状態を確認し未達条件を埋めてください。",
    missingRequirements: [],
    consensusMessage: "4-of-4での合意形成が必要です。",
    refused: false,
  };
  const target = body.response || fallback;
  const result = evaluateConversation(recent, target);

  await appendAuditLog("verification_succeeded", session.questId, true, {
    kind: "agent_evaluation",
    sessionId,
    score: result.score,
    checks: result.checks,
  });

  return NextResponse.json({
    ok: true,
    sessionId,
    questId: session.questId,
    evaluation: result,
  });
}
