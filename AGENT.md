# AGENT.md

## Project Overview

This repository has separate work areas for frontend and movie.

- `frontend/` : Next.js frontend implementation
- `movie/` : Remotion video implementation

Project-wide notes for humans are kept in `.agents/`.

## How to work

Choose the work area first.

- For frontend work, read `frontend/AGENT.md`
- For movie work, read `movie/AGENT.md`

Do not read the entire repository unless it is necessary.

## Source of truth

Global / human decisions:
- `.agents/human-task.md`

Project overview:
- `.agents/task-00-overview.md`

Area-specific tasks are stored inside each area when possible.

## Rules

- Keep this file short.
- Use this file only as an entry point.
- Put frontend-specific instructions in `frontend/AGENT.md`
- Put movie-specific instructions in `movie/AGENT.md`

## Default behavior

- Start from the nearest `AGENT.md`
- Read only the files needed for the current task
- Avoid scanning unrelated folders by default

## Frontend — デプロイ情報 (Sepolia)

| 項目 | 値 |
|---|---|
| Vault コントラクト | `0xC61574f94813f896FeDb2F036A69649a9A6fd0BE` |
| Oracle アドレス | `0x4DCf63CcD612bf1afC6E216EAFc20DDaf5071d40` |
| 現行 Quest ID | `.env.local` の `NEXT_PUBLIC_DEMO_QUEST_ID` を参照 |

- Quest をやり直す場合: Remix で `createQuest(新questId, deadline)` を実行 → `.env.local` の `NEXT_PUBLIC_DEMO_QUEST_ID` を更新 → dev server 再起動
- 環境変数のセットアップ手順は `frontend/.env.example` を参照
- Task10 現地チェックはデフォルト豊国神社 (34.9878, 135.7725)。Demo 用座標は `.env.local` の `TASK10_TOYOKUNI_LAT/LNG` で上書き可能