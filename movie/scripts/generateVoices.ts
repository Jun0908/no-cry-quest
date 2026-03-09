/**
 * scripts/generateVoices.ts
 *
 * Usage:
 *   npm run voices          # 未生成のファイルのみ処理
 *   npm run voices:force    # 全ファイルを再生成
 *
 * 処理内容:
 *   1. src/data/scriptLines.ts からスクリプトを読み込む
 *   2. ElevenLabs API で音声を生成 → public/voices/{id}.mp3
 *   3. music-metadata で音声長を計測 → フレーム数に変換
 *   4. src/data/durations.json を更新
 */

import "dotenv/config";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { RAW_SCRIPT } from "../src/data/scriptLines";

const VOICES_DIR = "public/voices";
const DURATIONS_PATH = "src/data/durations.json";
const FPS = 30;
const FORCE = process.argv.includes("--force");

function loadDurations(): Record<string, number> {
  try {
    return JSON.parse(readFileSync(DURATIONS_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveDurations(durations: Record<string, number>): void {
  writeFileSync(DURATIONS_PATH, JSON.stringify(durations, null, 2) + "\n");
}

async function measureFrames(mp3Path: string): Promise<number> {
  const { parseFile } = await import("music-metadata");
  const meta = await parseFile(mp3Path);
  const seconds = meta.format.duration ?? 0;
  return Math.max(1, Math.ceil(seconds * FPS));
}

async function main() {
  // 環境変数チェック
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("[error] ELEVENLABS_API_KEY が設定されていません (.env を確認)");
    process.exit(1);
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";
  const modelId = process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2";
  const stability = parseFloat(process.env.ELEVENLABS_STABILITY ?? "0.5");
  const similarityBoost = parseFloat(
    process.env.ELEVENLABS_SIMILARITY_BOOST ?? "0.75"
  );
  const style = parseFloat(process.env.ELEVENLABS_STYLE ?? "0.0");
  const useSpeakerBoost = process.env.ELEVENLABS_USE_SPEAKER_BOOST === "true";

  // ディレクトリ作成
  mkdirSync(VOICES_DIR, { recursive: true });

  // 既存 durations.json を読み込み
  const durations = loadDurations();

  const client = new ElevenLabsClient({ apiKey });

  for (const line of RAW_SCRIPT) {
    const mp3Path = `${VOICES_DIR}/${line.id}.mp3`;
    const alreadyHasDuration = durations[line.id] !== undefined;

    // スキップ条件: mp3存在 & duration記録済み & --force なし
    if (!FORCE && existsSync(mp3Path) && alreadyHasDuration) {
      console.log(`[skip]       ${line.id}`);
      continue;
    }

    // mp3存在するが duration未記録 → 計測のみ
    if (!FORCE && existsSync(mp3Path) && !alreadyHasDuration) {
      const frames = await measureFrames(mp3Path);
      durations[line.id] = frames;
      saveDurations(durations);
      console.log(`[remeasure]  ${line.id} → ${frames} frames (${(frames / FPS).toFixed(2)}s)`);
      continue;
    }

    // 音声生成
    try {
      const speechText = line.narration ?? line.text;
      const preview = speechText.length > 40
        ? speechText.slice(0, 40) + "…"
        : speechText;
      console.log(`[generate]   ${line.id}: "${preview}"`);

      const audioStream = await client.textToSpeech.convert(voiceId, {
        text: speechText,
        modelId,
        voiceSettings: {
          stability,
          similarityBoost,
          style,
          useSpeakerBoost,
        },
        outputFormat: "mp3_44100_128",
      });

      const fileStream = createWriteStream(mp3Path);
      // Web ReadableStream → Node.js Readable に変換
      await pipeline(
        Readable.fromWeb(audioStream as import("stream/web").ReadableStream<Uint8Array>),
        fileStream
      );

      const frames = await measureFrames(mp3Path);
      durations[line.id] = frames;
      saveDurations(durations);

      console.log(`[done]       ${line.id} → ${frames} frames (${(frames / FPS).toFixed(2)}s)`);

      // レート制限対策: 500ms wait
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`[error]      ${line.id}:`, err);
      // 続行（他の行は処理する）
    }
  }

  console.log("\n✓ 完了: durations.json を更新しました。");
  console.log("  Remotion Studio を再起動すると新しいタイミングが反映されます。");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
