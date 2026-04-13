# Contributing to Raydr

Thank you for your interest in contributing to Raydr. This document explains how to get involved, what we expect from contributions, and how the process works.

## Getting Started

### 1. Fork and Clone

```bash
git clone https://github.com/<your-username>/raydr.git
cd raydr
npm install
```

### 2. Set Up Your Environment

```bash
cp .env.example .env
```

Fill in your Supabase, GitHub OAuth, and Anthropic API credentials. See the [README](./README.md#environment-configuration) for the full list.

### 3. Run the Migrations

Run all SQL files in `supabase/` in order in your Supabase SQL Editor. See [Database Setup](./README.md#database-setup) for details.

### 4. Start Developing

```bash
npm run dev
```

Before submitting any changes, run the type checker:

```bash
npm run check
```

## What We're Looking For

### Good First Contributions

- Bug fixes with clear reproduction steps
- Improving existing UI components (accessibility, responsiveness)
- Adding missing TypeScript types
- Documentation improvements
- Writing tests (we don't have a test runner yet — proposing one is a valid contribution)

### Larger Contributions

If you're planning something significant (new feature, architectural change, new AI evaluation criteria), open an issue first to discuss the approach. This avoids wasted effort if the direction doesn't align with the project.

## How to Submit Changes

### 1. Create a Branch

```bash
git checkout -b your-branch-name
```

Use a descriptive branch name: `fix/login-redirect`, `feat/export-csv`, `docs/api-reference`.

### 2. Make Your Changes

Follow the conventions already in the codebase:

- **Svelte 5 runes**: Use `$state`, `$props`, `$derived` — not legacy `let` reactivity
- **TypeScript**: Type your functions and props. Don't use `any` unless interfacing with Supabase's generated types where it's unavoidable.
- **Tailwind CSS v4**: Styles go in utility classes. The design tokens are defined in `src/app.css`. Don't add a `tailwind.config` file.
- **Server-side mutations**: Use SvelteKit form actions, not client-side fetch to API routes (exception: GitHub OAuth which uses `+server.ts` routes)
- **Supabase queries**: Use the anon client for user-scoped reads. Use the service-role admin client (`supabase-admin.ts`) only for writes that bypass RLS (analyses, tokens, admin operations).

### 3. Keep Commits Focused

- One logical change per commit
- Write commit messages that explain *why*, not just *what*
- If you're fixing a bug, reference the issue number: `Fix login redirect loop (#42)`

### 4. Run Type Checking

```bash
npm run check
```

This must pass with zero errors before submitting.

### 5. Open a Pull Request

- Target the `main` branch
- Write a clear title (under 70 characters)
- In the description, explain:
  - What the change does
  - Why it's needed
  - How you tested it
  - Screenshots if it's a UI change

## Code Style

### General

- Don't add comments for self-explanatory code
- Don't add docstrings to every function — only where the behavior is non-obvious
- Don't add error handling for scenarios that can't happen
- Don't create abstractions for one-time operations

### File Organization

- Server-only code goes in `src/lib/server/`
- Shared UI components go in `src/lib/components/ui/`
- Layout components go in `src/lib/components/layout/`
- Types go in `src/lib/types.ts`
- Constants go in `src/lib/constants.ts`

### AI / Prompt Changes

If you're modifying the AI analysis pipeline (prompts, evaluation criteria, synthesis logic):

- Test with at least 2 different real repositories
- Show before/after examples of the AI output in your PR description
- Don't change XP ranges or caps without discussion

## Project Structure

```
src/lib/server/          # Server-side logic (AI, GitHub, Supabase)
src/lib/components/      # Svelte components (ui/ and layout/)
src/lib/types.ts         # Shared TypeScript types
src/routes/              # SvelteKit pages and form actions
supabase/                # SQL schema and migrations
```

See the [README](./README.md#-project-structure) for the full breakdown.

## Reporting Bugs

Open an issue with:

- What you expected to happen
- What actually happened
- Steps to reproduce
- Browser and OS (for frontend bugs)
- Any error messages from the browser console or server terminal

## Requesting Features

Open an issue describing:

- The problem you're trying to solve
- Your proposed solution (if you have one)
- Why this matters for the platform

## Questions

If you're unsure about something, open an issue and ask. There are no bad questions.

## License

By contributing to Raydr, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
