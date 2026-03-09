# Task10 Runbook

## 1. Seed
```bash
npm run demo:task10:seed
```

## 2. Start app
```bash
npm run dev
```

## 3. Open Final Scene
- `/final` を開く
- `Task10 謎解きと判定` パネルでモードを選択

## 4. Modes
- `current_location`
  - 現在地・方位・ピッチ・viewScore を入力して判定
  - 初回判定地点がアンカーとして自動登録される
- `toyokuni_photo`
  - 豊国神社参照写真をアップロード
  - 写真アップロード済みならview判定を通過可能（Demo向け）

## 5. Debug
- `simulate-success` ボタンでTask10判定を強制成功

## 6. Verify code checks
```bash
npm run demo:task10:test
```
