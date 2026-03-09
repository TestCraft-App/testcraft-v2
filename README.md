# TestCraft v2

The AI testing companion that lives in your browser. Pick elements, scan pages, generate tests, audit accessibility — from a Chrome side panel that stays with you as you browse.

## Detailed Documentation

See [`docs/features.md`](docs/features.md) for in-depth documentation on every feature: what the user sees, how it works internally, data flows, message passing, and where every piece of code lives.

## How It Works

TestCraft v2 is a Chrome extension built with WXT + React + TypeScript. It runs as a **side panel** alongside any website you're testing.

### Core User Flow

```
1. Open the side panel (click extension icon or popup)
2. The page scanner automatically detects interactive elements
3. Pick a specific element by clicking "Pick Element" and clicking on the page
4. Use the Ideas tab to generate test ideas — results appear inline with checkboxes
5. Select ideas and click "Automate Selected" to switch to Code tab with auto-generation
6. Use the Code tab to generate automation code — results appear inline
7. Both tabs keep a history of up to 10 generations with navigation (◀ Gen 3 of 5 ▶)
8. Switch to the A11y tab anytime to scan the full page for accessibility violations
```

### AI Provider Architecture

There are two modes for AI features:

**BYOK (Bring Your Own Key) — Default**

The extension calls AI provider APIs **directly from the browser**. No backend, no data going through a proxy. Supported providers:

| Provider | Endpoint | Models |
|----------|----------|--------|
| OpenAI | `api.openai.com/v1/chat/completions` | gpt-5.4, gpt-5-mini, gpt-5-nano, gpt-4.1, gpt-4o, gpt-4o-mini, o4-mini |
| Anthropic | `api.anthropic.com/v1/messages` | claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5-20251001 |
| Google | `generativelanguage.googleapis.com` | gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash |

You enter your API key in Settings. Requests go directly from the side panel to the provider. Your key stays in `chrome.storage.local` and never leaves your browser.

**Free Tier (Google Sign-In)**

No API key? No problem. Sign in with Google in the Settings tab to get **10 free AI generations per day** using `gpt-4o-mini`. Requests route through the TestCraft v2 API proxy, which validates your Google OAuth token and tracks daily usage in Firestore.

- Sign in/out from the **Account** section at the top of Settings
- Usage bar shows `N / 10 used today`
- Model dropdown locks to `gpt-4o-mini` while on free tier
- Add your own API key anytime to unlock all providers and models with no limits
- Token expires after 1 hour — re-sign-in is seamless if still logged into Google

### Accessibility Checks (A11y Tab)

Accessibility has its own **dedicated tab** — no element picking needed. Click "Run Accessibility Check" to scan the entire page.

The approach is **hybrid**:
- **axe-core** runs deterministically in the content script — no AI needed, no API calls. It scans the full page and finds WCAG violations with rule IDs, impact levels, and help text.
- **"Analyze" per violation** — sends the violation details to the AI for a structured, ticket-ready report (description, who is affected, WCAG criteria, priority, acceptance criteria, implementation notes). Results are collapsible and persist across tab navigation.

This means the base accessibility scan works with zero configuration, even without an API key.

### What Does NOT Hit Any API

- Page scanning (DOM traversal, element classification)
- Element picking (hover highlight, click capture)
- axe-core accessibility scanning
- All UI rendering, tab navigation, settings storage

### What DOES Hit an API (requires an API key)

- "Generate Ideas" button
- "Automate Tests" button
- "Analyze" button on accessibility violations

All AI calls use SSE streaming — results appear token by token as the AI generates them.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Extension framework | WXT 0.20.18 |
| UI | React 19 + TypeScript |
| Bundler | Vite (via WXT) |
| Styling | Tailwind CSS v3 + PostCSS (dark mode via `class` strategy) |
| State management | Zustand 5 |
| Accessibility engine | axe-core (bundled, runs locally) |
| Testing | Vitest 4 + React Testing Library + jsdom |

## Project Structure

```
testcraft-v2/
├── src/
│   ├── entrypoints/
│   │   ├── sidepanel/           # Main React app (side panel)
│   │   │   ├── App.tsx          # Root component with tab navigation
│   │   │   ├── App.test.tsx     # App integration tests
│   │   │   ├── index.html       # Side panel HTML entry
│   │   │   └── main.tsx         # React root mount
│   │   ├── popup/               # Minimal popup that opens the side panel
│   │   │   ├── Popup.tsx
│   │   │   ├── index.html
│   │   │   └── main.tsx
│   │   ├── background.ts        # Service worker (side panel behavior, screenshot capture)
│   │   └── content.ts           # Content script (picker, scanner, axe, highlight)
│   │
│   ├── components/
│   │   ├── TabBar.tsx            # Ideas/Code/A11y/Settings tab navigation
│   │   ├── IdeasTab.tsx          # Pick element, generate ideas, see results inline, automate selected
│   │   ├── CodeTab.tsx           # Pick element, automate tests, see code inline, pending automation
│   │   ├── AccessibilityTab.tsx  # Page-wide a11y scan trigger + results
│   │   ├── SettingsTab.tsx       # Settings UI (3 card sections, theme toggle, dark mode)
│   │   ├── ElementPreview.tsx    # Picked element display (tag, text, HTML, screenshot)
│   │   ├── GenerationHistory.tsx # ◀ Gen 3 of 5 ▶ navigation + editable element labels
│   │   ├── PageOverview.tsx      # Scanned elements grouped by category (reserved)
│   │   ├── TestIdeasResult.tsx   # Streamed ideas with checkboxes, inline edit, copy
│   │   ├── CodeResult.tsx        # Streamed code with copy button
│   │   ├── AccessibilityResult.tsx # axe-core violations + AI explain per violation
│   │   ├── ErrorBoundary.tsx     # App-level error boundary
│   │   └── *.test.tsx            # Component tests (co-located)
│   │
│   ├── stores/
│   │   ├── element-store.ts      # Picked element state, synced to chrome.storage
│   │   ├── page-store.ts         # Page scan inventory
│   │   ├── settings-store.ts     # AI provider, framework, language preferences
│   │   ├── accessibility-store.ts # A11y scan results, AI analysis persistence
│   │   ├── generation-store-factory.ts # Shared factory for ideas/code generation stores
│   │   ├── ideas-store.ts        # Ideas generation history (10-entry cap, idea selection)
│   │   ├── code-store.ts         # Code generation history (10-entry cap)
│   │   └── *.test.ts             # Store tests (co-located)
│   │
│   ├── hooks/
│   │   ├── useAIGenerate.ts      # Hook that wires settings → AI provider → generation store
│   │   └── useElementPicker.ts   # Reusable element picker hook (shared by Ideas + Code tabs)
│   │
│   ├── lib/
│   │   ├── ai-provider.ts        # Multi-provider abstraction (OpenAI, Anthropic, Google)
│   │   ├── prompt-builder.ts     # Prompt construction for ideas, automation, a11y
│   │   ├── page-scanner.ts       # DOM scanner (classifies interactive elements)
│   │   ├── element-picker.ts     # Hover highlight + click capture logic
│   │   ├── parse-element.ts      # HTML → tag/text/attributes parser
│   │   ├── accessibility.ts      # axe-core result mapper, groupByImpact
│   │   ├── element-label.ts       # Derives human-readable labels from picked elements
│   │   ├── constants.ts          # Action names, storage keys
│   │   ├── types.ts              # Shared TypeScript interfaces (PickedElement, GenerationEntry)
│   │   └── *.test.ts             # Unit tests (co-located)
│   │
│   ├── test/
│   │   ├── chrome-mock.ts        # Shared mock for chrome.* APIs
│   │   ├── setup.ts              # Global test setup (chrome mock + jest-dom)
│   │   └── fixtures/             # AI response fixtures (for future E2E tests)
│   │
│   ├── styles.css                # Tailwind CSS directives
│   └── assets/                   # (reserved for future assets)
│
├── public/
│   └── icon/                     # Extension icons (16, 48, 128px)
│
├── e2e/
│   └── fixtures/
│       └── test-page.html        # Static HTML fixture for E2E tests
│
├── wxt.config.ts                 # WXT configuration (manifest, permissions)
├── vitest.config.ts              # Vitest configuration (jsdom, setup file)
├── tailwind.config.ts            # Tailwind config (content paths, darkMode: 'class')
├── postcss.config.cjs            # PostCSS plugins (Tailwind + Autoprefixer)
├── tsconfig.json                 # TypeScript config (extends WXT-generated)
├── package.json
└── .gitignore
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
cd testcraft-v2
npm install
```

### Development

```bash
npm run dev       # Start WXT dev server with HMR
```

This opens a Chrome instance with the extension loaded. Changes hot-reload.

### Build

```bash
npm run build     # Production build → .output/chrome-mv3/
```

To load manually:
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `.output/chrome-mv3/` directory

### Test

```bash
npm test              # Run all 200 tests (unit + component + integration)
npm run test:watch    # Watch mode during development
npm run test:coverage # Coverage report
```

### Test Structure

Tests live next to the code they test:

```
src/lib/ai-provider.ts          # source
src/lib/ai-provider.test.ts     # test

src/components/IdeasTab.tsx       # source
src/components/IdeasTab.test.tsx  # test
```

Chrome APIs are mocked globally via `src/test/chrome-mock.ts`. The mock provides `chrome.storage.local`, `chrome.runtime`, `chrome.tabs`, and `chrome.sidePanel` with `vi.fn()` implementations.

## Configuration (Settings Tab)

The Settings tab is organized into four card sections with icons:

**Account** — Sign in with Google for free AI features. Shows user avatar, name, email, usage bar ("N / 10 used today"), and Sign Out button when signed in.

**AI Configuration** — Provider, API key (with helper text), and model selection. Provider and model dropdowns lock when using free tier (no API key + signed in).

**Test Configuration** — Framework, language, and Page Object Model toggle switch.

**Preferences** — Theme selector (Light / Dark / System) as a segmented control.

| Setting | Options | Default |
|---------|---------|---------|
| AI Provider | OpenAI, Anthropic, Google | OpenAI |
| API Key | User's own key | (empty) |
| Model | Provider-specific list | gpt-4.1 / claude-sonnet-4 / gemini-2.5-flash |
| Test Framework | Playwright, Cypress, Selenium | Playwright |
| Language | JS, TS, Java, C#, Python | TypeScript |
| Use POM | Toggle switch | Off |
| Theme | Light, Dark, System | System |

Language options are gated by framework: Cypress only supports JavaScript and TypeScript.

Settings persist in `chrome.storage.local` and survive browser restarts.

### Dark Mode

TestCraft supports full dark mode across all components. Tailwind's `darkMode: 'class'` strategy is used — `App.tsx` applies the `dark` class to `<html>` based on the `theme` setting. When set to "System", a `matchMedia('prefers-color-scheme: dark')` listener dynamically toggles the class to follow the OS preference. All components use Tailwind `dark:` variants for their color values.

## Data Flow

```
                     ┌─────────────┐
                     │  Side Panel  │
                     │  (React App) │
                     └──────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
         Pick Element    Generate       A11y Tab
         (Ideas/Code)   (Ideas/Code)   (A11y tab)
              │             │             │
              v             v             v
     ┌────────────┐  ┌───────────┐  ┌──────────┐
     │  Content    │  │ AI Provider│  │ axe-core  │
     │  Script     │  │ (direct   │  │ (content  │
     │  (picker)   │  │  fetch)   │  │  script)  │
     └─────┬──────┘  └─────┬─────┘  └─────┬────┘
           │               │               │
           v               v               v
     chrome.storage   SSE stream      Violations
     + message pass   inline in tab   to A11y tab
```

## Roadmap & Status

### Phase 1 — Foundation + Core (MVP)

Ship a working v2 that's better than v1 in every way.

| Stage | Description | Status |
|-------|-------------|--------|
| 1.1 | Project scaffold, side panel shell, tabbed navigation | Done |
| 1.2 | Element picker (hover highlight, click capture, preview) | Done |
| 1.3 | Page scanner (auto-detect interactive elements, grouped list) | Done |
| 1.4 | Settings UI + multi-provider AI (OpenAI, Anthropic, Google) | Done |
| 1.5 | Test idea generation (streaming, categories, checkboxes, copy) | Done |
| 1.6 | Test code generation (framework/language-specific, POM, copy) | Done |
| 1.7 | Accessibility check (axe-core + AI explain & fix) | Done |
| 1.8 | Polish, error boundary, E2E fixture page | Done |

| 1.9 | Free tier with Google OAuth (10/day gpt-4o-mini, auth store, proxy integration) | Done |

**228 tests across 25 files. Build: ~911 KB (includes axe-core bundled in content script).**

### Phase 2 — Workflow Features

What makes testers come back every day.

| Stage | Description | Status |
|-------|-------------|--------|
| 2.1 | Flow recording — capture user interactions, AI generates test scripts | Pending |
| 2.2 | Test data generator — detect form fields, AI generates data sets, auto-fill | Pending |
| 2.3 | Exploratory testing sessions — timed sessions, auto-logging, AI reports | Pending |

### Phase 3 — Persistence & Collaboration

What makes teams pay.

| Stage | Description | Status |
|-------|-------------|--------|
| 3.1 | Project workspaces — save tests/ideas/reports per project, history | Pending |
| 3.2 | Custom prompt templates — team conventions, share/import/export | Pending |
| 3.3 | GitHub integration — export generated tests to a PR | Pending |
| 3.4 | Visual snapshot comparison — baseline vs current, pixel diff, AI describe | Pending |

### Phase 4 — Monetization

| Tier | What's included |
|------|-----------------|
| Free | Page scanner, element picker, 10 AI generations/day (Google sign-in, gpt-4o-mini), unlimited BYOK, axe-core a11y, 5-step flow recording |
| Premium ($9-15/mo) | Unlimited proxy AI, full flow recording, exploratory sessions, visual snapshots, workspaces, custom templates, GitHub integration |
| Team (TBD) | Shared workspaces, shared templates, admin controls, usage analytics |

## Ideas & Improvements

A scratchpad for future enhancements that aren't tied to a specific phase yet.

- **Per-feature model defaults**: Fix smaller/faster models for lightweight tasks (e.g. accessibility analysis → fast model) and reserve capable models for complex generation (full test suites). Reduces cost and latency without sacrificing quality where it matters.
- **Session-only API key storage**: Opt-in setting to use `chrome.storage.session` instead of `chrome.storage.local` for API keys. Keys would be cleared when the browser closes, improving security for users who prefer it. Default stays as persistent storage to reduce friction.

## Relation to v1

This is a full rewrite. The v1 extension (`test-craft-app-v1/`) is vanilla JS with no build system, using popup windows for results and routing all AI through the Flask API proxy. v2 replaces that with:

- Side panel instead of popups
- Direct BYOK AI calls instead of mandatory proxy
- Multi-provider support (v1 was OpenAI-only)
- axe-core for deterministic accessibility checks (v1 was AI-only)
- TypeScript, React, Zustand, Tailwind, Vitest
- 200 tests covering all features
