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