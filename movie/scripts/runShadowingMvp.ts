import "dotenv/config";
import { access } from "fs/promises";
import { resolve } from "path";
import { runShadowingPipeline } from "../src/lib/pipeline/run-job";
import { OpenAIWhisperProvider } from "../src/lib/stt/openai";
import { ElevenLabsTtsProvider } from "../src/lib/tts/elevenlabs";
import { OpenAIJapaneseTranslator } from "../src/lib/translate/openai";

const readArg = (name: string): string | undefined => {
  const index = process.argv.findIndex((arg) => arg === name);
  if (index < 0) return undefined;
  return process.argv[index + 1];
};

const hasFlag = (name: string): boolean => process.argv.includes(name);

const readNumberArg = (name: string, fallback: number): number => {
  const value = readArg(name);
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a number > 0.`);
  }
  return parsed;
};

async function main() {
  const inputPath = resolve(readArg("--input") ?? "public/demo.mp4");
  const outputDir = resolve(readArg("--output-dir") ?? "out");
  const outputFileName = readArg("--output") ?? undefined;
  const segmentLengthSec = readNumberArg("--segment", 15);
  const keepArtifacts = hasFlag("--keep-artifacts");

  await access(inputPath).catch(() => {
    throw new Error(`Input file not found: ${inputPath}`);
  });

  const openAiApiKey = process.env.OPENAI_API_KEY;
  const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
  const elevenLabsVoiceId =
    process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";

  if (!openAiApiKey) {
    throw new Error("OPENAI_API_KEY is required for STT.");
  }
  if (!elevenLabsApiKey) {
    throw new Error("ELEVENLABS_API_KEY is required for TTS.");
  }

  const stt = new OpenAIWhisperProvider({
    apiKey: openAiApiKey,
    model: process.env.OPENAI_STT_MODEL ?? "whisper-1",
  });
  const translator = new OpenAIJapaneseTranslator({
    apiKey: openAiApiKey,
    model: process.env.OPENAI_TRANSLATION_MODEL ?? "gpt-4o-mini",
    temperature: Number(process.env.OPENAI_TRANSLATION_TEMPERATURE ?? "0.2"),
  });
  const tts = new ElevenLabsTtsProvider({
    apiKey: elevenLabsApiKey,
    voiceId: elevenLabsVoiceId,
    modelId: process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2",
    stability: Number(process.env.ELEVENLABS_STABILITY ?? "0.5"),
    similarityBoost: Number(process.env.ELEVENLABS_SIMILARITY_BOOST ?? "0.75"),
    style: Number(process.env.ELEVENLABS_STYLE ?? "0.0"),
    useSpeakerBoost: process.env.ELEVENLABS_USE_SPEAKER_BOOST === "true",
  });

  console.log("[shadowing] start");
  console.log(`[shadowing] input: ${inputPath}`);
  console.log(`[shadowing] outputDir: ${outputDir}`);
  console.log(`[shadowing] segment: ${segmentLengthSec}s`);

  const result = await runShadowingPipeline(
    {
      inputVideoPath: inputPath,
      outputDir,
      segmentLengthSec,
      outputFileName,
      keepArtifacts,
    },
    {
      stt,
      translator,
      tts,
      logger: (message) => console.log(`[shadowing] ${message}`),
    }
  );

  console.log("[shadowing] done");
  console.log(`[shadowing] output: ${result.outputPath}`);
  if (keepArtifacts) {
    console.log(`[shadowing] workDir: ${result.workDir}`);
  }
  console.log(`[shadowing] segments: ${result.segmentCount}`);
}

main().catch((error) => {
  console.error("[shadowing] failed");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
