import OpenAI from "openai";
import {
    ImageGenerationOptions,
    ImageGenerationProvider,
    ImageGenerationResult,
} from "./types";

export class OpenAiImageProvider implements ImageGenerationProvider {
    private openai: OpenAI;
    private model: string;

    constructor(options: { apiKey: string; model?: string }) {
        this.openai = new OpenAI({ apiKey: options.apiKey });
        this.model = options.model ?? "dall-e-3";
    }

    async generateImage(
        options: ImageGenerationOptions
    ): Promise<ImageGenerationResult> {
        const response = await this.openai.images.generate({
            model: this.model,
            prompt: options.prompt,
            n: 1,
            size: options.size ?? "1024x1024",
            quality: options.quality ?? "standard",
            style: options.style ?? "vivid",
        });

        const rawResponse = response as any;
        const url = rawResponse.data[0]?.url;
        if (!url) {
            throw new Error("No image URL returned from OpenAI.");
        }

        return {
            url,
            revisedPrompt: rawResponse.data[0]?.revised_prompt,
        };
    }
}
