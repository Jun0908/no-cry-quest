import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  interpolate,
  Img,
} from "remotion";
import { SCRIPT } from "../data/script";
import { getLineStartFrame } from "../utils/getDuration";
import { SubtitleOverlay } from "../components/SubtitleOverlay";
import { BGMLayer } from "../components/BGMLayer";

export const MainVideo: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* 背景アセットの配置 */}
      {SCRIPT.map((line, index) => {
        const from = getLineStartFrame(index);
        const totalLineDuration =
          line.durationInFrames + (line.pauseAfter ?? 0) + 30; // 余裕を持たせる

        return (
          <Sequence
            key={`bg-${line.id}`}
            from={from}
            durationInFrames={totalLineDuration}
          >
            <Img
              src={staticFile(`${line.id}.png`)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${interpolate(
                  frame - from,
                  [0, totalLineDuration],
                  [1, 1.1],
                  {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  }
                )})`,
              }}
            />
          </Sequence>
        );
      })}

      {/* BGM: public/bgm.mp3 を配置すると有効になります */}
      <BGMLayer />

      {/* 各行のナレーション音声 + 字幕 */}
      {SCRIPT.map((line, index) => {
        const from = getLineStartFrame(index);
        const totalLineDuration = line.durationInFrames + (line.pauseAfter ?? 0);

        return (
          <Sequence
            key={line.id}
            from={from}
            durationInFrames={totalLineDuration}
          >
            {/* 音声は durationInFrames のみ（pauseAfter 中は無音）*/}
            <Sequence from={0} durationInFrames={line.durationInFrames}>
              <Audio src={staticFile(`voices/${line.id}.mp3`)} />
            </Sequence>

            {/* 字幕も durationInFrames のみ表示 */}
            <Sequence from={0} durationInFrames={line.durationInFrames}>
              <SubtitleOverlay line={line} />
            </Sequence>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
