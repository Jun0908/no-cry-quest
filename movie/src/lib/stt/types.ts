export interface TranscriptResult {
  text: string;
}

export interface SpeechToTextProvider {
  transcribe(audioFilePath: string): Promise<TranscriptResult>;
}
