import { readFile } from "fs/promises";
import { basename } from "path";
import type { SpeechToTextProvider, TranscriptResult } from "./types";

interface OpenAITranscriptionJson {
  text?: string;
}

export class OpenAIWhisperProvider implements SpeechToTextProvider {
  private readonly apiKey: string;
  private readonly model: string;

  constructor({
    apiKey,
    model = "whisper-1",
  }: {
    apiKey: string;
    model?: string;
  }) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async transcribe(audioFilePath: string): Promise<TranscriptResult> {
    const audioBuffer = await readFile(audioFilePath);
    const form = new FormData();
    form.append("file", new Blob([audioBuffer]), basename(audioFilePath));
    form.append("model", this.model);
    form.append("response_format", "json");

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: form,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `OpenAI transcription failed (${response.status}): ${body}`
      );
    }

    const json = (await response.json()) as OpenAITranscriptionJson;
    return { text: (json.text ?? "").trim() };
  }
}
