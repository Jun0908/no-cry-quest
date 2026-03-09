# Project Control Hub

このプロジェクトは、以下の3ファイルを中心に進行する。

- `.agents/README.md`（このファイル）: 全体の現在地と導線
- `frontend/Frontend.md`: フロントエンド作業の窓口
- `movie/MOVIE.md`: 映像作業の窓口

## 使い方（軽量運用）

1. まずこのファイルで「今どこまで終わっているか」を確認する。  
2. フロント実装を進めるときは `frontend/Frontend.md` の `Next Actions` を更新する。  
3. 映像を進めるときは `movie/MOVIE.md` の `Next Actions` を更新する。  
4. 大きな節目は `.agents/Task/human-task.md` に反映する。  

## Source of Truth

- 企画全体: `.agents/Task/task-00-overview.md`
- 人手で確定が必要な項目: `.agents/Task/human-task.md`
- デモ仕様（Kyoto）: `.agents/Task/task-10-kyoto-story-demo.md`

## Current Focus

- Focus: `Task 10 Kyoto Story Demo`
- Owner lane:
  - Product/Task詳細: `.agents/Task/*.md`
  - Frontend実装: `frontend/Frontend.md`
  - Movie実装: `movie/MOVIE.md`

## Update Rule

- 更新時は以下を必ず書く:
  - `Last Updated`
  - `Decision`
  - `Next Actions (max 3)`
  - `Blockers`
