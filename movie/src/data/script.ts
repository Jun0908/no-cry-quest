import durationsRaw from './durations.json';
import { RAW_SCRIPT, type ScriptLine } from './scriptLines';

const durations = durationsRaw as Record<string, number>;

export type { ScriptLine };
export const SCRIPT = RAW_SCRIPT.map(line => ({
  ...line,
  durationInFrames: durations[line.id] ?? line.durationInFrames,
}));
