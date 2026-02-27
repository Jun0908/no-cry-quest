# Task 06: Frontend (Next.js)

## Goal
会話→行動→解除→分配までを単一体験として操作できるUIを構築する。

## Tasks
- [x] 画面実装
  - `/chat`, `/quest`, `/unlock`, `/payout`
- [x] Wallet連携
  - 接続、署名、Tx送信、結果表示
- [x] Quest進捗UI
  - checklist、証跡アップロード、検証待ちステータス
- [x] Unlock UI
  - 4人の参加状況、shard提出進捗、失敗理由
- [x] Payout UI
  - Tx hash、受取額、受取先アドレス、イベント履歴
- [x] 状態同期
  - on-chainイベント + backend状態を統合表示

## Acceptance Criteria
- 4画面でMVPループを一貫して操作できる
- Tx成功/失敗時のユーザー向けエラー表示が実装されている

## 人間がやること
- [ ] 実機でのウォレット接続テスト（MetaMask等）を各画面で実施する
- [ ] UX文言（日本語）とエラーメッセージを最終校正する
- [ ] デモ用Quest ID/契約アドレスを事前配布し、操作手順を参加者に共有する
- [ ] 本番公開前にブラウザ互換性チェック（Chrome/Safari/Edge）を完了する
