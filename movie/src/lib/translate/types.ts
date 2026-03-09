export interface TextTranslatorProvider {
  translateToJapanese(text: string): Promise<string>;
}
