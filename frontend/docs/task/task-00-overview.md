# Task 00: Project Overview (Payout Quest Game)

## Objective
故人AIとの会話を起点に、クエスト達成と4人協力のShamirしきい値解除を経て、オンチェーンで実資産を分配するMVPを構築する。

## Core Loop
1. PlayerがDeceased Agentと会話して次アクションを受け取る
2. Playerが現実/ゲーム内行動を実施して証跡提出
3. 検証によりQuest達成が確定
4. 4人がshardを提示してUnlock Secretを復元
5. Vaultコントラクトが解錠されPayout実行
6. 結果（Tx hash/分配明細）をUI表示

## MVP Scope (Phase 1)
- Proof判定は「サーバ検証 + サーバ署名（Oracle）」
- Shamirは4-of-4をデフォルト（3-of-4は将来オプション）
- EVMチェーン上でVault作成/Lock/Unlock/Payout
- Frontendはチャット、クエスト進捗、解除、結果表示の4画面

## Deliverables
- 仕様: 経験設計、状態遷移、脅威モデル
- 実装: Smart Contract, Backend, Frontend
- 運用: 監視、インシデント対応、鍵管理手順
- 検証: E2Eデモ（実際のテストトランザクション含む）

## Definition of Done
- 1つのQuestで入金→達成→4人解除→分配まで通る
- 主要イベントがオンチェーンログとアプリログ両方で追跡可能
- 不正系の主要ケース（単独解除、改ざん証跡、期限切れ）が拒否される
