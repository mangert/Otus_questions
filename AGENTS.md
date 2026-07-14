# Repository Guidelines

## Project Structure & Module Organization

This repository is currently an empty project scaffold. As implementation is added, keep production code under `src/`, automated tests under `tests/`, and non-code resources under `assets/`. Mirror source paths in the test tree where practical; for example, tests for `src/parser.py` should live in `tests/test_parser.py`. Keep generated output in a dedicated directory such as `build/` or `dist/` and exclude it from version control.

## Build, Test, and Development Commands

No build system, dependency manifest, or test runner is configured yet. When introducing tooling, add the relevant configuration files at the repository root and update this section in the same change. Prefer a small, stable command set, for example:

- `make build` - produce distributable artifacts.
- `make test` - run the complete automated test suite.
- `make lint` - check formatting and static-analysis rules.

Do not document commands that cannot be run from a clean checkout.

## Coding Style & Naming Conventions

Follow the formatter and linter standard for the language selected by the project; commit their configuration so results are reproducible. Use spaces rather than tabs unless the ecosystem requires otherwise. Choose descriptive names: `snake_case` for Python files and functions, `camelCase` for JavaScript/TypeScript functions, and `PascalCase` for classes. Keep modules focused and avoid committing generated files or editor-specific settings.

## Testing Guidelines

Add tests with every behavior change and bug fix. Name tests after observable behavior, such as `test_rejects_empty_input`. Keep unit tests fast and deterministic; isolate network or filesystem dependencies behind fixtures or test doubles. Once a framework is selected, document the exact local command and any coverage threshold here.

## Commit & Pull Request Guidelines

There is no Git history from which to infer an existing convention. Use concise, imperative commit subjects, such as `Add input validation`, and keep unrelated changes separate. Pull requests should explain the purpose, summarize the approach, list verification performed, and link relevant issues. Include screenshots or sample output for user-visible changes. Before requesting review, ensure documented checks pass and update this guide whenever repository conventions change.
