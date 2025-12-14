# Lec 0 — GitHub Repo Setup + Local Dev Workflow (Daily Message App)

Goal: Before touching AWS, set up a clean GitHub repo and a reproducible local development workflow.

Output of this lecture (Commit 1):

- A GitHub repository you can share
- A project skeleton with docs/, services/, infra/
- Node.js + TypeScript initialized
- A dummy Lambda you can run locally
- First commit pushed to GitHub

--------------------------------------------------
What You Are Building (Course Overview)
--------------------------------------------------

This course builds a Daily Message Notification App.

You will:

- Pre-register messages in bulk (by date)
- Each day call one API endpoint
- Get the exact message you should send to your group chat
- Use real AWS services later (API Gateway, Lambda, DynamoDB, EventBridge, SQS)

In Lec 0, we do ZERO AWS.
We only prepare the repository and local workflow.

--------------------------------------------------
Why Lec 0 Exists (Do NOT Skip)
--------------------------------------------------

Serverless does NOT mean no engineering.

Even when AWS manages servers, you still need:

- clean project structure
- dependency management
- reproducible local commands
- clear documentation
- clean commit checkpoints

This lecture prevents:

- debugging AWS with broken local setup
- unclear repo history
- unteachable project structure

--------------------------------------------------
Step 0 — Prerequisites (Install Once)
--------------------------------------------------

Required:

- Git
- Node.js (LTS recommended)

Check installation:

    git --version
    node -v
    npm -v

If any command fails, install it before continuing.

--------------------------------------------------
Step 1 — Create GitHub Repository (Web UI)
--------------------------------------------------

1. Log in to GitHub
2. Click "New repository"
3. Repository name (example): daily-message-app
4. Visibility: Public (recommended)
5. Do NOT initialize with README
6. Click "Create repository"

--------------------------------------------------
Step 2 — Clone Repository Locally
--------------------------------------------------

Choose a local workspace folder, then run:

    git clone <YOUR_REPO_URL>
    cd daily-message-app

Confirm:

    pwd
    ls

--------------------------------------------------
Step 3 — Create Project Structure
--------------------------------------------------

Create folders:

    mkdir -p docs services infra

Expected structure:

    docs/
    services/
    infra/

Meaning:

- docs/     : lecture notes and documentation
- services/ : Lambda handlers and shared code
- infra/    : infrastructure definitions (later)

--------------------------------------------------
Step 4 — Initialize Node.js + TypeScript
--------------------------------------------------
No need to get into any of the above folder. Stay where you are, and do the following:

Initialize package.json:

    npm init -y

Install dev dependencies:

    npm install -D typescript ts-node @types/node

Create tsconfig.json:

    npx tsc --init

Edit `tsconfig.json` to make it

```json
{
  "compilerOptions": {
    /* Language and runtime */
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "CommonJS",
    "moduleResolution": "node",

    /* Project structure */
    "rootDir": ".",
    "outDir": "dist",

    /* Interop and imports */
    "esModuleInterop": true,
    "resolveJsonModule": true,

    /* Type safety */
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,

    /* Build behavior */
    "sourceMap": true
  },
  "include": ["services/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

--------------------------------------------------
Step 5 — Add NPM Scripts
--------------------------------------------------

Edit `package.json` and set scripts:

```json
"scripts": {
  "dev": "ts-node services/local-runner.ts",
  "build": "tsc",
  "start": "node dist/services/local-runner.js"
}，
```

Meaning:

- `npm run dev`    → fast local iteration
- `npm run build`  → compile TypeScript
- `npm start`      → run compiled JS (deployment-style)

--------------------------------------------------
Step 6 — Create Dummy Lambda Handler
--------------------------------------------------

Create file: `services/handlers/getToday.ts`

Content:

```typescript
export type ApiResponse = {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
};

export async function handler(): Promise<ApiResponse> {
  const todayJst = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: todayJst,
      text: "Hello from Lec 0. Hardcoded message.",
    }),
  };
}
```

This simulates a Lambda handler without AWS.

--------------------------------------------------
Step 7 — Create Local Runner
--------------------------------------------------

Create file: `services/local-runner.ts`

Content:

```typescript
import { handler } from "./handlers/getToday";

async function main() {
  const res = await handler();
  console.log("=== Local Lambda Output ===");
  console.log(res.statusCode);
  console.log(res.headers);
  console.log(res.body);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Run locally:

    npm run dev

You should see status code 200 and today’s date.

--------------------------------------------------
Step 8 — Add gitignore and Env Template
--------------------------------------------------

Still stay where you are, do the following:

Create `.gitignore`:

    node_modules
    dist
    .env
    .DS_Store

Create `.env.example`:

    AWS_REGION=ap-northeast-1
    DDB_TABLE_NAME=DailyMessages
    SQS_QUEUE_URL=

Rules:

- Never commit .env
- Always commit .env.example

--------------------------------------------------
Step 9 — Save This Lecture into docs/
--------------------------------------------------

Create file:

    docs/lec-0-repo-setup.md

Paste the ENTIRE content of this lecture into that file.

--------------------------------------------------
Step 10 — First Commit (Commit 1)
--------------------------------------------------

Check status:

    git status

Add files:

    git add .

Commit:

    git commit -m "L0: repo setup + local TS runner"

Push:

    git push origin main

--------------------------------------------------
Serverless Concept (Important)
--------------------------------------------------

Serverless means:
- AWS manages servers
- You manage code, logic, permissions, and design

This course teaches:
Managed infrastructure + your code + event-driven thinking

--------------------------------------------------
Definition of Done (Checklist)
--------------------------------------------------

You are done with Lec 0 if:
- GitHub repo exists
- Project structure is correct
- npm run dev works
- docs/ contains this lecture
- First commit is pushed

--------------------------------------------------
Preview of Lec 1
--------------------------------------------------

Next lecture:
- Introduce DynamoDB
- Design date-based schema
- Read/write real data

Say: Start Lec 1
--------------------------------------------------
