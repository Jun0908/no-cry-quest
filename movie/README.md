# AI Video Generator (powered by Remotion & ElevenLabs)

プロンプト1つで、画像・音声・字幕をすべてAIが生成し、1本の動画として出力するツールです。

---

## 🚀 使い方

### 1. 依存パッケージのインストール
```bash
npm install
```

### 2. 環境設定 (.env)
`.env.example` をコピーして `.env` を作成し、以下のキーを設定してください。

```env
OPENAI_API_KEY=あなたのOpenAIキー
ELEVENLABS_API_KEY=あなたのElevenLabsキー
```

### 3. 動画の自動生成
以下のコマンドを実行すると、AIがシナリオ作成、画像生成、音声合成を行い、動画をレンダリングします。

```bash
npm run automate -- "動画のテーマ（例：未来の火星旅行）"
```

成功すると、`out/video.mp4` に動画が出力されます。

---

## 🛠 その他の機能

### プレビュー (Remotion Studio)
ブラウザで動画をプレビュー・編集しながら確認できます。
```bash
npm start
```

### 音声の再生成
`src/data/scriptLines.ts` を直接編集した場合、以下のコマンドで音声のみを更新できます。
```bash
npm run voices
```

---

## 📁 プロジェクト構造

- `scripts/automate.ts`: 全工程を統括する自動生成エンジン
- `src/compositions/MainVideo.tsx`: 動画のレイアウトとアニメーション（画像へのズーム効果など）を定義
- `public/`: 生成された画像や音声が保存されるディレクトリ
- `src/data/scriptLines.ts`: 現在の動画の構成データ

---

## ⚠️ 補足
- このプロジェクトは、もともと「シャドーイング練習用動画」を作成するツールでしたが、現在はAIによる「動画作成ツール」へと拡張されています。
- 以前のシャドーイング機能（既存動画の加工）を使いたい場合は、`npm run shadow:mvp` を参照してください。
