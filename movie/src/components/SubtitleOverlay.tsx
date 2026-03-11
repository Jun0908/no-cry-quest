import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { ScriptLine } from "../data/script";

interface Props {
  line: ScriptLine;
}

export const SubtitleOverlay: React.FC<Props> = ({ line }) => {
  const frame = useCurrentFrame();
  const fadeFrames = 8;

  const opacity = interpolate(
    frame,
    [0, fadeFrames, line.durationInFrames - fadeFrames, line.durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 60,
      }}
    >
      <div style={{ opacity, textAlign: "center", maxWidth: "80%" }}>
        {/* 
          // TypeScript error workaround: ScriptLine doesn't have 'chapter' anymore 
          // line.chapter && (
          //   <div...
          // ) 
        */}
        <div
          style={{
            fontSize: 40,
            fontWeight: 600,
            color: "#FFFFFF",
            fontFamily: "sans-serif",
            textShadow: "0 2px 8px rgba(0,0,0,0.9)",
            lineHeight: 1.4,
            padding: "12px 24px",
            backgroundColor: "rgba(0, 0, 0, 0.55)",
            borderRadius: 8,
          }}
        >
          {line.text}
        </div>
      </div>
    </AbsoluteFill>
  );
};
