"use client";

export type FlowState = {
  questId: string;
  agentSessionId: string;
  shamirSessionId: string;
  contractAddress: string;
  chainId: number;
  lastTxHash: string;
  task10Mode: "current_location" | "toyokuni_photo";
};

const KEY = "no-cry-flow-state";

const initialState: FlowState = {
  questId: "",
  agentSessionId: "",
  shamirSessionId: "",
  contractAddress: "",
  chainId: 31337,
  lastTxHash: "",
  task10Mode: "current_location",
};

export function readFlowState(): FlowState {
  if (typeof window === "undefined") return initialState;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return initialState;
  try {
    return { ...initialState, ...(JSON.parse(raw) as Partial<FlowState>) };
  } catch {
    return initialState;
  }
}

export function writeFlowState(patch: Partial<FlowState>): FlowState {
  const next = { ...readFlowState(), ...patch };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  }
  return next;
}
