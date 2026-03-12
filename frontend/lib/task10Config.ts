export type Task10Mode = "current_location" | "toyokuni_photo";

export type Task10Config = {
  defaultMode: Task10Mode;
  currentLocationRadiusMeters: number;
  toyokuniLatitude: number;
  toyokuniLongitude: number;
  headingTarget: number;
  headingTolerance: number;
  pitchTarget: number;
  pitchTolerance: number;
  viewScoreThreshold: number;
  enableSimulateSuccess: boolean;
};

function getNumber(key: string, fallback: number) {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getBoolean(key: string, fallback: boolean) {
  const raw = process.env[key];
  if (!raw) return fallback;
  return raw === "1" || raw.toLowerCase() === "true";
}

export function resolveTask10Mode(value?: string): Task10Mode {
  if (value === "toyokuni_photo") return "toyokuni_photo";
  return "current_location";
}

export function getTask10Config(): Task10Config {
  return {
    defaultMode: resolveTask10Mode(process.env.NEXT_PUBLIC_TASK10_MODE || process.env.TASK10_MODE),
    currentLocationRadiusMeters: getNumber("TASK10_RADIUS_METERS", 120),
    toyokuniLatitude: getNumber("TASK10_TOYOKUNI_LAT", 34.9878),
    toyokuniLongitude: getNumber("TASK10_TOYOKUNI_LNG", 135.7725),
    headingTarget: getNumber("TASK10_HEADING_TARGET", 118),
    headingTolerance: getNumber("TASK10_HEADING_TOLERANCE", 20),
    pitchTarget: getNumber("TASK10_PITCH_TARGET", 4),
    pitchTolerance: getNumber("TASK10_PITCH_TOLERANCE", 14),
    viewScoreThreshold: getNumber("TASK10_VIEW_SCORE", 0.72),
    enableSimulateSuccess: getBoolean("TASK10_ENABLE_SIMULATE_SUCCESS", true),
  };
}
