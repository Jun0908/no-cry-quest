import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { addSubmission, getSubmissions } from '../../../lib/shardStore';
import { getSession } from '@/lib/shamirSessionStore';
import { assertNotPaused } from '@/lib/opsGuard';

type Body = {
  sessionId: string;
  questId: string;
  shard: string;
  walletAddress: string;
  signature: string;
  timestamp: number;
};

// POST: submit shard (signed by wallet)
export async function POST(req: Request) {
  try {
    assertNotPaused();
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'service_paused';
    return NextResponse.json({ ok: false, error }, { status: 503 });
  }

  const body: Body = await req.json();
  const { sessionId, questId, shard, walletAddress, signature, timestamp } = body;

  if (!sessionId || !questId || !shard || !walletAddress || !signature || !timestamp) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
  }

  const session = await getSession(sessionId);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'session_not_found' }, { status: 400 });
  }
  if (session.questId !== questId) {
    return NextResponse.json({ ok: false, error: 'quest_mismatch' }, { status: 400 });
  }
  if (session.status !== 'collecting') {
    return NextResponse.json({ ok: false, error: 'session_not_collecting' }, { status: 400 });
  }
  if (Date.now() > session.expiresAt) {
    return NextResponse.json({ ok: false, error: 'session_expired' }, { status: 400 });
  }
  const member = session.participants.find((p) => p.walletAddress.toLowerCase() === walletAddress.toLowerCase());
  if (!member) {
    return NextResponse.json({ ok: false, error: 'wallet_not_in_session' }, { status: 400 });
  }

  // basic timestamp check (allow 5 minutes skew)
  const now = Date.now();
  if (Math.abs(now - timestamp) > 5 * 60 * 1000) {
    return NextResponse.json({ ok: false, error: 'timestamp_skew' }, { status: 400 });
  }

  const message = `${sessionId}:${questId}:${shard}:${timestamp}`;

  try {
    const recovered = ethers.verifyMessage(message, signature);
    if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json({ ok: false, error: 'invalid_signature' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'verify_failed', detail: String(e) }, { status: 400 });
  }

  try {
    const count = await addSubmission(questId, { shard, walletAddress, timestamp });
    return NextResponse.json({ ok: true, submissions: count });
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : 'store_error';
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }
}

// GET: list submissions for a quest (for debugging)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const questId = url.searchParams.get('questId');
  if (!questId) return NextResponse.json({ ok: false, error: 'missing_questId' }, { status: 400 });
  const subs = await getSubmissions(questId);
  return NextResponse.json({ ok: true, submissions: subs });
}
