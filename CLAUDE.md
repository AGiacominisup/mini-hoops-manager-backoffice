# Repository Instructions

Follow these rules for every change in this repository.

## Commit Messages

- Write every commit title in English.
- Use the Conventional Commits format: `type(scope): short imperative description`.
- Use one of these types when applicable: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `build`, `ci`, `style`, `perf`, `revert`.
- Keep the subject concise, lowercase, and without a trailing period.
- Describe what the commit does using the imperative mood.
- Example: `feat(auth): connect login form to backend API`.

## Source Structure

- Keep application source code inside `src/` and organize it by responsibility:
  - `src/components/`: reusable UI components.
  - `src/pages/`: route-level screens and page composition.
  - `src/utils/`: framework-independent helpers and utility functions.
- Keep API clients and API types in `src/api/` when they grow beyond a single module.
- Keep styles next to the component or page they belong to when they are not global.
- Do not place reusable components, pages, or utilities directly in the `src/` root.
- Prefer small, focused modules with one clear responsibility.

## Naming Conventions

- Use `kebab-case` for every source file and directory name.
- Examples: `login-page.tsx`, `product-logo.tsx`, `api-client.ts`, `format-date.ts`.
- Use `camelCase` for variables, constants, functions, methods, hooks, and object properties.
- Use `PascalCase` only for React component identifiers, classes, types, and interfaces, as required by React and TypeScript conventions.
- Use `UPPER_SNAKE_CASE` only for true immutable configuration constants.
- Name booleans with clear prefixes such as `is`, `has`, `can`, or `should`.
- Name event handlers with the `handle` prefix and callback props with the `on` prefix.

## Change Requirements

- Preserve these conventions when editing existing files.
- When touching a non-conforming module substantially, move or rename it to the required structure when this can be done without unrelated behavioral changes.
- Update every affected import after moving or renaming a file.
- Run the relevant build, lint, and tests before considering a change complete.