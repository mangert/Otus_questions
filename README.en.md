# Mini Survey

[Русская версия](README.md)

A small full-stack survey application. The backend serves a fixed set of questions, validates answers, and keeps accepted submissions in memory. The frontend loads the questions, renders required fields, and displays a “Thank you!” message after a successful submission.

## Features

- TypeScript React interface with responsive plain CSS and no UI framework;
- Express REST API with shared request and response types;
- payload structure, `Content-Type`, and 32 KiB body-size validation;
- loading, submission, and error states;
- unit, API, and component tests with Vitest;
- local development and production-like Docker Compose workflows;
- prebuilt Docker images in Git LFS with a validating Bash startup script.

## Technology stack

- Node.js 22+, npm workspaces, and TypeScript;
- Express;
- React and Vite;
- Vitest, Supertest, and React Testing Library;
- Nginx, Docker, and Docker Compose.

## Architecture

During local development, the browser connects from the Vite dev server directly to the backend. In Docker, Nginx is the only published entry point: it serves the frontend and proxies `/api/*` to the internal backend container.

```text
Local:  browser -> Vite :5173 -> Express :3000
Docker: browser -> Nginx :8081 -> /api -> Express :3000
```

Main directories:

```text
backend/src/       Express app, configuration, validation, and storage
backend/tests/     backend unit and API tests
frontend/src/      React components, API client, and styles
frontend/tests/    API client and interface tests
shared/src/        shared TypeScript contracts
docs/              additional project documentation
```

See [API_CONTRACT.md](API_CONTRACT.md) for the complete API contract in Russian.

## Requirements

For local development:

- Node.js `>=22`;
- the npm version bundled with Node.js.

For container workflows:

- Docker Engine or Docker Desktop;
- Docker Compose v2 (`docker compose`);
- Git LFS when using the images stored in the repository;
- Bash and either `sha256sum` or `shasum` when using `start-docker.sh`;
- optional `curl`; without it, the script skips the HTTP readiness check.

## Local development

```bash
git clone https://github.com/mangert/Otus_questions.git
cd Otus_questions
npm ci
npm run dev
```

The following endpoints are then available:

- frontend: <http://localhost:5173>;
- backend: <http://localhost:3000>;
- questions API: <http://localhost:3000/questions>.

Both processes run under one command. Press `Ctrl+C` to stop them.

The local defaults work together without additional configuration. If needed, pass custom values through the environment:

```bash
PORT=3001 \
CORS_ORIGINS=http://localhost:5173 \
VITE_API_URL=http://localhost:3001 \
npm run dev
```

In PowerShell:

```powershell
$env:PORT = '3001'
$env:CORS_ORIGINS = 'http://localhost:5173'
$env:VITE_API_URL = 'http://localhost:3001'
npm run dev
```

## Running the prebuilt Docker images

The `mini-survey-backend:latest` and `mini-survey-frontend:latest` images are stored as Git LFS-managed TAR files in the repository root.

```bash
git lfs install
git lfs pull
chmod +x start-docker.sh
./start-docker.sh
```

The script:

1. checks Docker Engine and Compose v2;
2. uses installed images or loads missing images from the TAR files;
3. detects LFS pointer files and verifies archive size and SHA-256 before loading;
4. starts Compose without rebuilding and prints the application URL.

The application is available at <http://localhost:8081> by default. Stop and remove the containers with:

```bash
docker compose down
```

If a TAR file is about 130 bytes or Docker reports `unexpected EOF`, the actual LFS object was not downloaded. Restore the files and retry:

```bash
git lfs pull
git lfs checkout
```

## Building and running with Docker Compose

Build the images from source with:

```bash
docker compose up --build --detach
```

Compose publishes only the Nginx/frontend service. The backend is available to containers on the internal network at port `3000` and is not published to the host. Inspect the current state with:

```bash
docker compose ps
```

Compose settings have usable defaults. To customize them, create `.env` from the example:

```bash
cp .env.example .env
```

The equivalent Windows PowerShell command is:

```powershell
Copy-Item .env.example .env
```

## Environment variables

| Variable        | Context              | Default                                       | Purpose                                                                      |
| --------------- | -------------------- | --------------------------------------------- | ---------------------------------------------------------------------------- |
| `PORT`          | backend, runtime     | `3000`                                        | Backend port during local development; fixed to `3000` inside Compose.       |
| `CORS_ORIGINS`  | backend, runtime     | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated origins allowed to call the backend directly from a browser. |
| `VITE_API_URL`  | frontend, build time | local `http://localhost:3000`, Compose `/api` | Base URL embedded by Vite in the frontend bundle.                            |
| `FRONTEND_PORT` | Compose, runtime     | `8081`                                        | Host port mapped to Nginx.                                                   |

### `VITE_API_URL` is a build-time setting

Vite substitutes `VITE_API_URL` while building the frontend JavaScript. Changing the variable on an already running container does not alter the existing bundle. Rebuild the frontend after editing `.env`:

```bash
docker compose build frontend
docker compose up --detach
```

`start-docker.sh` runs the prebuilt image configured with `VITE_API_URL=/api`. Build the frontend from source with Compose when a different API URL is required.

### CORS configuration

For local development, the backend allows the Vite origins `http://localhost:5173` and `http://127.0.0.1:5173` by default. Provide multiple additional origins as a comma-separated list without paths:

```env
CORS_ORIGINS=https://survey.example.com,http://localhost:4173
```

In the standard Docker workflow, the browser calls `/api` on the same origin and Nginx forwards the request to the backend, so no additional CORS configuration is required. CORS must be configured when a browser calls the backend directly from another origin.

## Tests and checks

Install dependencies with `npm ci` before running the checks for the first time.

```bash
npm test
npm run lint
npm run build
npm run format:check
```

Run one workspace test suite with:

```bash
npm test --workspace @mini-survey/backend
npm test --workspace @mini-survey/frontend
```

## API

### `GET /questions`

Returns between three and five `{ id, text }` objects with `200 OK`.

### `POST /answers`

Accepts JSON in the following form:

```json
{
  "answers": [
    { "questionId": "name", "value": "Anna" },
    { "questionId": "occupation", "value": "Developer" },
    { "questionId": "development-experience", "value": "Two years" },
    { "questionId": "course-expectations", "value": "New knowledge" }
  ]
}
```

A successful submission must contain exactly one non-empty answer for every existing question. The success status is `201 Created` with no response body. Errors use `{ "error": "Description" }` with status `400`, `413`, or `415`.

## Data storage

Submissions are stored only in an array in the backend process memory. The application uses neither a database nor a Docker volume. Stopping or restarting the backend, including recreating or restarting its container, permanently clears all previous submissions. This is expected behavior for the current educational version of the application.
