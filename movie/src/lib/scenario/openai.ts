import OpenAI from "openai";
import { ScenarioDefinition, ScenarioProvider } from "./types";

export class OpenAiScenarioProvider implements ScenarioProvider {
    private openai: OpenAI;
    private model: string;

    constructor(options: { apiKey: string; model?: string }) {
        this.openai = new OpenAI({ apiKey: options.apiKey });
        this.model = options.model ?? "gpt-4o";
    }

    async generateScenario(prompt: string): Promise<ScenarioDefinition> {
        const systemPrompt = `
あなたはプロの動画クリエイターです。ユーザーのトピックに基づいて、4シーン程度の短い動画シナリオを作成してください。
出力は必ず以下のJSON形式のみで行ってください。

{
  "title": "動画のタイトル",
  "scenes": [
    {
      "id": "scene1",
      "text": "字幕用の短い日本語テキスト",
      "narration": "読み上げ用の日本語ナレーション。15文字〜30文字程度。",
      "imagePrompt": "DALL-E 3で使用する、このシーンを象徴する英語の画像生成プロバイダー。詳細かつドラマチックに。"
    }
  ]
}
    `.trim();

        const response = await this.openai.chat.completions.create({
            model: this.model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error("No scenario content returned from OpenAI.");
        }

        return JSON.parse(content) as ScenarioDefinition;
    }
}
