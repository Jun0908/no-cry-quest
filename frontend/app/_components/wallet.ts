"use client";

import { ethers } from "ethers";
import { SEPOLIA_CHAIN_PARAMS, SEPOLIA_HEX_CHAIN_ID, MINATO_CHAIN_PARAMS, MINATO_HEX_CHAIN_ID } from "@/lib/finalSceneDemo";

type EthereumWindow = Window & {
  ethereum?: ethers.Eip1193Provider;
};

function isMobileBrowser() {
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    navigator.userAgent.toLowerCase()
  );
}

export function isMobileWithoutWallet() {
  const w = window as EthereumWindow;
  return isMobileBrowser() && !w.ethereum;
}

export function openInMetaMask() {
  const url = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
  window.location.href = url;
}

function getEthereumProvider() {
  const w = window as EthereumWindow;
  if (!w.ethereum) {
    if (isMobileBrowser()) {
      openInMetaMask();
      throw new Error("redirecting_to_metamask");
    }
    throw new Error("wallet_not_found");
  }
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

export async function switchToSepolia() {
  const ethereum = getEthereumProvider();
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_HEX_CHAIN_ID }],
    });
  } catch (error) {
    const code = (error as { code?: number })?.code;
    if (code !== 4902) throw error;
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [SEPOLIA_CHAIN_PARAMS],
    });
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_HEX_CHAIN_ID }],
    });
  }
}

export async function switchToMinato() {
  const ethereum = getEthereumProvider();
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: MINATO_HEX_CHAIN_ID }],
    });
  } catch (error) {
    const code = (error as { code?: number })?.code;
    if (code !== 4902) throw error;
    await ethereum.request({
      method: "wallet_addEthereumChain",
      params: [MINATO_CHAIN_PARAMS],
    });
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: MINATO_HEX_CHAIN_ID }],
    });
  }
}
