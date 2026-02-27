import { NextResponse } from "next/server";
import { getSecurityAlerts } from "@/lib/securityMonitor";
import { isEmergencyPaused } from "@/lib/opsGuard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number(limitRaw) : 50;
  const alerts = await getSecurityAlerts(Number.isFinite(limit) ? limit : 50);
  return NextResponse.json({
    ok: true,
    paused: isEmergencyPaused(),
    alerts,
  });
}
