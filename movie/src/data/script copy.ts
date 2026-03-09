// このファイルは直接編集しない
// スクリプトの編集は src/data/scriptLines.ts で行う
// durationInFrames は npm run voices が src/data/durations.json に自動書き込みする

import durationsRaw from "./durations.json";
import { RAW_SCRIPT, type ScriptLine } from "./scriptLines";

const durations = durationsRaw as Record<string, number>;

export type { ScriptLine };

export const SCRIPT = RAW_SCRIPT.map((line) => ({
  ...line,
  durationInFrames: durations[line.id] ?? line.durationInFrames,
}));
