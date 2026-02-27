import { NextResponse } from "next/server";
import { getSession } from "@/lib/shamirSessionStore";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(_req: Request, ctx: Params) {
  const { sessionId } = await ctx.params;
  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ ok: false, error: "session_not_found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    session: {
      ...session,
      participants: session.participants.map((p) => ({
        walletAddress: p.walletAddress,
        claimedAt: p.claimedAt,
      })),
    },
  });
}
