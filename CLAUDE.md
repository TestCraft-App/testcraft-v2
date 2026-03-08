# CLAUDE.md — TestCraft v2

## Overview

TestCraft v2 is a Chrome extension (Manifest V3) that helps testers generate test ideas, automation scripts, and accessibility reports from selected UI elements using AI (OpenAI, Anthropic, Google). Built with WXT + React + TypeScript.

## Tech Stack

- **WXT 0.20.18** + `@wxt-dev/module-react` — Chrome extension framework
- **React 19** + **TypeScript 5** — UI
- **Tailwind CSS v3** — Styling (v4 blocked by Windows Application Control)
- **Zustand 5** — State management
- **axe-core** — Accessibility scanning (runs in content script)
- **Vitest 4** + React Testing Library + jsdom — Testing
- **PostCSS** via `postcss.config.cjs` for Tailwind

## Commands

```bash
npm run dev          # WXT dev mode with HMR
npm run build        # Production build → .output/chrome-mv3/
npm run test         # Vitest run (all tests)
npm run test:watch   # Vitest watch mode
```

Load the extension: `chrome://extensions/` → Developer Mode → Load unpacked → select `.output/chrome-mv3/`

## Architecture

### Tab Structure: `Ideas | Code | A11y | Settings`

Each feature tab (Ideas, Code) is self-contained: pick element → generate → see results inline. No tab switching needed during a workflow.

**Cross-tab flow**: Ideas tab → select ideas → "Automate Selected" → switches to Code tab with `pendingAutomation` state in App.tsx → auto-generates code.

### Key Directories

```
src/
├── entrypoints/          # WXT entry points
│   ├── background.ts     # Screenshot capture via OffscreenCanvas
│   ├── content.ts        # Element picker + axe-core scanning
│   ├── popup/            # Minimal popup (opens sidepanel)
│   └── sidepanel/        # Main UI (App.tsx)
├── components/           # React components (co-located tests)
├── hooks/                # useAIGenerate, useElementPicker
├── stores/               # Zustand stores
├── lib/                  # Utilities (AI provider, prompts, types)
├── styles.css            # Tailwind directives
└── test/                 # Test helpers (chrome-mock.ts)
```

### Stores (Zustand)

| Store | Purpose |
|-------|---------|
| `element-store` | Picked element state, shared across tabs |
| `ideas-store` | Ideas generation history + idea selection |
| `code-store` | Code generation history |
| `accessibility-store` | A11y violations, explanations, scan state |
| `settings-store` | Framework, language, POM, AI provider/model/key |
| `page-store` | Page metadata (reserved for future use) |

`ideas-store` and `code-store` are created via `generation-store-factory.ts` — shared factory with 10-entry cap, navigation, streaming state, and `streamingIndex` to prevent content mixing during generation.

### AI Integration

- `src/lib/ai-provider.ts` — Multi-provider SSE streaming (OpenAI, Anthropic, Google)
- `src/lib/prompt-builder.ts` — Prompt builders for ideas, automation, accessibility
- `src/hooks/useAIGenerate.ts` — Parameterized hook accepting store actions (not coupled to a specific store)

### Generation History

Each feature tab maintains up to 10 generation entries. `GenerationHistory.tsx` renders `◀ Gen N of M ▶` navigation with an editable element label. `streamingIndex` ensures streamed content always goes to the correct entry even if the user navigates away.

### Content Script

`src/entrypoints/content.ts` handles:
- Element picking (hover highlight, click capture, HTML extraction)
- axe-core accessibility scanning (full page, triggered by `RUN_AXE` message)

### Testing

- **198 tests** across 24 files, all passing
- Tests co-located with components (`*.test.tsx` / `*.test.ts`)
- Chrome APIs mocked in `src/test/chrome-mock.ts` with `resetChromeStore()` / `setChromeStoreData()`
- `navigator.clipboard` mock: use `Object.defineProperty` (read-only in jsdom)

## Code Style

- TypeScript strict mode
- Prettier: single quotes, 4-space indent, trailing commas
- Co-locate tests with source files
- Props-driven components (not store-coupled) for testability
- Prefer `Edit` over `Write` for existing files

## Important Patterns

- **Element picker hook** (`useElementPicker.ts`): shared by IdeasTab and CodeTab
- **Store factory** (`generation-store-factory.ts`): creates stores with identical generation history logic; Ideas variant adds `toggleIdea` / `getSelectedIdeasText`
- **`streamingIndex`**: locks which entry receives streamed chunks — never use `currentIndex` for appending content
- **`pendingAutomation`**: App.tsx state for Ideas → Code cross-tab flow; CodeTab consumes via useEffect
- **`deriveElementLabel`** (`element-label.ts`): derives labels from element metadata (textContent > aria-label > placeholder > title > name > tag fallback)

## Development Workflow

### Worktree Sessions

Each Claude Code session runs via `--worktree`, giving it an isolated branch and working directory. Always run `npm install` in the worktree before running tests or builds (the worktree gets a fresh copy without `node_modules`).

### End-of-Session Flow

Before finishing a session, always:

1. `npm test` — all tests must pass
2. `npm run build` — build must succeed
3. Commit all changes with a descriptive message
4. `git push -u origin <branch>`
5. `gh pr create` targeting `main` with Summary + Test plan sections
6. Share the PR URL with the user

### Conflict Resolution

When a PR has conflicts because another PR was merged to `main` first:

```bash
git fetch origin main
git rebase origin/main
# resolve conflicts
git rebase --continue
git push --force-with-lease
```

- **Rebase, not merge** — keeps linear history on `main`
- **`--force-with-lease`** — safe force push (fails if someone else pushed)
- **`package-lock.json` conflicts** — accept `main`'s version, then re-run `npm install`
- **Complex conflicts** — ask the user before resolving
