import { getTask10Config, type Task10Mode } from "@/lib/task10Config";
import { getTask10QuestState, resolveCurrentLocationAnchor } from "@/lib/task10StateStore";

export type Task10CheckInput = {
  questId: string;
  mode: Task10Mode;
  latitude?: number;
  longitude?: number;
  heading?: number;
  pitch?: number;
  viewScore?: number;
  photoProvided?: boolean;
};

export type Task10CheckResult = {
  unlockable: boolean;
  checks: {
    puzzle: boolean;
    position: boolean;
    heading: boolean;
    pitch: boolean;
    view: boolean;
  };
  detail: Record<string, unknown>;
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = 6371000;
  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const lat1 = toRadians(aLat);
  const lat2 = toRadians(bLat);
  const aa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return r * c;
}

function angularDiff(a: number, b: number) {
  const raw = Math.abs((a % 360) - (b % 360));
  return raw > 180 ? 360 - raw : raw;
}

export async function evaluateTask10Check(input: Task10CheckInput): Promise<Task10CheckResult> {
  const cfg = getTask10Config();
  const state = await getTask10QuestState(input.questId);

  if (state.forcedSuccess) {
    return {
      unlockable: true,
      checks: {
        puzzle: true,
        position: true,
        heading: true,
        pitch: true,
        view: true,
      },
      detail: {
        forcedSuccess: true,
      },
    };
  }

  const puzzle = state.puzzleSolved;
  const detail: Record<string, unknown> = { mode: input.mode };

  let position = false;
  if (input.mode === "current_location") {
    if (typeof input.latitude === "number" && typeof input.longitude === "number") {
      const anchor = await resolveCurrentLocationAnchor(input.questId, input.latitude, input.longitude);
      const distance = haversineMeters(anchor.latitude, anchor.longitude, input.latitude, input.longitude);
      position = distance <= cfg.currentLocationRadiusMeters;
      detail.position = {
        distanceMeters: Number(distance.toFixed(2)),
        radiusMeters: cfg.currentLocationRadiusMeters,
        anchor,
      };
    } else {
      detail.position = { reason: "location_missing" };
    }
  } else {
    position = true;
    detail.position = { reason: "skipped_in_toyokuni_photo_mode" };
  }

  const headingDiff =
    typeof input.heading === "number" ? angularDiff(input.heading, cfg.headingTarget) : Number.POSITIVE_INFINITY;
  const heading = headingDiff <= cfg.headingTolerance;
  detail.heading = {
    value: input.heading,
    target: cfg.headingTarget,
    tolerance: cfg.headingTolerance,
    diff: Number.isFinite(headingDiff) ? Number(headingDiff.toFixed(2)) : null,
  };

  const pitchDiff =
    typeof input.pitch === "number" ? Math.abs(input.pitch - cfg.pitchTarget) : Number.POSITIVE_INFINITY;
  const pitch = pitchDiff <= cfg.pitchTolerance;
  detail.pitch = {
    value: input.pitch,
    target: cfg.pitchTarget,
    tolerance: cfg.pitchTolerance,
    diff: Number.isFinite(pitchDiff) ? Number(pitchDiff.toFixed(2)) : null,
  };

  const viewScore = typeof input.viewScore === "number" ? input.viewScore : 0;
  const view = input.mode === "toyokuni_photo" && input.photoProvided ? true : viewScore >= cfg.viewScoreThreshold;
  detail.view = {
    score: Number(viewScore.toFixed(3)),
    threshold: cfg.viewScoreThreshold,
    photoProvided: Boolean(input.photoProvided),
  };

  const unlockable = puzzle && position && heading && pitch && view;
  return {
    unlockable,
    checks: {
      puzzle,
      position,
      heading,
      pitch,
      view,
    },
    detail,
  };
}
