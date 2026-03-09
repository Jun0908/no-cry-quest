import { NextResponse } from "next/server";
import { getAgentSession, getLongTermMemory } from "@/lib/agentStore";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(_req: Request, ctx: Params) {
  const { sessionId } = await ctx.params;
  const session = await getAgentSession(sessionId);
  if (!session) return NextResponse.json({ ok: false, error: "session_not_found" }, { status: 404 });

  const longTermMemory = await getLongTermMemory();
  return NextResponse.json({
    ok: true,
    session,
    longTermMemory,
  });
}
