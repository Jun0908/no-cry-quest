import { ethers } from "ethers";

export const SHIBUYA_CHAIN_ID = 81;
export const SHIBUYA_HEX_CHAIN_ID = "0x51";

export const SHIBUYA_CHAIN_PARAMS = {
  chainId: SHIBUYA_HEX_CHAIN_ID,
  chainName: "Astar Shibuya Testnet",
  nativeCurrency: {
    name: "SBY",
    symbol: "SBY",
    decimals: 18,
  },
  rpcUrls: ["https://rpc.shibuya.astar.network:8545"],
  blockExplorerUrls: ["https://shibuya.subscan.io"],
};

export const DEMO_QUEST_ID = process.env.NEXT_PUBLIC_DEMO_QUEST_ID || "0x0900000000000000000000000000000000000000000000000000000000000009";

export const DEMO_NPC_WALLETS = [
  "0x1000000000000000000000000000000000000001",
  "0x1000000000000000000000000000000000000002",
  "0x1000000000000000000000000000000000000003",
];

export function createDemoProofHash(questId: string) {
  return ethers.keccak256(ethers.toUtf8Bytes(`final-scene:${questId}:verified`));
}

export function getAstarExplorerTxUrl(txHash: string) {
  return `https://shibuya.subscan.io/extrinsic/${txHash}`;
}
