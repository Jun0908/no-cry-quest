export interface ShadowingPipelineOptions {
  inputVideoPath: string;
  outputDir: string;
  segmentLengthSec: number;
  outputFileName?: string;
  keepArtifacts?: boolean;
}

export interface ShadowingPipelineResult {
  outputPath: string;
  workDir: string;
  segmentCount: number;
}
