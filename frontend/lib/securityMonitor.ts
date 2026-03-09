import { promises as fs } from "fs";
import path from "path";

const ALERTS_PATH = path.resolve(process.cwd(), "data", "security-alerts.jsonl");
const WINDOW_MS = 10 * 60 * 1000;

type AuditLike = {
  seq: number;
  at: string;
  event: string;
  questId: string;
  success: boolean;
  detail: Record<string, unknown>;
};

type AlertLevel = "info" | "warn" | "critical";

type SecurityAlert = {
  at: string;
  level: AlertLevel;
  type: string;
  questId: string;
  message: string;
  sourceSeq: number;
  detail: Record<string, unknown>;
};

const recent: AuditLike[] = [];

function inWindow(now: number, records: AuditLike[]) {
  return records.filter((r) => now - new Date(r.at).getTime() <= WINDOW_MS);
}

async function appendAlert(alert: SecurityAlert) {
  await fs.mkdir(path.dirname(ALERTS_PATH), { recursive: true });
  await fs.appendFile(ALERTS_PATH, `${JSON.stringify(alert)}\n`, "utf8");
}

function shouldFlagDevKey(rec: AuditLike) {
  return rec.event === "signature_issued" && typeof rec.detail.warning === "string";
}

function shouldFlagRepeatedFailures(now: number, questId: string) {
  const scoped = inWindow(now, recent).filter(
    (r) => r.questId === questId && (r.event === "signature_failed" || r.event === "verification_failed")
  );
  return scoped.length >= 3 ? scoped.length : 0;
}

export async function recordSecuritySignal(rec: AuditLike) {
  const now = Date.now();
  recent.push(rec);
  const keep = inWindow(now, recent);
  recent.length = 0;
  recent.push(...keep);

  if (shouldFlagDevKey(rec)) {
    await appendAlert({
      at: new Date().toISOString(),
      level: "critical",
      type: "DEV_KEY_IN_USE",
      questId: rec.questId,
      message: "署名処理で開発鍵が使われています。直ちにORACLE_PRIVATE_KEYを本番鍵へ切替してください。",
      sourceSeq: rec.seq,
      detail: rec.detail,
    });
  }

  const failCount = shouldFlagRepeatedFailures(now, rec.questId);
  if (failCount > 0) {
    await appendAlert({
      at: new Date().toISOString(),
      level: "warn",
      type: "REPEATED_FAILURES",
      questId: rec.questId,
      message: `同一Questで失敗イベントが短時間に${failCount}件発生しました。`,
      sourceSeq: rec.seq,
      detail: { count: failCount },
    });
  }

  if (!rec.success && rec.event === "signature_failed") {
    await appendAlert({
      at: new Date().toISOString(),
      level: "warn",
      type: "SIGNATURE_FAILURE",
      questId: rec.questId,
      message: "署名発行が失敗しました。入力値と鍵状態を確認してください。",
      sourceSeq: rec.seq,
      detail: rec.detail,
    });
  }
}

export async function getSecurityAlerts(limit = 100): Promise<SecurityAlert[]> {
  try {
    const raw = await fs.readFile(ALERTS_PATH, "utf8");
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return lines
      .slice(-limit)
      .map((l) => JSON.parse(l) as SecurityAlert)
      .reverse();
  } catch {
    return [];
  }
}
