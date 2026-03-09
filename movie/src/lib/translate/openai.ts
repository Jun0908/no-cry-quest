import type { TextTranslatorProvider } from "./types";

interface OpenAIChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

export class OpenAIJapaneseTranslator implements TextTranslatorProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly temperature: number;

  constructor({
    apiKey,
    model = "gpt-4o-mini",
    temperature = 0.2,
  }: {
    apiKey: string;
    model?: string;
    temperature?: number;
  }) {
    this.apiKey = apiKey;
    this.model = model;
    this.temperature = temperature;
  }

  async translateToJapanese(text: string): Promise<string> {
    const source = text.trim();
    if (!source) return "";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        temperature: this.temperature,
        messages: [
          {
            role: "system",
            content:
              "Translate English to natural Japanese. Output Japanese only without explanations.",
          },
          {
            role: "user",
            content: source,
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `OpenAI translation failed (${response.status}): ${body}`
      );
    }

    const json = (await response.json()) as OpenAIChatCompletionResponse;
    const translated = json.choices?.[0]?.message?.content?.trim();
    if (!translated) {
      throw new Error("OpenAI translation returned empty content.");
    }

    return translated;
  }
}
