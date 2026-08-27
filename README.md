# EventPilot

EventPilot is an AI-assisted event planning workspace. A Next.js dashboard coordinates Research, Planning, and Marketing agents, while a Bun API stores their shared project memory in Walrus Memory (MemWal).

## What It Does

- Creates an event-planning project from a brief.
- Runs Research, Planning, and Marketing agents in sequence.
- Stores each agent's output in project-scoped MemWal memory.
- Lets later agents and project chat recall shared memory.
- Provides dashboard pages for the project overview, memory vault, agent runs, and project chat.

## Architecture

| Area | Technology | Purpose |
| --- | --- | --- |
| Frontend | Next.js, React, TypeScript, Tailwind, Shadcn UI | Dashboard and public website |
| API | Bun, Hono, Zod | Agent orchestration and HTTP API |
| LLM | OpenRouter API | Research, planning, marketing, and chat responses |
| Memory | Walrus Memory / MemWal | Durable, project-scoped agent memory |

The frontend and backend live in one repository but run as separate processes:

```text
Event-Pilot/          Next.js frontend
Event-Pilot/server/   Bun API
```

## Requirements

- Bun 1.2+
- An OpenRouter API key
- A Walrus Memory account with a registered delegate key

## Setup

Install dependencies for both applications:

```powershell
cd Event-Pilot
bun install

cd server
bun install
```

Create `server/.env` from `server/.env.example`, then configure it:

```env
PORT=4000
CORS_ORIGIN=http://localhost:3001

OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=openai/gpt-4o-mini

MEMWAL_PRIVATE_KEY=your_registered_delegate_private_key
MEMWAL_ACCOUNT_ID=your_memwal_account_object_id
MEMWAL_SERVER_URL=https://relayer.memory.walrus.xyz
```

The root `.env` should point the dashboard at the Bun API:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Run Locally

Start the frontend in one terminal:

```powershell
cd Event-Pilot
bun dev -- --port 3001
```

Start the API in another terminal:

```powershell
cd Event-Pilot/server
bun dev
```

Open `http://localhost:3001/dashboard`.

Check API and authenticated memory access:

```powershell
Invoke-RestMethod -Uri 'http://localhost:4000/health'
```

The response must show `status: ok` and `memory.authenticated: true` before workflows can persist memory.

## Workflow

1. The frontend creates a project with `POST /projects`.
2. `POST /projects/:id/run` runs the agents.
3. Research generates an event brief and writes it to MemWal.
4. Planning and Marketing recall project memory, generate their outputs, then write them back.
5. The dashboard retrieves memories and can ask project-scoped questions through chat.

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/health` | API, relayer, and authenticated MemWal status |
| POST | `/projects` | Create a project from an event brief |
| GET | `/projects/:projectId` | Get project state and outputs |
| POST | `/projects/:projectId/run` | Run the agent workflow |
| GET | `/projects/:projectId/activity` | Get orchestration activity |
| GET | `/projects/:projectId/memories` | Recall project memory |
| POST | `/projects/:projectId/chat` | Ask a memory-grounded project question |

## Walrus Memory Authentication

The Bun backend does not use the browser Slush session or the MCP `memwal_login` session. It authenticates each request with the delegate key and account ID in `server/.env`.

For a production account, use:

```env
MEMWAL_SERVER_URL=https://relayer.memory.walrus.xyz
```

For staging credentials, use:

```env
MEMWAL_SERVER_URL=https://relayer-staging.memory.walrus.xyz
```

The delegate key, account ID, and relayer must all belong to the same network. A browser login alone does not make a headless Bun server authenticated.

## Troubleshooting

### `EADDRINUSE` on port 4000

An earlier backend is running. Find and stop it, then restart:

```powershell
netstat -ano | findstr :4000
taskkill /PID YOUR_PID /F
bun dev
```

### MemWal Authentication Is False

Confirm that the delegate private key is registered on the MemWal account named by `MEMWAL_ACCOUNT_ID`, and that the account, delegate, and relayer use the same network.

### OpenRouter Request Failed

Check that the OpenRouter key is valid, the selected model is available, and the account has sufficient credits. A full workflow makes multiple model requests.

## Security

- Do not commit `.env` files or API keys.
- Use a MemWal delegate key, never a Slush wallet seed phrase or owner private key.
- Keep `OPENROUTER_API_KEY` and all MemWal credentials server-side only.
