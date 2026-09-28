# AI Interview Simulator

## Overview

A full-stack AI Interview Simulator. Users can practice mock job interviews, record voice or typed answers, and receive AI-generated scoring and detailed feedback. Built as a pnpm monorepo.

## Architecture

```
artifacts/
  api-server/        — Express 5 REST API (port 8080, proxied at /api)
  interview-simulator/ — React + Vite frontend (port 25978, proxied at /)
lib/
  api-spec/          — OpenAPI spec (openapi.yaml) + Orval codegen config
  api-client-react/  — Generated React Query hooks + Zod schemas
  api-zod/           — Generated Zod schemas for backend validation
  db/                — Drizzle ORM schema + migrations (PostgreSQL)
  integrations-openai-ai-server/ — OpenAI server-side client (AI feedback + transcription)
  integrations-openai-ai-react/  — OpenAI react-side audio hooks
```

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js**: 24, **TypeScript**: 5.9
- **Frontend**: React 19, Vite 7, Tailwind CSS v4, shadcn/ui, Wouter (routing), Framer Motion
- **Auth**: Clerk (via `@clerk/react` + `@clerk/express`)
- **Backend**: Express 5, Pino logging
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **AI**: OpenAI (gpt-4o-mini for feedback, gpt-4o-mini-transcribe for voice)
- **API codegen**: Orval (React Query hooks generated from OpenAPI spec)
- **Validation**: Zod 3.25, drizzle-zod
- **Build**: esbuild

## Key Commands

```bash
pnpm run typecheck                          # Full typecheck (all packages)
pnpm --filter @workspace/api-spec run codegen  # Regenerate API hooks from OpenAPI spec
pnpm --filter @workspace/db run push       # Push DB schema to dev database
pnpm --filter @workspace/db run seed       # Seed question bank (22 questions)
```

## Pages

| Route | Description |
|---|---|
| `/` | Landing page (public) |
| `/sign-in` | Clerk sign-in |
| `/sign-up` | Clerk sign-up |
| `/dashboard` | Authenticated — performance hub with stats and history |
| `/interview/start` | Configure and start a new mock interview |
| `/interview/session/:id` | Active interview — answer questions by text or voice |
| `/interview/result/:id` | AI feedback — score, strengths, weaknesses, suggestions |

## Database Schema

- `interview_sessions` — user sessions (job role, difficulty, status, score)
- `questions` — seeded question bank (22 questions across 6 categories)
- `answers` — user responses per session per question
- `feedback` — AI-generated feedback per session (strengths, weaknesses, suggestions, score)

## Environment Variables

| Variable | Notes |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (auto-set by Replit) |
| `SESSION_SECRET` | Session secret (set in Replit Secrets) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (frontend) |
| `VITE_CLERK_PROXY_URL` | Clerk proxy URL (frontend) |
| `CLERK_SECRET_KEY` | Clerk secret key (backend) |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI proxy base URL |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI proxy API key |

## Notable Patterns

- All API hooks imported from `@workspace/api-client-react` (never raw fetch)
- Zod 3.25 changed internals — use `zodResolver(schema as any)` with @hookform/resolvers v3
- `getNextQuestion` returns `Question | void` — use `!= null` guards in JSX, not `&&`
- Backend uses `req.log` (Pino) for all logging, never `console.log`
- Feedback stored as JSON strings in DB, parsed back to arrays on read
- Voice recording uses browser MediaRecorder API → base64 → `/api/interviews/:id/transcribe`
