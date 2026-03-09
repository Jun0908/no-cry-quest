<p align="center">
  <img src="frontend/public/scene/final/unlock-burst.svg" alt="No Cry" width="120" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.1.6-000000?logo=nextdotjs&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Hardhat-3.1.10-FFF100?logo=ethereum&logoColor=black" alt="Hardhat" />
  <img src="https://img.shields.io/badge/Remotion-4.0.433-black?logo=remotion&logoColor=white" alt="Remotion" />
  <img src="https://img.shields.io/badge/OpenAI-API-412991?logo=openai&logoColor=white" alt="OpenAI API" />
</p>

# no-cry

AI x Quest x Secret Sharing demo project.

## What is this?

`no-cry` is a mono-repo with two work areas:

- `frontend/`: Next.js app (quest flow, unlock flow, payout flow, API routes, Hardhat tests)
- `movie/`: Remotion-based video generation pipeline (TTS / STT / translation / image + ffmpeg helpers)

## Repository Structure

| Directory | Purpose |
|---|---|
| `frontend/` | Main web app and contract/dev scripts |
| `movie/` | Video automation and narration pipeline |
| `.agents/` | Human task and project notes |

## Tech Stack

| Category | Technology | Version |
|---|---|---|
| Frontend | Next.js | 16.1.6 |
| UI | React | 19.2.3 |
| Language | TypeScript | 5.x |
| Contract Dev/Test | Hardhat | 3.1.10 |
| Video | Remotion | 4.0.433 |
| AI Integrations | OpenAI / ElevenLabs | - |
| Runtime | Node.js | 20+ recommended |

## Setup

### 1) Frontend

```bash
cd frontend
npm install
npm run dev
```

- App: http://localhost:3000

### 2) Movie Pipeline

```bash
cd movie
npm install
npm run start
```

## Useful Commands

In `frontend/`:

```bash
npm run test:hardhat
npm run demo:task10:seed
npm run demo:task10:test
```

In `movie/`:

```bash
npm run build
npm run voices
npm run shadow:mvp
npm run automate
```

## Notes

- Area-specific instructions: `frontend/AGENT.md`, `movie/AGENT.md`
- Root entrypoint for contributors: `AGENT.md`
