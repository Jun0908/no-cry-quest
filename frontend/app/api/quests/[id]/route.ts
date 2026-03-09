import { NextResponse } from "next/server";
import { getProofs, getQuestState } from "@/lib/backendStore";
import { getSubmissions } from "@/lib/shardStore";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, ctx: Params) {
  const { id: questId } = await ctx.params;
  if (!questId) {
    return NextResponse.json({ ok: false, error: "missing_quest_id" }, { status: 400 });
  }

  const [quest, proofs, submissions] = await Promise.all([
    getQuestState(questId),
    getProofs(questId),
    getSubmissions(questId),
  ]);

  return NextResponse.json({
    ok: true,
    questId,
    quest,
    proofs,
    submissions,
    progress: {
      proofCount: proofs.length,
      shardCount: submissions.length,
      verified: Boolean(quest?.verifiedProofHash),
      signed: quest?.status === "signed",
    },
  });
}
