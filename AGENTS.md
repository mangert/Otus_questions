# Repository Guidelines

## Project Overview

Mini Survey is a private npm-workspaces monorepo built with Node.js 22 and
TypeScript. The backend is an Express API, the frontend is a React/Vite single
page application, and `shared` contains the API types used by both. In the
container workflow, Nginx serves the frontend and proxies `/api/*` to the
backend.

Submissions are intentionally stored only in backend process memory. Restarting
the backend clears all submitted data; do not describe this storage as
persistent.

## Project Structure

- `backend/src/` — Express app, routes, configuration, validation, lifecycle,
  questions, and the in-memory submission store.
- `backend/tests/` — backend unit and Supertest API tests.
- `frontend/src/` — React components, the typed API client, entry point, and
  plain CSS styles.
- `frontend/tests/` — API-client and React Testing Library tests plus test
  setup.
- `shared/src/` — TypeScript request, response, error, and domain contracts.
- `docs/` — audits and supporting project documentation.
- `API_CONTRACT.md` — the public HTTP API behavior.
- `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, and
  `frontend/nginx.conf` — the container build and runtime configuration.
- `mini-survey-*.tar` — prebuilt Docker image archives tracked with Git LFS.
- `start-docker.sh` — validates and loads the archives, then starts Compose
  without rebuilding.

Generated `dist/`, `coverage/`, caches, logs, environment files, and
`node_modules/` are ignored and must not be committed. The Git LFS Docker
archives are the deliberate exception for distributable generated artifacts.

## Setup, Build, Test, and Development Commands

Run commands from the repository root unless a command says otherwise.

- `npm ci` — install the exact dependencies from `package-lock.json` for all
  workspaces.
- `npm run dev` — run backend and frontend together; defaults are
  `http://localhost:3000` and `http://localhost:5173`.
- `npm test` — run all configured Vitest suites once.
- `npm run lint` — lint JavaScript, TypeScript, and TSX with ESLint.
- `npm run build` — build all workspaces that define a build script.
- `npm run format:check` — check repository formatting with Prettier.
- `npm run format` — rewrite supported files with Prettier; use only when
  formatting changes are intended.
- `npm test --workspace @mini-survey/backend` — run only backend tests.
- `npm test --workspace @mini-survey/frontend` — run only frontend tests.

Container commands:

- `docker compose up --build --detach` — build images from source and start the
  application.
- `./start-docker.sh` — use the prebuilt Git LFS image archives and start with
  `--no-build`.
- `docker compose down` — stop and remove the application containers and
  network.

Do not add a documented command unless it runs successfully from a clean
checkout with its stated prerequisites.

## Coding Style and Naming

- Use TypeScript in strict mode. Preserve `noUncheckedIndexedAccess`, unused
  code checks, and existing type safety; do not introduce `any` as a shortcut.
- The repository uses ESM. Follow the existing import style, including type-only
  imports and `.js` specifiers where required by NodeNext backend output.
- Use two-space indentation, single quotes, trailing commas, an 80-column print
  width, and LF line endings as enforced by Prettier.
- Use `camelCase` for variables and functions, `PascalCase` for React components,
  classes, and interfaces, and descriptive kebab-case names where a new
  non-code file needs them.
- Keep modules focused. Put cross-workspace API contracts in
  `@mini-survey/shared` instead of duplicating structural types.
- Start source and configuration files with a one-line purpose comment. Add a
  short description to each main function or component and describe parameters
  only when their purpose is not clear. Do not comment internal logic line by
  line.
- Keep the frontend on plain CSS unless the project requirements explicitly
  change; do not introduce a UI or CSS framework for a small styling change.
- Preserve accessible labels, focus states, live error messages, and disabled
  submission behavior when changing the form.

## API and Configuration Conventions

- Backend routes are `GET /questions` and `POST /answers`. Docker clients reach
  them through the Nginx `/api` prefix.
- Update `shared/src/index.ts`, `API_CONTRACT.md`, backend validation, the
  frontend client, and relevant tests together when the public API changes.
- `POST /answers` accepts JSON only, has a 32 KiB body limit, and must not store
  rejected submissions.
- `PORT` and `CORS_ORIGINS` are backend runtime settings.
  `CORS_ORIGINS` is a comma-separated allowlist; local Vite origins are the
  fallback.
- `VITE_API_URL` is embedded in the frontend at dev-server startup/build time.
  Changing it for an existing production bundle requires rebuilding the
  frontend image.
- The standard Docker flow uses `VITE_API_URL=/api` and same-origin proxying, so
  it does not require browser CORS access to the internal backend service.
- Never commit `.env` files, credentials, tokens, or other secrets. Keep safe
  examples in `.env.example`.

## Testing Guidelines

Add or update tests with every behavior change and bug fix. Name test files
`*.test.ts` or `*.test.tsx` and test observable behavior rather than private
implementation details.

- Use Vitest for all suites.
- Use Supertest for Express route behavior without binding a public port.
- Use React Testing Library and `user-event` for UI behavior and accessibility.
- Keep tests fast and deterministic. Reset the in-memory submission store and
  restore mocks between tests whenever shared state is involved.
- Cover successful behavior and meaningful failure paths, including malformed
  input, unsupported media types, oversized bodies, network failures, retry
  actions, and shutdown behavior when relevant.
- Run the narrow affected suite while iterating. Before handoff, run
  `npm test`, `npm run lint`, `npm run build`, and `npm run format:check` in
  proportion to the change.

No coverage threshold is currently configured. Do not claim one or add a
coverage requirement without an explicit project decision.

## Docker Image Archive Maintenance

The prebuilt archives and `start-docker.sh` form one versioned unit. When a
Dockerfile, production dependency, Nginx configuration, or application build
changes the images:

1. rebuild both required images with their Compose tags;
2. save them as `mini-survey-backend.tar` and `mini-survey-frontend.tar`;
3. update the expected byte sizes and SHA-256 values in `start-docker.sh`;
4. verify `git lfs fsck`, TAR readability, and `docker image load`;
5. run Bash syntax checking, ShellCheck, and a functional Compose startup;
6. stop the containers after verification.

Do not add the TAR files to a Docker build context. Keep their Git LFS rules in
`.gitattributes` and their `.dockerignore` exclusion intact.

## Commit and Pull Request Guidelines

Use concise imperative commit subjects, following the existing history, for
example `Validate packaged Docker images`. Keep unrelated changes in separate
commits and do not stage untracked user files without confirming they belong to
the task.

Pull requests should explain the purpose, summarize the approach, list the exact
verification performed, and link relevant issues. Include screenshots for
visible UI changes and sample requests or responses for API changes. Before
requesting review, ensure the documented checks pass and update README or API
documentation whenever user-facing setup or behavior changes.
