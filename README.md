# PrepStride

PrepStride is an AI-assisted interview preparation platform for practicing mock interviews, reviewing answers, and tracking progress over time.

The current repository contains the phase-one application. Users can authenticate, create a personalized interview from a role, company, resume, and job description, answer by text or voice, receive rubric-based feedback, generate study plans, review history, and compare results.

## Current features

- Clerk-based authentication
- Configurable role, company, experience, difficulty, question count, and interview rounds
- Optional resume and job-description uploads (PDF, DOC, DOCX, TXT, or MD; 10 MB maximum)
- Fresh session-specific questions generated at runtime—no static question bank
- Text and microphone-based answers
- OpenAI-powered audio transcription
- Evidence-based, question-specific rubrics with competency and per-answer scores
- Interview study-plan corner with daily roadmaps and saved plans
- Optional web research with source links when a company's round details are unknown
- Interview history and performance dashboard
- Side-by-side session comparison
- Responsive React interface

## Next product direction

PrepStride is being developed into a personalized interview coach. Planned work includes:

- Real-time conversational voice interviews
- Background AI jobs, streaming generation, and stronger retry/recovery behavior
- Evaluation datasets for measuring scoring consistency
- More detailed longitudinal competency analytics

## Architecture

PrepStride is a pnpm workspace containing the following packages:

```text
artifacts/
  api-server/                 Express REST API
  interview-simulator/        React and Vite web application
  mockup-sandbox/             UI development sandbox

lib/
  api-spec/                   OpenAPI specification and Orval configuration
  api-client-react/           Generated React Query API client
  api-zod/                    Generated backend validation schemas
  db/                         PostgreSQL and Drizzle ORM schemas
  integrations-openai-ai-*    OpenAI client and audio integrations

scripts/                      Workspace utility scripts
```

## Technology stack

- Node.js 24 and TypeScript
- pnpm workspaces
- React 19 and Vite
- Tailwind CSS and shadcn/ui
- TanStack Query
- Express 5
- PostgreSQL and Drizzle ORM
- Clerk authentication
- OpenAI API
- OpenAPI, Orval, and Zod

## Prerequisites

Before running the project, install or provision:

- Node.js 24
- Corepack and pnpm
- PostgreSQL
- A Clerk application
- An OpenAI API key or compatible OpenAI proxy

Enable pnpm and install the dependencies:

```bash
corepack enable
pnpm install
```

Copy the example environment file:

```bash
cp .env.example .env
```

## Environment variables

The API requires:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/prepstride
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
AI_INTEGRATIONS_OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5.5
ALLOWED_ORIGINS=http://localhost:25978
```

The same root `.env` file also supplies the web build with:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Never commit real credentials or local environment files.

## Database setup

Push the current Drizzle schema to a development database:

```bash
pnpm run db:push
```

The generated baseline migration is in `lib/db/drizzle`. Questions do not need seeding; each interview creates its own generated question set.

## Development

Start the API server:

```bash
pnpm run dev:api
```

Start the web application in another terminal:

```bash
pnpm run dev:web
```

The API health check is available at:

```text
http://localhost:8080/api/healthz
```

Open `http://localhost:25978`. Vite proxies `/api` to `http://localhost:8080` by default; change `API_ORIGIN` if the API uses another address.

## Useful commands

```bash
# Type-check the complete workspace
pnpm run typecheck

# Build all packages and applications
pnpm run build

# Regenerate API clients and backend schemas
pnpm --filter @workspace/api-spec run codegen

# Push schema changes to the development database
pnpm run db:push

# Run automated tests
pnpm test
```

## Current limitations

- Voice answers are uploaded after recording; voice interaction is not yet streamed in real time.
- Scoring is generated once at the end of a session; it is rubric-based but should be calibrated against a human-scored evaluation dataset before high-stakes use.
- AI generation runs in the request lifecycle rather than a background job queue.
- Rate limiting is in-memory and should be replaced with a shared store such as Redis when running multiple API instances.
- Uploaded originals are not persisted by PrepStride, but they are sent to the configured OpenAI endpoint for generation.

These limitations describe the initial baseline and are the focus of the next development phase.

## Repository

GitHub: [nirami98/prep-stride](https://github.com/nirami98/prep-stride)
