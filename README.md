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

# no-cry-quest

**Unlock inheritance through trust, cryptography, and teamwork.**

`no-cry-quest` is an **AI × Quest × Blockchain** prototype that turns locked value into a real-world collaborative unlocking experience.

Instead of simply transferring rewards, this project explores a new flow:

- leave behind **intent**
- encode it as **conditions**
- guide players through **AI-driven clues**
- unlock value only when the right people complete the right quest

This repo combines **frontend UX**, **smart contracts**, and **AI-powered cinematic storytelling** in one place.

---

## Why this project matters

Most reward systems and inheritance flows are passive:
someone receives value because a system says so.

`no-cry-quest` explores a different idea:

> value can be unlocked through **proof, collaboration, and narrative**

This prototype demonstrates:

- **conditional unlocks** instead of simple transfers
- **Secret Sharing** for cooperative key recovery
- **on-chain payout** for transparent execution
- **AI-guided quest flow** for narrative and interaction
- **video generation pipeline** for turning the experience into a cinematic artifact

---

## Demo Links

- **Demo:** https://no-cry.vercel.app/
- **Movie:** https://youtu.be/mBg_xS22isw
- **Slides:** https://www.canva.com/design/DAHC9gFh0Jw/nwaoPsK7Rq9Eoc3FSOX36w/edit?utm_content=DAHC9gFh0Jw&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton

## Contract Addresses

| Network | Contract Address | Explorer |
|---|---|---|
| Sepolia | `0x55B0Bc6287B3d5f39f612Fd376038a2232C95828` | https://sepolia.etherscan.io/address/0x55B0Bc6287B3d5f39f612Fd376038a2232C95828 |
| Soneium Minato (Minata) | `0x34fd97B3B80098570BE421b664728fcaE2141a57` | https://soneium-minato.blockscout.com/address/0x34fd97B3B80098570BE421b664728fcaE2141a57?tab=index |

---

## Quick Pitch

`no-cry-quest` is a working prototype for **programmable trust flow**.

It connects:

- **quest completion**
- **cooperative key recovery**
- **on-chain payout**
- **AI-generated narrative output**

into one end-to-end demo.

### Problem
Typical location-based games and puzzle quests can feel fun, but their reward logic is often weak:
proof of completion is fragile, collaboration is shallow, and payout is usually off-chain or centralized.

### Solution
We combine:

- **multi-signal verification** (location / posture / image-based evaluation)
- **Secret Sharing**
- **vault-based on-chain payout**
- **AI-assisted story and video generation**

to create a quest where rewards are not just given — they are **unlocked**.

### Why it stands out
This is not just a concept deck.  
The repo includes a working flow from:

**quest → unlock → payout → video artifact**

### Why it matters
This project shows how frontend experience, smart contract execution, and AI media generation can work together as one system.

---

## Demo Flow (3 min)

1. Progress through the quest and collect shards  
2. Pass the final unlock condition  
3. Recover access through cooperative logic  
4. Trigger vault payout on-chain  
5. Generate or review the cinematic output of the experience

---

## What is in this repository?

This is a mono-repo with two main work areas:

- `frontend/` — the interactive web app, unlock flow, payout flow, API routes, and contract tests
- `movie/` — the Remotion-based pipeline for narration, voice, subtitles, and video generation

---

## Repository Structure

| Directory | Purpose |
|---|---|
| `frontend/` | Main app, unlock flow, payout flow, contract/dev scripts |
| `movie/` | Video generation and narration pipeline |
| `.agents/` | Internal task notes and project working docs |

---

## Tech Stack

| Category | Technology | Version |
|---|---|---|
| Frontend | Next.js | 16.1.6 |
| UI | React | 19.2.3 |
| Language | TypeScript | 5.x |
| Smart Contract Dev/Test | Hardhat | 3.1.10 |
| Video | Remotion | 4.0.433 |
| AI Integrations | OpenAI / ElevenLabs | - |
| Runtime | Node.js | 20+ recommended |

---

## Local Setup

### Frontend

```bash
cd frontend
npm install
npm run dev
