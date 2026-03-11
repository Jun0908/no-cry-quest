import { ethers } from "ethers";

export const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_HEX_CHAIN_ID = "0xaa36a7";

export const SEPOLIA_CHAIN_PARAMS = {
  chainId: SEPOLIA_HEX_CHAIN_ID,
  chainName: "Sepolia test network",
  nativeCurrency: {
    name: "SepoliaETH",
    symbol: "SEP",
    decimals: 18,
  },
  rpcUrls: ["https://rpc.sepolia.org"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

export const MINATO_CHAIN_ID = 1946;
export const MINATO_HEX_CHAIN_ID = "0x79a";

export const MINATO_CHAIN_PARAMS = {
  chainId: MINATO_HEX_CHAIN_ID,
  chainName: "Soneium Minato Testnet",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["https://rpc.minato.soneium.org"],
  blockExplorerUrls: ["https://explorer-testnet.soneium.org"],
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

export function getExplorerTxUrl(txHash: string, chainId?: number) {
  if (chainId === MINATO_CHAIN_ID) {
    return `https://explorer-testnet.soneium.org/tx/${txHash}`;
  }
  return `https://sepolia.etherscan.io/tx/${txHash}`;
}
