# movie エージェント指針

## 1. movie の目的
- `movie/` は Remotion ベースの動画生成領域。
- 主用途は「静止画 + ナレーション + 字幕」で 1 本の動画を作ること。
- もう 1 つの用途として、既存動画を 4 パス構成で再編集する `shadow:mvp` パイプラインがある。

## 2. 主な実行フロー
- 自動生成フロー（企画から動画まで）:
  - `npm run automate -- "動画テーマ"` または `npm run automate -- scenario.json`
  - 生成順: シナリオ生成/読込 -> 画像生成 -> `src/data/scriptLines.ts` 更新 -> 音声生成 -> レンダリング
  - 出力: `out/video.mp4`
- 手動編集フロー（素材差し替え中心）:
  - `src/data/scriptLines.ts` と `public/*.png` を編集
  - `npm run voices` で `public/voices/*.mp3` と `src/data/durations.json` を更新
  - `npm run build` で動画出力
- シャドーイングフロー:
  - `npm run shadow:mvp -- --input public/demo.mp4 --segment 15`
  - 出力: `out/*-shadowing.mp4`

## 3. ディレクトリ責務
- `scripts/`
  - `automate.ts`: 企画 -> 画像 -> script -> voices -> build の統合実行
  - `generateVoices.ts`: ElevenLabs 音声生成 + duration 計測
  - `runShadowingMvp.ts`: 既存動画を STT/翻訳/TTS/FFmpeg で再構成
- `src/compositions/`
  - `MainVideo.tsx`: Remotion 本体。`SCRIPT` の各行を画像・音声・字幕として時系列配置
- `src/data/`
  - `scriptLines.ts`: 編集元スクリプト（実質の入力データ）
  - `durations.json`: 音声長から算出したフレーム長
  - `script.ts`: `scriptLines` に `durations` をマージした実行用データ
- `src/lib/`
  - `scenario/`, `image/`, `stt/`, `translate/`, `tts/`: 外部 API の薄い抽象層
  - `ffmpeg/`, `pipeline/`: shadowing の中核処理
- `public/`: 画像・音声・背景等の素材置き場（`voices/` 含む）

## 4. 変更時の重要ポイント
- `scriptLines.ts` の `id` は、画像 `public/{id}.png` と音声 `public/voices/{id}.mp3` のキーになる。必ず一致させる。
- ナレーション文を変えたら `npm run voices` を再実行する（`durations.json` を更新しないと尺がズレる）。
- `MainVideo` は `SCRIPT` を参照するため、長さ調整の最終値は `durations.json` 優先。
- BGM は現在 `src/components/BGMLayer.tsx` で無効化されている（`null` を返す）。

## 5. 必須環境
- Node.js + npm
- API キー:
  - `OPENAI_API_KEY`（シナリオ生成/STT/翻訳）
  - `ELEVENLABS_API_KEY`（音声生成）
- `shadow:mvp` を使う場合は `ffmpeg` / `ffprobe` がローカルで実行可能であること。

## 6. 最短コマンド集
- 初期セットアップ: `npm install`
- プレビュー: `npm start`
- 音声のみ再生成: `npm run voices`
- 完全自動生成: `npm run automate -- "テーマ"`
- 出力レンダリング: `npm run build`
