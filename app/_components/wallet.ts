"use client";

import { ethers } from "ethers";

type EthereumWindow = Window & {
  ethereum?: ethers.Eip1193Provider;
};

export async function connectWallet() {
  const w = window as EthereumWindow;
  if (!w.ethereum) throw new Error("wallet_not_found");
  const provider = new ethers.BrowserProvider(w.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const network = await provider.getNetwork();
  return { provider, signer, address, chainId: Number(network.chainId) };
}
