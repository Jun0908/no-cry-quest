import { access, mkdir, rm } from "fs/promises";
import { basename, join } from "path";
import { probeDuration, probeVideo } from "../ffmpeg/ffmpeg";
import {
  adjustAudioSpeed,
  concatVideos,
  extractMonoWav,
  renderOriginalPass,
  renderSimplePass,
  renderSimpleSubtitlePass,
  trimSegment,
  writeConcatList,
} from "../ffmpeg/shadowing";
import type { SpeechToTextProvider } from "../stt/types";
import type { TextToSpeechProvider } from "../tts/types";
import type { TextTranslatorProvider } from "../translate/types";
import type {
  ShadowingPipelineOptions,
  ShadowingPipelineResult,
} from "./types";

interface RunShadowingPipelineDeps {
  stt: SpeechToTextProvider;
  tts: TextToSpeechProvider;
  translator?: TextTranslatorProvider;
  logger?: (message: string) => void;
}

const normalizeTranscript = (text: string): string =>
  text.replace(/\s+/g, " ").trim();
const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const pad3 = (value: number): string => value.toString().padStart(3, "0");

const safeStem = (filePath: string): string =>
  basename(filePath).replace(/\.[^/.]+$/, "");

export const runShadowingPipeline = async (
  options: ShadowingPipelineOptions,
  deps: RunShadowingPipelineDeps
): Promise<ShadowingPipelineResult> => {
  if (!options.inputVideoPath) {
    throw new Error("inputVideoPath is required.");
  }
  if (!options.outputDir) {
    throw new Error("outputDir is required.");
  }
  if (!Number.isFinite(options.segmentLengthSec) || options.segmentLengthSec <= 0) {
    throw new Error("segmentLengthSec must be greater than 0.");
  }

  const log = deps.logger ?? (() => undefined);
  const sourceMeta = await probeVideo(options.inputVideoPath);
  if (!sourceMeta.hasAudio) {
    throw new Error("Input video does not include an audio track.");
  }
  const pass3TtsSpeed = Number(process.env.PASS3_TTS_SPEED ?? "0.8");
  if (!Number.isFinite(pass3TtsSpeed) || pass3TtsSpeed <= 0) {
    throw new Error("PASS3_TTS_SPEED must be a positive number.");
  }
  if (pass3TtsSpeed < 0.5 || pass3TtsSpeed > 2.0) {
    throw new Error("PASS3_TTS_SPEED must be between 0.5 and 2.0.");
  }

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const workDir = join(options.outputDir, "work", runId);
  const segmentDir = join(workDir, "segments");
  const audioDir = join(workDir, "audio");
  const ttsDir = join(workDir, "tts");
  const passDir = join(workDir, "passes");

  await mkdir(segmentDir, { recursive: true });
  await mkdir(audioDir, { recursive: true });
  await mkdir(ttsDir, { recursive: true });
  await mkdir(passDir, { recursive: true });
  await mkdir(options.outputDir, { recursive: true });

  const pass2BackgroundCandidate = join(process.cwd(), "public", "listen.png");
  let pass2BackgroundImagePath: string | undefined;
  try {
    await access(pass2BackgroundCandidate);
    pass2BackgroundImagePath = pass2BackgroundCandidate;
    log(`[assets] pass2 background: ${pass2BackgroundImagePath}`);
  } catch {
    log(`[assets] pass2 background not found, fallback to solid color`);
  }

  const totalDuration = sourceMeta.durationSec;
  const passFiles: string[] = [];
  let segmentIndex = 0;

  for (
    let startSec = 0;
    startSec < totalDuration;
    startSec += options.segmentLengthSec
  ) {
    const segmentDuration = Math.min(
      options.segmentLengthSec,
      totalDuration - startSec
    );
    if (segmentDuration <= 0) continue;

    const segmentId = `seg-${pad3(segmentIndex)}`;
    const segmentPath = join(segmentDir, `${segmentId}.mp4`);
    const wavPath = join(audioDir, `${segmentId}.wav`);
    const ttsPath = join(ttsDir, `${segmentId}.mp3`);
    const ttsPass3Path = join(ttsDir, `${segmentId}-pass3.mp3`);

    const pass1Path = join(passDir, `${segmentId}-pass1.mp4`);
    const pass2Path = join(passDir, `${segmentId}-pass2.mp4`);
    const pass3Path = join(passDir, `${segmentId}-pass3.mp4`);
    const pass4Path = join(passDir, `${segmentId}-pass4.mp4`);

    log(`[${segmentId}] trim`);
    await trimSegment({
      inputPath: options.inputVideoPath,
      outputPath: segmentPath,
      startSec,
      durationSec: segmentDuration,
      size: {
        width: sourceMeta.width,
        height: sourceMeta.height,
      },
    });

    log(`[${segmentId}] extract audio`);
    await extractMonoWav(segmentPath, wavPath);

    log(`[${segmentId}] transcribe`);
    const transcript = await deps.stt.transcribe(wavPath);
    const subtitleEn = normalizeTranscript(transcript.text);
    if (!subtitleEn) {
      throw new Error(
        `[${segmentId}] STT returned empty text. Check source audio and STT API settings.`
      );
    }

    let subtitleJa = "";
    if (deps.translator) {
      log(`[${segmentId}] translate ja`);
      try {
        subtitleJa = normalizeTranscript(
          await deps.translator.translateToJapanese(subtitleEn)
        );
      } catch (error) {
        log(
          `[${segmentId}] translate ja failed (fallback to EN only): ${toErrorMessage(
            error
          )}`
        );
      }
    }

    log(`[${segmentId}] synthesize TTS`);
    await deps.tts.synthesize(subtitleEn, ttsPath);
    let pass3AudioPath = ttsPath;
    let pass3Duration = await probeDuration(ttsPath);
    if (Math.abs(pass3TtsSpeed - 1) > 0.001) {
      log(`[${segmentId}] pass3 TTS speed x${pass3TtsSpeed}`);
      await adjustAudioSpeed({
        inputPath: ttsPath,
        outputPath: ttsPass3Path,
        speed: pass3TtsSpeed,
      });
      pass3AudioPath = ttsPass3Path;
      pass3Duration = await probeDuration(pass3AudioPath);
    }

    log(`[${segmentId}] pass1`);
    await renderOriginalPass(segmentPath, pass1Path, {
      width: sourceMeta.width,
      height: sourceMeta.height,
    });

    log(`[${segmentId}] pass2`);
    await renderSimplePass({
      segmentPath,
      outputPath: pass2Path,
      durationSec: segmentDuration,
      backgroundImagePath: pass2BackgroundImagePath,
      size: { width: sourceMeta.width, height: sourceMeta.height },
    });

    log(`[${segmentId}] pass3`);
    await renderSimpleSubtitlePass({
      audioPath: pass3AudioPath,
      outputPath: pass3Path,
      durationSec: pass3Duration,
      subtitleEn,
      subtitleJa,
      size: { width: sourceMeta.width, height: sourceMeta.height },
    });

    log(`[${segmentId}] pass4`);
    await renderSimpleSubtitlePass({
      audioPath: segmentPath,
      outputPath: pass4Path,
      durationSec: segmentDuration,
      subtitleEn,
      subtitleJa,
      size: { width: sourceMeta.width, height: sourceMeta.height },
    });

    passFiles.push(pass1Path, pass2Path, pass3Path, pass4Path);
    segmentIndex += 1;
  }

  if (segmentIndex === 0) {
    throw new Error("No segments were produced.");
  }

  const outputFileName =
    options.outputFileName ?? `${safeStem(options.inputVideoPath)}-shadowing.mp4`;
  const outputPath = join(options.outputDir, outputFileName);
  const concatListPath = join(workDir, "concat.txt");

  await writeConcatList(concatListPath, passFiles);
  log(`[concat] ${passFiles.length} clips`);
  await concatVideos({
    listPath: concatListPath,
    outputPath,
  });

  if (!options.keepArtifacts) {
    await rm(workDir, { recursive: true, force: true });
  }

  return {
    outputPath,
    workDir,
    segmentCount: segmentIndex,
  };
};
