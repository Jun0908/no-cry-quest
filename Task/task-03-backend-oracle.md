# Task 03: Backend / Oracle / Proof Verification

## Goal
現実行動の証跡を検証し、Quest達成を署名してオンチェーン実行可能にする。

## Tasks
- [x] API設計
  - `POST /proofs` 証跡アップロード
  - `POST /quests/:id/verify` 検証実行
  - `POST /quests/:id/sign` Oracle署名発行
- [x] Proof検証器実装
  - NFC/QR/時刻/位置/画像メタの検証ポリシー
  - 改ざん検出（ハッシュ、メタ整合性）
- [x] Oracle signer実装
  - HSM/KMS or 最低限の安全な鍵管理
  - 署名監査ログ（誰がいつ署名したか）
- [x] Quest service
  - 状態遷移のサーバ側ガード
  - 期限管理と再試行制御
- [x] 監査ログ
  - proof受領、検証結果、署名発行、失敗理由を永続化

## Acceptance Criteria
- 検証成功時のみ署名発行される
- 全署名操作に追跡可能な監査証跡が残る

## 人間がやること
- [ ] Oracle運用者アカウント（担当者）を指名し、権限分離ルールを定める
- [ ] 証跡検証ポリシー（位置許容誤差、時刻許容差）を業務要件に合わせて調整する
- [ ] 監査ログの保管先（S3 Object Lock等）を選定し、定期エクスポートを設定する
- [ ] 本番環境で `ORACLE_PRIVATE_KEY` の投入経路（KMS/HSM）を確定する
