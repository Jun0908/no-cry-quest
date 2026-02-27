import { NextResponse } from "next/server";
import { appendAuditLog, getProofs, getQuestState } from "@/lib/backendStore";
import { buildAgentReply } from "@/lib/agentRuntime";
import {
  appendPlannerNote,
  appendSessionMessage,
  getAgentSession,
  getLongTermMemory,
  setSessionShardSnapshot,
  updateAgentSession,
  type AgentRole,
} from "@/lib/agentStore";
import { getSubmissions } from "@/lib/shardStore";
import { assertNotPaused } from "@/lib/opsGuard";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ sessionId: string }>;
};

type MessageBody = {
  role: AgentRole;
  speaker: string;
  text: string;
};

export async function POST(req: Request, ctx: Params) {
  try {
    assertNotPaused();
  } catch (error) {
    const reason = error instanceof Error ? error.message : "service_paused";
    return NextResponse.json({ ok: false, error: reason }, { status: 503 });
  }

  const { sessionId } = await ctx.params;
  let body: MessageBody;
  try {
    body = (await req.json()) as MessageBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.role || !body.speaker || !body.text) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const session = await getAgentSession(sessionId);
  if (!session) return NextResponse.json({ ok: false, error: "session_not_found" }, { status: 404 });

  await appendSessionMessage(sessionId, {
    role: body.role,
    speaker: body.speaker,
    text: body.text,
  });

  const [longTermMemory, questState, proofs, submissions] = await Promise.all([
    getLongTermMemory(),
    getQuestState(session.questId),
    getProofs(session.questId),
    getSubmissions(session.questId),
  ]);

  const submittedWallets = submissions.map((s) => s.walletAddress.toLowerCase());
  await setSessionShardSnapshot(sessionId, submittedWallets);

  const agent = buildAgentReply({
    inputText: body.text,
    session,
    longTermMemory,
    context: {
      questState,
      proofCount: proofs.length,
      shardCount: submissions.length,
      threshold: 4,
      submittedWallets,
    },
  });

  await appendSessionMessage(sessionId, {
    role: "agent",
    speaker: "deceased-agent",
    text: agent.reply,
  });
  await appendPlannerNote(sessionId, `${new Date().toISOString()} ${agent.nextAction}`);

  const refreshed = await getAgentSession(sessionId);
  if (refreshed) {
    await updateAgentSession(refreshed);
  }

  await appendAuditLog("proof_received", session.questId, true, {
    kind: "agent_replied",
    sessionId,
    refused: agent.refused,
    nextAction: agent.nextAction,
  });

  return NextResponse.json({
    ok: true,
    questId: session.questId,
    response: agent,
  });
}
