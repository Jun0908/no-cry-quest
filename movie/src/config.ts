// Remotion (ブラウザ) と Node.js スクリプトの両方から import される
// dotenv の読み込みは scripts/generateVoices.ts 側で行う

export const config = {
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY ?? "",
    voiceId:
      process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM",
    modelId:
      process.env.ELEVENLABS_MODEL_ID ?? "eleven_multilingual_v2",
    stability: parseFloat(process.env.ELEVENLABS_STABILITY ?? "0.5"),
    similarityBoost: parseFloat(
      process.env.ELEVENLABS_SIMILARITY_BOOST ?? "0.75"
    ),
    style: parseFloat(process.env.ELEVENLABS_STYLE ?? "0.0"),
    useSpeakerBoost: process.env.ELEVENLABS_USE_SPEAKER_BOOST === "true",
  },
  video: {
    fps: 30,
    width: 1920,
    height: 1080,
    bgmVolume: parseFloat(process.env.BGM_VOLUME ?? "0.15"),
  },
} as const;
