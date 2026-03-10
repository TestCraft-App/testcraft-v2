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
| `settings-store` | Framework, language, POM, AI provider/model/key, prompt context |
| `auth-store` | Google OAuth user, token, daily usage, sign-in/out |
| `page-store` | Page metadata (reserved for future use) |

`ideas-store` and `code-store` are created via `generation-store-factory.ts` — shared factory with 10-entry cap, navigation, streaming state, and `streamingIndex` to prevent content mixing during generation.

### AI Integration

- `src/lib/ai-provider.ts` — Multi-provider SSE streaming (OpenAI, Anthropic, Google, proxy)
- `src/lib/prompt-builder.ts` — Prompt builders for ideas, automation, accessibility; all accept optional `context` param
- `src/components/ContextInput.tsx` — Collapsible "Additional Context" textarea (shared across Ideas, Code, A11y tabs); stored as `promptContext` in settings store
- `src/hooks/useAIGenerate.ts` — Parameterized hook; auto-determines direct vs proxy mode based on API key + auth state

### Free Tier (Google OAuth)

- Users can sign in with Google for 10 free generations/day using `gpt-4o-mini` via the v2 API proxy
- `src/stores/auth-store.ts` — Google OAuth state: sign-in via `chrome.identity.launchWebAuthFlow()`, token persistence, usage tracking
- `src/entrypoints/background.ts` — Handles `GOOGLE_SIGN_IN` action: builds OAuth URL, launches auth flow, parses JWT
- Generation mode auto-determined in `useAIGenerate`: has API key → direct, no key + signed in → proxy, neither → error
- Settings tab shows Account section (sign-in/out, usage bar), model locked to `gpt-4o-mini` for free tier
- v2 API proxy at `API_V2_URL` (in `constants.ts`) validates tokens, tracks usage in Firestore, enforces daily limits

### Generation History

Each feature tab maintains up to 10 generation entries. `GenerationHistory.tsx` renders `◀ Gen N of M ▶` navigation with an editable element label. `streamingIndex` ensures streamed content always goes to the correct entry even if the user navigates away.

### Content Script

`src/entrypoints/content.ts` handles:
- Element picking (hover highlight, click capture, HTML extraction)
- axe-core accessibility scanning (full page, triggered by `RUN_AXE` message)

### Testing

- **248 tests** across 26 files, all passing
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

### Starting a Session

Every session must start from a clean branch off `main`:

```bash
cd testcraft-v2
git checkout main && git pull origin main
git checkout -b <branch-name>    # e.g. feature/selector-suggestions, docs/update-roadmap
```

If running via `--worktree`, the worktree creates an isolated branch automatically. Run `npm install` in the worktree before tests or builds (fresh copy without `node_modules`).

If running from the parent `extension/` folder (not a git repo), always `cd` into `testcraft-v2/` first and create the branch manually as shown above.

### End-of-Session Flow

Before finishing a session, always:

1. `npm test` — all tests must pass
2. `npm run build` — build must succeed
3. **Update documentation** (mandatory — include in the same commit):
   - `README.md` — update Roadmap table (stage status), test count, project structure if new files added
   - `docs/features.md` — add/update feature section for any new or changed feature, update ToC, update "Last updated" line
   - `CLAUDE.md` — update test count, store descriptions, architecture notes if relevant
   - Auto-memory (`MEMORY.md`) — update phase progress, test stats, key architecture notes
4. Commit all changes (code + docs) with a descriptive message
5. `git push -u origin <branch>`
6. `gh pr create` targeting `main` with Summary + Test plan sections
7. Share the PR URL with the user

## Security Rules

**Before merging any PR, verify ALL of the following:**

1. **No secrets in code** — Never commit API keys, tokens, passwords, or credentials. Check for hardcoded strings starting with `sk-`, `api-`, `key-`, bearer tokens, or anything that looks like a secret. `.env` files must stay gitignored.
2. **No secrets in URLs** — Don't put API keys or tokens in URL query strings (except Google Gemini API which requires it by design).
3. **No `eval()`, `Function()`, or `new Function()`** — No dynamic code execution.
4. **No `innerHTML` or `dangerouslySetInnerHTML`** — Use React's JSX rendering. If raw HTML is absolutely needed, sanitize with DOMPurify first.
5. **No unvalidated user input in API calls** — Sanitize/validate before sending to external services.
6. **HTTPS only** — All external API endpoints must use `https://`.
7. **Error messages must not leak internals** — Don't expose stack traces, file paths, or secrets in error messages shown to users or returned from APIs.
8. **Chrome storage** — API keys are stored in `chrome.storage.local` (plaintext). This is a known trade-off for UX. Never log or expose stored keys.
9. **Auth tokens** — Google ID tokens are validated server-side. The extension decodes (not verifies) JWTs for display only — this is by design.
10. **Dependencies** — Review new dependencies for known vulnerabilities before adding. Prefer well-maintained packages.

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
