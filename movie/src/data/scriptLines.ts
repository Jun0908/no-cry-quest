export interface ScriptLine {
  id: string;
  text: string;
  narration: string;
  durationInFrames: number;
  startFrame?: number;
  pauseAfter?: number;
}

export const RAW_SCRIPT: ScriptLine[] = [
  {
    id: "01-intro",
    text: "THE HIDEN GAME\n準備はいいか？",
    narration: "THE HIDEN GAME\n準備はいいか？",
    durationInFrames: 150,
    startFrame: 0,
  },
  {
    id: "02-cipher",
    text: "暗号を解読せよ",
    narration: "暗号を解読せよ",
    durationInFrames: 150,
    startFrame: 240,
  },
  {
    id: "03-location",
    text: "座標特定\n［LOCATION FOUND］",
    narration: "座標特定\n［LOCATION FOUND］",
    durationInFrames: 150,
    startFrame: 480,
  },
  {
    id: "04-key",
    text: "アクセスキー獲得",
    narration: "アクセスキー獲得",
    durationInFrames: 150,
    startFrame: 720,
  },
  {
    id: "05-unlock",
    text: "システム・アンロック",
    narration: "システム・アンロック",
    durationInFrames: 150,
    startFrame: 960,
  },
  {
    id: "06-payout",
    text: "REWARD CLAIMED",
    narration: "REWARD CLAIMED",
    durationInFrames: 150,
    startFrame: 1200,
  },
];
