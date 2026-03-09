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
    id: "scene1",
    text: "朝、猫は窓辺で日の光を浴びる。",
    narration: "猫は朝日を浴びています。",
    durationInFrames: 150,
    startFrame: 0,
  },
  {
    id: "scene2",
    text: "昼、猫はお気に入りのソファで居眠り。",
    narration: "猫はソファで眠っています。",
    durationInFrames: 150,
    startFrame: 240,
  },
  {
    id: "scene3",
    text: "夕方、猫は庭で遊ぶ。",
    narration: "猫は庭で遊んでいます。",
    durationInFrames: 150,
    startFrame: 480,
  },
  {
    id: "scene4",
    text: "夜、猫は窓辺から星を眺める。",
    narration: "猫は星を見ています。",
    durationInFrames: 150,
    startFrame: 720,
  },
];
