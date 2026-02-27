# Task 08: Milestones & Execution Plan

## Goal
実装順を固定し、短期間でMVPデモまで到達する。

## Milestone Plan
1. Week 1: Spec確定
- Product Spec、状態遷移、データモデル、API契約

2. Week 2: Contract + Backend骨格
- Vaultコントラクト初版
- Proof APIとOracle署名フロー

3. Week 3: Frontend + Agent接続
- 4画面実装
- Agent runtimeとQuest進捗連携

4. Week 4: Shamir統合 + E2E
- 4-of-4解除フロー実装
- テストネットで実分配デモ

## Exit Criteria (MVP Demo)
- テストネット上で実際にdepositとpayoutが成功
- 4人未満ではunlock不可を実証
- イベントログから全フロー追跡可能

## 人間がやること（最終チェック）
- [ ] デモ日程を固定し、4名参加者とOracle運用者の同席を確保する
- [ ] テストネット資金を全必要ウォレットへ配布する
- [ ] デモ手順書（開始条件、失敗時リカバリ、終了条件）を配布する
- [ ] デモ後に監査ログ・Tx hash・画面録画を1セットで保管する

## Post-MVP Backlog
- 3-of-4可変閾値
- ZK/TEE拡張
- 貢献度ベース分配アルゴリズム
- マルチチェーン対応
