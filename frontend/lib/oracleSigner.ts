import { Wallet } from "ethers";

const DEV_PRIVATE_KEY = "0x59c6995e998f97a5a0044966f0945384a5f7f68f2fcf1f7f7f2f4f0a9e4f6f0b";

export type SignRequestBase = {
  chainId: number;
  contractAddress: string;
  nonce: number;
  questId: string;
};

function getOracleWallet() {
  const pk = process.env.ORACLE_PRIVATE_KEY || DEV_PRIVATE_KEY;
  const isDevKey = !process.env.ORACLE_PRIVATE_KEY;
  if (process.env.NODE_ENV === "production" && isDevKey) {
    throw new Error("oracle_key_policy_violation_missing_ORACLE_PRIVATE_KEY");
  }
  return {
    wallet: new Wallet(pk),
    isDevKey,
  };
}

function getDomain(chainId: number, contractAddress: string) {
  return {
    name: "NoCryVault",
    version: "1",
    chainId,
    verifyingContract: contractAddress,
  };
}

export async function signVerifyQuest(input: SignRequestBase & { proofHash: string }) {
  const { wallet, isDevKey } = getOracleWallet();
  const domain = getDomain(input.chainId, input.contractAddress);
  const types = {
    VerifyQuest: [
      { name: "questId", type: "bytes32" },
      { name: "proofHash", type: "bytes32" },
      { name: "nonce", type: "uint256" },
    ],
  };
  const value = {
    questId: input.questId,
    proofHash: input.proofHash,
    nonce: input.nonce,
  };
  const signature = await wallet.signTypedData(domain, types, value);
  return { signature, oracleAddress: wallet.address, isDevKey };
}

export async function signUnlockQuest(input: SignRequestBase & { unlockProofHash: string }) {
  const { wallet, isDevKey } = getOracleWallet();
  const domain = getDomain(input.chainId, input.contractAddress);
  const types = {
    UnlockQuest: [
      { name: "questId", type: "bytes32" },
      { name: "unlockProofHash", type: "bytes32" },
      { name: "nonce", type: "uint256" },
    ],
  };
  const value = {
    questId: input.questId,
    unlockProofHash: input.unlockProofHash,
    nonce: input.nonce,
  };
  const signature = await wallet.signTypedData(domain, types, value);
  return { signature, oracleAddress: wallet.address, isDevKey };
}
