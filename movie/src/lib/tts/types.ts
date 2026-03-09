export interface TextToSpeechProvider {
  synthesize(text: string, outFilePath: string): Promise<void>;
}
