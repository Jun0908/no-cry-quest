import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { appendAuditLog, getQuestState, reserveNonce } from "@/lib/backendStore";
import { signUnlockQuest } from "@/lib/oracleSigner";
import { combineShares } from "@/lib/shamir";
import { getSubmissions } from "@/lib/shardStore";
import { getSession, markSessionCompleted } from "@/lib/shamirSessionStore";
import { assertNotPaused } from "@/lib/opsGuard";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ sessionId: string }>;
};

type ReconstructBody = {
  chainId: number;
  contractAddress: string;
  nonce: number;
};

const vaultInterface = new ethers.Interface([
  "function unlockQuest(bytes32 questId, bytes32 unlockProofHash, uint256 nonce, bytes signature)",
]);
const questExistsInterface = new ethers.Interface(["function questExists(bytes32 questId) view returns (bool)"]);
const questStateInterface = new ethers.Interface([
  "function quests(bytes32 questId) view returns (address creator,uint256 deposit,address winner,uint256 deadline,bool verified,bool unlocked,bool paid,bytes32 proofHash,bytes32 unlockProofHash,uint8 shardCount)",
]);
const REQUIRED_SHARDS_ONCHAIN = 4;
const RPC_TIMEOUT_MS = Number(process.env.SEPOLIA_RPC_TIMEOUT_MS || 5000);

const CHAIN_RPC_URLS: Record<number, string[]> = {
  11155111: [
    process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
    "https://ethereum-sepolia-rpc.publicnode.com",
    "https://1rpc.io/sepolia",
  ],
  1946: [
    process.env.MINATO_RPC_URL || "https://rpc.minato.soneium.org",
  ],
};

function createProvider(url: string, chainId: number) {
  const request = new ethers.FetchRequest(url);
  request.timeout = RPC_TIMEOUT_MS;
  return new ethers.JsonRpcProvider(request, chainId, { staticNetwork: true });
}

async function resolveOnChainQuestPreflight(chainId: number, contractAddress: string, questId: string) {
  const urls = CHAIN_RPC_URLS[chainId] || [];
  if (urls.length === 0) return { checked: false as const };

  for (const url of urls) {
    try {
      const provider = createProvider(url, chainId);

      const existsResult = await provider.call({
        to: contractAddress,
        data: questExistsInterface.encodeFunctionData("questExists", [questId]),
      });
      const existsDecoded = questExistsInterface.decodeFunctionResult("questExists", existsResult);
      const exists = Boolean(existsDecoded[0]);
      if (!exists) return { checked: true as const, exists: false as const };

      const stateResult = await provider.call({
        to: contractAddress,
        data: questStateInterface.encodeFunctionData("quests", [questId]),
      });
      const decoded = questStateInterface.decodeFunctionResult("quests", stateResult);
      return {
        checked: true as const,
        exists: true as const,
        state: {
          deadline: BigInt(decoded[3].toString()),
          verified: Boolean(decoded[4]),
          unlocked: Boolean(decoded[5]),
          paid: Boolean(decoded[6]),
          shardCount: Number(decoded[9]),
        },
      };
    } catch {
      // try next RPC endpoint
    }
  }

  return { checked: false as const };
}

export async function POST(req: Request, ctx: Params) {
  try {
    assertNotPaused();
  } catch (error) {
    const reason = error instanceof Error ? error.message : "service_paused";
    return NextResponse.json({ ok: false, error: reason }, { status: 503 });
  }

  const { sessionId } = await ctx.params;
  let body: ReconstructBody;
  try {
    body = (await req.json()) as ReconstructBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { chainId, contractAddress, nonce } = body;
  if (!chainId || !contractAddress || nonce === undefined) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const session = await getSession(sessionId);
  if (!session) return NextResponse.json({ ok: false, error: "session_not_found" }, { status: 404 });
  if (session.status === "cancelled" || session.status === "timed_out") {
    return NextResponse.json({ ok: false, error: "session_not_active" }, { status: 400 });
  }

  const quest = await getQuestState(session.questId);
  if (!quest || !quest.verifiedProofHash) {
    return NextResponse.json({ ok: false, error: "quest_not_verified" }, { status: 400 });
  }

  const submissions = await getSubmissions(session.questId);
  const submittedShares = submissions.map((s) => s.shard);
  if (submittedShares.length < session.threshold) {
    await appendAuditLog("verification_failed", session.questId, false, {
      kind: "reconstruct_failed",
      reason: "insufficient_shares",
      submitted: submittedShares.length,
      required: session.threshold,
      sessionId,
    });
    return NextResponse.json(
      {
        ok: false,
        error: "insufficient_shares",
        submitted: submittedShares.length,
        required: session.threshold,
      },
      { status: 400 }
    );
  }

  const preflight = await resolveOnChainQuestPreflight(chainId, contractAddress, session.questId);
  if (preflight.checked && !preflight.exists) {
    return NextResponse.json(
      {
        ok: false,
        error: "onchain_no_quest",
        hint: "Quest ID is missing on-chain for this contract. Run createQuest first.",
        questId: session.questId,
        contractAddress,
      },
      { status: 400 }
    );
  }

  if (!preflight.checked) {
    return NextResponse.json(
      {
        ok: false,
        error: "onchain_rpc_unreachable",
        hint: "Sepolia RPC is unreachable from server. Set SEPOLIA_RPC_URL in .env.local.",
      },
      { status: 503 }
    );
  }

  if (preflight.checked && preflight.exists) {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const s = preflight.state;
    if (s.unlocked) {
      return NextResponse.json(
        { ok: false, error: "onchain_already_unlocked", hint: "Quest is already unlocked on-chain." },
        { status: 400 }
      );
    }
    if (s.paid) {
      return NextResponse.json(
        { ok: false, error: "onchain_already_paid", hint: "Quest has already been paid on-chain." },
        { status: 400 }
      );
    }
    if (s.deadline > BigInt(0) && s.deadline < now) {
      return NextResponse.json(
        { ok: false, error: "onchain_expired", hint: "Quest deadline has passed on-chain." },
        { status: 400 }
      );
    }
    // verified and shardCount are tracked off-chain; oracle signature provides security
  }

  try {
    // Secret is only held in memory and never persisted to disk.
    const secret = combineShares(submittedShares.slice(0, session.threshold));
    const unlockProofHash = ethers.keccak256(
      ethers.solidityPacked(["bytes32", "string"], [quest.verifiedProofHash, secret])
    );
    const signed = await signUnlockQuest({
      chainId,
      contractAddress,
      nonce,
      questId: session.questId,
      unlockProofHash,
    });
    await reserveNonce(session.questId, nonce);
    await markSessionCompleted(sessionId);
    await appendAuditLog("verification_succeeded", session.questId, true, {
      kind: "reconstruct_succeeded",
      sessionId,
      submitted: submittedShares.length,
      threshold: session.threshold,
      nonce,
    });

    const calldata = vaultInterface.encodeFunctionData("unlockQuest", [
      session.questId,
      unlockProofHash,
      nonce,
      signed.signature,
    ]);

    return NextResponse.json({
      ok: true,
      questId: session.questId,
      unlockProofHash,
      oracleAddress: signed.oracleAddress,
      tx: {
        to: contractAddress,
        data: calldata,
      },
      warning: signed.isDevKey ? "using_dev_oracle_key_set_ORACLE_PRIVATE_KEY" : undefined,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "reconstruct_failed";
    await appendAuditLog("verification_failed", session.questId, false, {
      kind: "reconstruct_failed",
      sessionId,
      reason,
    });
    return NextResponse.json({ ok: false, error: reason }, { status: 400 });
  }
}
