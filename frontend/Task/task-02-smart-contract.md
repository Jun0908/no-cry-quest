# Task 02: Smart Contract (Vault + Quest State)

## Goal
オンチェーンで資金ロック/解除/分配を安全に実行できる状態機械を実装する。

## Tasks
- [x] コントラクト仕様決定
  - Vault作成、deposit、quest状態更新、unlock、payout
  - 受取人配列 + 比率/固定額
  - 締切時処理（expire/refund）
- [x] 署名検証実装
  - Oracle署名の検証（EIP-712推奨）
  - リプレイ防止（nonce, questId, chainId）
- [x] Unlock要件連携
  - `unlockProofHash`を受け取り、オフチェーンShamir復元結果と結合
  - 単独実行・二重実行防止
- [x] イベント設計
  - `Deposited`, `QuestVerified`, `Unlocked`, `PayoutExecuted`, `Expired`
- [x] テスト
  - 正常系: deposit -> verify -> unlock -> payout
  - 異常系: 不正署名、重複実行、期限切れ、受取先不正

## Acceptance Criteria
- 単体テストで主要分岐を網羅
- 署名再利用攻撃と二重払いが防止される
