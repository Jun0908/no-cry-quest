import { SCRIPT } from "../data/script";

export const FPS = 30;

/** index番目の行が開始するフレーム（startFrame指定があればそれを優先） */
export const getLineStartFrame = (index: number): number => {
  const line = SCRIPT[index];
  if (line.startFrame !== undefined) return line.startFrame;
  return SCRIPT.slice(0, index).reduce(
    (sum, l) => sum + l.durationInFrames + (l.pauseAfter ?? 0),
    0
  );
};

/** スクリプト全体の合計フレーム数 */
export const getTotalDuration = (): number =>
  SCRIPT.reduce((max, line, index) => {
    const start = getLineStartFrame(index);
    const end = start + line.durationInFrames + (line.pauseAfter ?? 0);
    return Math.max(max, end);
  }, 0);
