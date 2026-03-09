export interface ImageGenerationOptions {
  prompt: string;
  size?: "256x256" | "512x512" | "1024x1024";
  quality?: "standard" | "hd";
  style?: "vivid" | "natural";
}

export interface ImageGenerationResult {
  url: string;
  revisedPrompt?: string;
}

export interface ImageGenerationProvider {
  generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult>;
}
