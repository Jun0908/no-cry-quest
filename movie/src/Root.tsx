import React from "react";
import { Composition } from "remotion";
import { MainVideo } from "./compositions/MainVideo";
import { getTotalDuration, FPS } from "./utils/getDuration";
import { config } from "./config";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MainVideo"
      component={MainVideo}
      durationInFrames={getTotalDuration()}
      fps={FPS}
      width={config.video.width}
      height={config.video.height}
    />
  );
};
