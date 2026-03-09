import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import { dirname } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { TextToSpeechProvider } from "./types";

export class ElevenLabsTtsProvider implements TextToSpeechProvider {
  private readonly client: ElevenLabsClient;
  private readonly voiceId: string;
  private readonly modelId: string;
  private readonly stability: number;
  private readonly similarityBoost: number;
  private readonly style: number;
  private readonly useSpeakerBoost: boolean;

  constructor({
    apiKey,
    voiceId,
    modelId = "eleven_multilingual_v2",
    stability = 0.5,
    similarityBoost = 0.75,
    style = 0,
    useSpeakerBoost = true,
  }: {
    apiKey: string;
    voiceId: string;
    modelId?: string;
    stability?: number;
    similarityBoost?: number;
    style?: number;
    useSpeakerBoost?: boolean;
  }) {
    this.client = new ElevenLabsClient({ apiKey });
    this.voiceId = voiceId;
    this.modelId = modelId;
    this.stability = stability;
    this.similarityBoost = similarityBoost;
    this.style = style;
    this.useSpeakerBoost = useSpeakerBoost;
  }

  async synthesize(text: string, outFilePath: string): Promise<void> {
    await mkdir(dirname(outFilePath), { recursive: true });
    const audioStream = await this.client.textToSpeech.convert(this.voiceId, {
      text,
      modelId: this.modelId,
      voiceSettings: {
        stability: this.stability,
        similarityBoost: this.similarityBoost,
        style: this.style,
        useSpeakerBoost: this.useSpeakerBoost,
      },
      outputFormat: "mp3_44100_128",
    });

    const outStream = createWriteStream(outFilePath);
    await pipeline(
      Readable.fromWeb(
        audioStream as import("stream/web").ReadableStream<Uint8Array>
      ),
      outStream
    );
  }
}
