"use client";

import { ethers } from "ethers";
import { SHIBUYA_CHAIN_PARAMS, SHIBUYA_HEX_CHAIN_ID } from "@/lib/finalSceneDemo";

type EthereumWindow = Window & {
  ethereum?: ethers.Eip1193Provider;
};

function getEthereumProvider() {
  const w = window as EthereumWindow;
  if (!w.ethereum) throw new Error("wallet_not_found");
  return w.ethereum;
}

export async function connectWallet() {
  const provider = new ethers.BrowserProvider(getEthereumProvider());
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();
  return { provider, signer, address, chainId: Number(network.chainId) };
}

export async function switchToShibuya() {
  const ethereum = getEthereumProvider();
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SHIBUYA_HEX_CHAIN_ID }],
    });
  } catch (error) {
    const code = (error as { code?: number })?.code;
    if (code !== 4902) throw error;
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [SHIBUYA_CHAIN_PARAMS],
    });
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SHIBUYA_HEX_CHAIN_ID }],
    });
  }
}
