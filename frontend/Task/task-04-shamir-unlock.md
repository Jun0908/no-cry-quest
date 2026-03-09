# Task 04: Shamir Unlock Protocol (4-of-4)

## Goal
4人協力なしでは解錠できないプロトコルを実装する。

## Tasks
- [x] SSS仕様決定
  - 初期値: 4-of-4
  - 将来設定: 3-of-4へ切替可能な設計
- [x] shard配布実装
  - 初期発行時に各Playerへ安全配布
  - 端末Secure Storage保存（エクスポート制限）
- [x] shard提出フロー
  - 署名付き提出 + セッション有効期限
  - 参加者本人性確認（Wallet署名）
- [x] secret復元実装
  - 復元はメモリ内のみ、ディスク保存禁止
  - 復元後に即時unlockトランザクション生成
- [x] 失敗/離脱対応
  - タイムアウト、再招集、キャンセルポリシー

## Acceptance Criteria
- shard 1-3個では復元不能を検証できる
- 4個揃った場合のみunlock処理が成功する
