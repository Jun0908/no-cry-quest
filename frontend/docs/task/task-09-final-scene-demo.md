# Task 09: Final Scene Demo (Astar Shibuya)

## Goal
Demo体験を「最後の1鍵を集めて解錠し、分配まで完了する最終シーン」に絞る。  
運用Chainは Astar Testnet（Shibuya）を固定で使用する。

## Tasks
- [ ] Demo Modeを追加し、接続先をShibuyaに固定する
  - Chain不一致時は操作をブロックし、Shibuyaへの切替導線を表示
  - Demoで使うQuest ID / Vault ID / Contract Addressを固定値で管理
- [ ] 「3/4鍵が揃っている状態」を事前投入する
  - backendまたはscriptでデモ開始時の初期状態を投入
  - 残り1鍵のみユーザー操作で提出できる状態にする
- [ ] 最終シーン専用UIを実装する
  - 1画面で `3/4 -> 4/4 -> unlock -> payout` を追える進行表示
  - 各ステップでTx hash / status / エラー理由を表示
- [ ] 仮SVGアセットを作成する（後で高品質素材へ置換）
  - 保存先: `public/scene/final/`
  - 作成ファイル: `bg-final-room.svg`, `shard-last.svg`, `unlock-burst.svg`, `payout-glow.svg`, `timeline-3of4.svg`, `timeline-4of4.svg`
  - 仕様: `viewBox` を固定し、色はCSS変数で制御可能にする
- [ ] SVG差し替えしやすい構成にする
  - 画像参照をコンポーネント1箇所に集約（例: `FinalSceneVisual.tsx`）
  - 後でSVG差し替え時にファイル置換だけで成立する設計にする
- [ ] デモ用リハーサル手順を作る
  - 成功ケース（最後の鍵提出で完了）
  - 失敗ケース（Chain違い、署名拒否、Tx失敗）からの復帰

## Acceptance Criteria
- 初期表示で「3/4鍵」状態が確認できる
- 最後の1鍵提出後、unlockとpayoutがShibuya上で完了する
- 仮SVGを高品質版へ差し替える際、コード変更なしで置換できる
- 1セッションでデモ導線を完走できる（目安: 3分以内）
