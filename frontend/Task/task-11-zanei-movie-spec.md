# 秘伝（hiden）: Movie連携仕様書

## 概要

`frontend/app/hiden` と `movie/` フォルダの間で交わされるデータ契約を定義する。  
フロントエンドは「データを渡す」ことに限定し、`movie/` 内部の実装には触れない。

---

## 1. 動画ファイルのパス規約

フロントエンドは以下のパスに動画ファイルが配置されることを期待する。  
ファイルが存在しない場合は静止画スライドショーにフォールバックする。

```
frontend/public/hiden/movie/
├── intro.mp4          # オープニングシナリオ映像（推奨: 40〜60秒）
├── cipher.mp4         # 謎解きシーン回想映像（推奨: 20〜30秒）
└── ending.mp4         # ラスト解放演出（推奨: 30〜45秒）
```

### フォールバック（動画なし時）

動画ファイルがない場合、フロントエンドは `/hiden/slides/` 以下の静止画を使用する:

```
frontend/public/hiden/slides/
├── intro-1.png        # 夜明け前の京都
├── intro-2.png        # 古文書と花押
├── cipher-1.png       # 換字表の一部
└── ending-1.png       # 継承印の出現
```

---

## 2. シナリオデータのJSON形式

Remotionでシーンを生成するために渡すJSONの形式。  
フロントエンドの `/api/hiden/scenario` から取得することも可能。

```jsonc
{
  "version": "1.0",
  "scenes": [
    {
      "id": "intro",
      "type": "narration",          // "narration" | "dialogue" | "location" | "cipher"
      "durationSec": 50,
      "bgImage": "kyoto-dawn.png",  // movie/ 側が使用する背景
      "voiceText": "慶長五年。関ヶ原の戦いから十五年が過ぎた。",
      "subtitleJa": "慶長五年。関ヶ原の戦いから十五年が過ぎた。",
      "kenBurns": {
        "startScale": 1.0,
        "endScale": 1.08,
        "direction": "pan-right"
      }
    },
    {
      "id": "cipher",
      "type": "cipher",
      "durationSec": 30,
      "bgImage": "candlelight-scroll.png",
      "cipherSymbols": ["折れ桐", "丸鐘", "土盛印", "矢羽"],
      "revealOrder": [0, 1, 2, 3]
    },
    {
      "id": "ending",
      "type": "narration",
      "durationSec": 40,
      "bgImage": "toyokuni-gate.png",
      "voiceText": "黄金は朽ちる。誓いは残る。",
      "subtitleJa": "黄金は朽ちる。誓いは残る。\n名は消えても、道は継がれる。",
      "overlayEffect": "hanko-appear"  // 花押が画面中央に出現するエフェクト
    }
  ]
}
```

---

## 3. フロントエンドからのコールバック

フロントエンドは動画プレーヤーから以下のイベントを受け取ることを期待する。

| イベント | タイミング | フロントエンドの動作 |
|---|---|---|
| `movie:intro:ended` | intro.mp4 再生完了 | Phase 1（暗号解読）へ自動遷移 |
| `movie:cipher:ended` | cipher.mp4 再生完了 | 謎解きUIのアニメーションを開始 |
| `movie:ending:ended` | ending.mp4 再生完了 | Payout完了画面を表示 |
| `movie:skipped` | スキップボタン押下 | 現在フェーズのUIへ即座に遷移 |

### 実装方法（フロントエンド側）

```typescript
// フロントエンドは window.postMessage でイベントを受信する想定
window.addEventListener('message', (e) => {
  if (e.data?.type === 'movie:intro:ended') {
    setPhase(1); // Phase 1へ遷移
  }
});

// または <video> 要素の onEnded イベントを直接使用
<video src="/hiden/movie/intro.mp4" onEnded={() => setPhase(1)} />
```

---

## 4. Remotionシーン設定への入力形式

`movie/` チームがRemotionでシーンを生成する際の入力パラメータ。

```typescript
// movie/ 側のRemotionコンポーネントが受け取るProps型
type HidenSceneProps = {
  questId: string;            // クエストID（ゲーム状態と紐付け）
  playerWallet?: string;      // プレイヤーウォレットアドレス（オプション）
  scenarioData: ScenarioData; // 上記2のJSON
  outputPath: string;         // 出力先: "public/hiden/movie/{sceneId}.mp4"
  fps: 30 | 60;
  resolution: "hd" | "mobile"; // "mobile" = 1080×1920 (9:16縦型)
};
```

### モバイル向け解像度

モバイルプレイヤー向けに **9:16縦型** を推奨。

```
解像度: 1080 × 1920px
FPS: 30
コーデック: H.264 (mp4)
最大ファイルサイズ: 50MB/本
```

---

## 5. フロントエンドが提供するAPI（movie/ からの参照用）

| エンドポイント | 用途 |
|---|---|
| `GET /api/hiden/scenario` | シナリオJSONを取得 |
| `GET /api/task10/puzzle` | 暗号パズルデータを取得（movie内へ差し込む用）|
| `POST /api/hiden/movie-complete` | 動画視聴完了を記録（将来の分析用）|

---

## 6. 未実装・将来対応

- [ ] ElevenLabs音声合成との連携（voiceTextをAPIで音声化）
- [ ] DALL-E 3によるシーン背景自動生成
- [ ] AR演出（花押のWebAR重ね合わせ）
- [ ] Remotion `automate.ts` Script対応（会話 ae8557a0 参照）
