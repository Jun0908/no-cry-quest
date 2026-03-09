import { spawn } from "child_process";

export interface VideoMetadata {
  durationSec: number;
  width: number;
  height: number;
  fps: number;
  hasAudio: boolean;
}

interface CommandResult {
  stdout: string;
  stderr: string;
}

const parseFps = (value: string | undefined): number => {
  if (!value) return 30;
  const [numRaw, denRaw] = value.split("/");
  const num = Number(numRaw);
  const den = Number(denRaw ?? "1");
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return 30;
  return num / den;
};

const runCommand = (bin: string, args: string[]): Promise<CommandResult> =>
  new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      reject(err);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          `${bin} exited with code ${code}\n${stderr || stdout || "(no output)"}`
        )
      );
    });
  });

export const runFfmpeg = async (args: string[]): Promise<void> => {
  await runCommand("ffmpeg", args);
};

export const runFfprobe = async (args: string[]): Promise<string> => {
  const result = await runCommand("ffprobe", args);
  return result.stdout;
};

export const probeVideo = async (inputPath: string): Promise<VideoMetadata> => {
  const raw = await runFfprobe([
    "-v",
    "error",
    "-show_streams",
    "-show_format",
    "-print_format",
    "json",
    inputPath,
  ]);
  const parsed = JSON.parse(raw) as {
    streams?: Array<{
      codec_type?: string;
      width?: number;
      height?: number;
      r_frame_rate?: string;
    }>;
    format?: {
      duration?: string;
    };
  };

  const streams = parsed.streams ?? [];
  const video = streams.find((s) => s.codec_type === "video");
  const hasAudio = streams.some((s) => s.codec_type === "audio");
  const durationSec = Number(parsed.format?.duration ?? 0);
  if (!video || !video.width || !video.height || !Number.isFinite(durationSec)) {
    throw new Error("Failed to probe input video. Ensure file has video stream.");
  }

  return {
    durationSec,
    width: video.width,
    height: video.height,
    fps: parseFps(video.r_frame_rate),
    hasAudio,
  };
};

export const probeDuration = async (inputPath: string): Promise<number> => {
  const raw = await runFfprobe([
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    inputPath,
  ]);
  const value = Number(raw.trim());
  if (!Number.isFinite(value)) {
    throw new Error(`Failed to read media duration: ${inputPath}`);
  }
  return value;
};
