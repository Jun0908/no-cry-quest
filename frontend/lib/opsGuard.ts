export function isEmergencyPaused() {
  return process.env.EMERGENCY_PAUSE === "1";
}

export function assertNotPaused() {
  if (isEmergencyPaused()) {
    throw new Error("service_paused_emergency");
  }
}
