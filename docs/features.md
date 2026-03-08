# TestCraft v2 — Feature Documentation

This document describes every feature in TestCraft v2, what it does from a user perspective, how it works internally, and where the code lives.

Last updated: Settings tab redesign (card sections, dark mode, theme toggle)

---

## Table of Contents

1. [Side Panel Shell](#1-side-panel-shell)
2. [Element Picker](#2-element-picker)
3. [Page Scanner](#3-page-scanner)
4. [Settings & Multi-Provider AI](#4-settings--multi-provider-ai)
5. [Test Idea Generation](#5-test-idea-generation)
6. [Test Code Generation](#6-test-code-generation)
7. [Accessibility Check (A11y Tab)](#7-accessibility-check-a11y-tab)
8. [Error Handling](#8-error-handling)

---

## 1. Side Panel Shell

**What the user sees:**
A persistent side panel that opens alongside any website. It has four tabs at the top: **Ideas**, **Code**, **A11y**, and **Settings**. Clicking a tab switches the view. The panel stays open as you navigate between pages. Each feature tab (Ideas, Code) is self-contained: pick an element, generate, and see results — all in one place.

**How to open it:**
- Click the TestCraft extension icon — the side panel opens automatically (configured via `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })`).
- Alternatively, a small popup appears with an "Open Side Panel" button.

**Internal details:**
- The side panel is a full React app mounted at `src/entrypoints/sidepanel/`.
- Tab state is local React state (`useState<Tab>`) in `App.tsx` — not persisted. Closing and reopening the panel resets to the Ideas tab. Tabs: `ideas`, `code`, `accessibility`, `settings`.
- `App.tsx` also manages `pendingAutomation` state for the cross-tab "Automate Selected" flow (Ideas → Code).
- The popup at `src/entrypoints/popup/` is intentionally minimal. Its only job is to call `chrome.sidePanel.open()` and then `window.close()`.
- The background service worker (`src/entrypoints/background.ts`) sets `openPanelOnActionClick: true` so clicking the extension icon opens the side panel directly without showing the popup.

**Key files:**
- `src/entrypoints/sidepanel/App.tsx` — Root component, tab state, pendingAutomation state, layout
- `src/entrypoints/sidepanel/main.tsx` — React root mount
- `src/entrypoints/sidepanel/index.html` — HTML entry, loads Tailwind CSS
- `src/entrypoints/popup/Popup.tsx` — "Open Side Panel" button
- `src/entrypoints/background.ts` — Service worker setup
- `src/components/TabBar.tsx` — Tab bar with aria-selected for accessibility

**Tests:** `App.test.tsx` (7 tests), `TabBar.test.tsx` (5 tests)

---

## 2. Element Picker

**What the user sees:**
1. Click "Pick Element" in the Ideas or Code tab — the button turns red and says "Cancel Picking".
2. Move your mouse over the web page — elements highlight with an indigo outline as you hover.
3. Click an element — the highlight stops, and the element appears in the side panel with:
   - Tag name (e.g. `<button>`)
   - Text preview (first 80 characters)
   - Expandable HTML source (first 500 characters)
   - Screenshot of the element (if captured)
4. A "Clear" link removes the selected element.

**How picking works internally:**

```
User clicks "Pick Element"
    → useElementPicker hook sends START_PICKING message to content script via chrome.tabs.sendMessage
    → Content script activates event listeners (mouseover, mouseout, click) on the document
    → On hover: target element gets inline outline style
    → On click: event is prevented, element data is captured, ELEMENT_PICKED message sent
    → Side panel receives message via chrome.runtime.onMessage
    → Side panel sends CAPTURE_SCREENSHOT to background script with boundingRect
    → Background captures visible tab, crops to element bounds using OffscreenCanvas
    → Screenshot (data URL) attached to element, then stored in Zustand + chrome.storage.local
```

**Element data captured on click:**
- `outerHTML` — full HTML of the element
- `tagName` — lowercase tag name
- `textContent` — trimmed, first 500 chars
- `attributes` — all HTML attributes as key-value pairs
- `boundingRect` — x, y, width, height (relative to page, includes scroll offset)
- `pageUrl` — current page URL
- `pageTitle` — current page title

**Cancelling:** Clicking "Cancel Picking" sends STOP_PICKING, which removes all event listeners and restores the cursor.

**Storage persistence:** The picked element is saved to `chrome.storage.local` under the key `pickedElement`. When the side panel opens, `useElementStore.loadFromStorage()` restores it. This means you can pick an element, close the panel, reopen it, and the element is still there.

**Key files:**
- `src/lib/element-picker.ts` — The core picker logic (start/stop/highlight/click handlers)
- `src/lib/parse-element.ts` — Parses outerHTML into tag, text, attributes, truncated HTML
- `src/lib/types.ts` — `PickedElement` interface
- `src/stores/element-store.ts` — Zustand store with chrome.storage sync
- `src/components/ElementPreview.tsx` — Renders the picked element card
- `src/hooks/useElementPicker.ts` — Reusable hook: pick button, message listeners (shared by Ideas + Code tabs)
- `src/lib/element-label.ts` — Derives human-readable labels from picked elements (textContent > aria-label > placeholder > tag#id.class)
- `src/entrypoints/content.ts` — Receives START/STOP_PICKING messages

**Tests:** `parse-element.test.ts` (8), `element-store.test.ts` (7), `ElementPreview.test.tsx` (6), `useElementPicker.test.ts` (4), `element-label.test.ts` (9)

---

## 3. Page Scanner

**Current status:** The page scanner code is fully implemented and tested, but the **Page Overview section has been removed from the Main tab** as it was not useful in its current form (showed a raw HTML element map that took too much space). The scanner infrastructure (content script handler, page-scanner.ts, PageOverview component) remains available for future use (e.g. in a dedicated "Page Analysis" tab or as context for AI prompts).

**What it does internally:**

```
SCAN_PAGE message sent to content script
    → Content script runs scanPage(document)
    → scanPage queries DOM for interactive elements using CSS selectors
    → Each element is classified into a category and gets a best-effort unique selector
    → Inventory (elements + counts) returned via sendResponse
```

**What counts as "interactive":**
The scanner looks for these CSS selectors: `a[href]`, `button`, `[role="button"]`, `input:not([type="hidden"])`, `textarea`, `select`, `[role="link"]`, `[role="tab"]`, `[role="menuitem"]`, `[role="checkbox"]`, `[role="radio"]`, `[role="switch"]`, `[role="slider"]`, `[role="textbox"]`, `[role="combobox"]`, `[contenteditable="true"]`, `details > summary`, `video`, `audio`, `img[alt]`. Plus `form` elements are scanned separately.

**Element categories:** `form`, `button`, `link`, `input`, `select`, `media`, `other`

**Selector generation priority:** The scanner tries to generate a useful selector for each element in this order:
1. `#id` if the element has an id
2. `[data-testid="..."]` if it has a data-testid attribute
3. `tag[name="..."]` if it has a name
4. `tag[aria-label="..."]` if it has an aria-label
5. `input[type="..."]` for inputs with a type
6. Just the tag name as fallback

**Highlighting from the list:** When you click an element in PageOverview, it sends a HIGHLIGHT_ELEMENT message to the content script with the selector. The content script calls `document.querySelector(selector)`, applies an outline, and calls `scrollIntoView({ behavior: 'smooth', block: 'center' })`.

**Key files:**
- `src/lib/page-scanner.ts` — `scanPage()`, `isInteractiveElement()`, element classification
- `src/stores/page-store.ts` — Zustand store for page inventory
- `src/components/PageOverview.tsx` — Grouped element list UI
- `src/entrypoints/content.ts` — SCAN_PAGE and HIGHLIGHT_ELEMENT handlers

**Tests:** `page-scanner.test.ts` (18), `PageOverview.test.tsx` (5)

---

## 4. Settings & Multi-Provider AI

**What the user sees:**
The Settings tab is organized into **three card sections**, each with an icon header:

**AI Configuration** (brain icon)
- AI Provider dropdown (OpenAI, Anthropic, Google)
- API Key password input with helper text explaining where to get a key for the selected provider
- Model dropdown (provider-specific, changes when provider changes)

**Test Configuration** (code icon)
- Test Framework dropdown (Playwright, Cypress, Selenium)
- Language dropdown (JS, TS, Java, C#, Python — gated by framework)
- Page Object Model **toggle switch** (replaces the old checkbox)

**Preferences** (palette icon)
- **Theme selector** — a 3-way segmented control: Light / Dark / System

| Control | Type | Options |
|---------|------|---------|
| AI Provider | Dropdown | OpenAI, Anthropic, Google |
| API Key | Password input | User's key for the selected provider |
| Model | Dropdown | Provider-specific (changes when provider changes) |
| Test Framework | Dropdown | Playwright, Cypress, Selenium |
| Language | Dropdown | JS, TS, Java, C#, Python (gates based on framework) |
| Use Page Object Model | Toggle switch | On/Off |
| Theme | Segmented control | Light, Dark, System |

**Smart behaviors:**
- Changing the provider automatically selects that provider's default model (e.g. switching to Anthropic selects `claude-sonnet-4-20250514`, switching to OpenAI selects `gpt-4.1`).
- Changing to Cypress automatically limits language options to JavaScript and TypeScript. If you were on Python, it resets to JavaScript.
- All settings persist in `chrome.storage.local` under the key `settings`.

**Dark mode:**
- Tailwind's `darkMode: 'class'` strategy is configured in `tailwind.config.ts`.
- `App.tsx` reads the `theme` value from the settings store and applies the `dark` class to `<html>`.
- When set to "System", a `matchMedia('prefers-color-scheme: dark')` listener dynamically toggles the `dark` class to follow the OS preference. The listener is cleaned up on unmount or theme change.
- All components use Tailwind `dark:` variants for backgrounds, text, borders, and interactive states. This provides full dark mode coverage across every tab and component.

**AI Provider abstraction:**

The `createAIProvider(config)` function returns a unified interface:
```typescript
interface AIProvider {
    stream(prompt: string, systemMessage: string): AsyncIterable<string>;
}
```

Each provider builds the correct HTTP request format:

| Provider | Endpoint | Auth | Body format |
|----------|----------|------|-------------|
| OpenAI | `api.openai.com/v1/chat/completions` | `Authorization: Bearer <key>` | `{ model, stream: true, messages: [...] }` |
| Anthropic | `api.anthropic.com/v1/messages` | `x-api-key: <key>` | `{ model, max_tokens, stream: true, system, messages: [...] }` |
| Google | `googleapis.com/.../model:streamGenerateContent` | `?key=<key>` in URL | `{ system_instruction, contents: [...] }` |

All providers use **SSE (Server-Sent Events) streaming**. The `parseSSEStream()` function reads the response body as a stream, splits on `\n`, extracts `data: ` lines, and yields text chunks through an async iterator. Each provider has its own `extractContent` function since the SSE JSON format differs.

**Error handling:**
- 401 → "Invalid API key. Please check your settings."
- 429 → "Rate limit exceeded. Please wait and try again."
- Other → "AI provider error (status)"

**BYOK vs Proxy:**
By default, `useProxy` is `false` and all calls go directly from the browser to the provider. The proxy path through `https://api.testcraft.app` exists in code but is not exposed in the Settings UI. It would be used for a future managed tier where users don't need their own API key.

**Key files:**
- `src/lib/ai-provider.ts` — Provider factory, SSE parser, error class
- `src/stores/settings-store.ts` — Settings state + chrome.storage sync
- `src/components/SettingsTab.tsx` — Settings form UI
- `src/hooks/useAIGenerate.ts` — Hook that connects settings → provider → results store

**Tests:** `ai-provider.test.ts` (12), `settings-store.test.ts` (7), `SettingsTab.test.tsx` (8)

---

## 5. Test Idea Generation

**What the user sees:**
1. In the **Ideas tab**, pick an element (or have one already picked).
2. Click "Generate Ideas" — results stream in inline, below the button.
3. A loading spinner appears, then test ideas stream in organized by category:

```
POSITIVE TESTS
  [x] Verify the Sign In button submits the form with valid credentials
  [ ] Verify successful login redirects to the dashboard

NEGATIVE TESTS
  [ ] Verify error message appears with invalid credentials
  [ ] Verify button is disabled during form submission
```

4. Each idea has a **checkbox** — select the ones you want.
5. A **counter** shows "2 selected" when ideas are checked.
6. **Copy** button copies selected ideas (or all content if none selected) to clipboard.
7. **Double-click** any idea to edit its text inline. Press Enter or click away to save.
8. The "Streaming..." indicator shows while the AI is still generating.
9. A **generation history** bar shows "◀ Gen 3 of 5 ▶" with an editable element label underneath. Navigate between past generations without losing them (capped at 10).
10. When ideas are selected, an **"Automate Selected (N)"** button appears. Clicking it switches to the Code tab and auto-generates automation code for those ideas.

**How it works internally:**

```
User clicks "Generate Ideas"
    → IdeasTab builds prompt via buildTestIdeasPrompt(element, pageContext)
    → Calls generate(prompt, systemMessage, label, pageUrl) from useAIGenerate hook
    → Ideas store creates a new GenerationEntry, streaming starts
    → createAIProvider called with current settings
    → provider.stream() yields text chunks
    → Each chunk appended to current entry's content in ideas store
    → TestIdeasResult component re-renders, parseTestIdeas() splits content into categories
    → When stream ends, isStreaming set to false
    → GenerationHistory shows "Gen N of M" with editable element label
```

**The prompt includes:**
- Page title and URL for context
- Full element outerHTML
- Element tag, text content, attributes
- Instructions to organize ideas into: Positive, Negative, Boundary, Accessibility, Visual/UX
- Request for numbered, actionable descriptions

**Parsing streamed output:**
`parseTestIdeas(text)` scans the streamed text line by line looking for:
- **Category headers** — lines with `**bold text**` or `## heading` syntax
- **Ideas** — lines starting with `1.`, `-`, or `*` under a category

This means results render progressively as the AI streams — categories and ideas appear as they come in.

**Key files:**
- `src/lib/prompt-builder.ts` — `buildTestIdeasPrompt()`, `parseTestIdeas()`, system message
- `src/hooks/useAIGenerate.ts` — Orchestrates the stream, accepts store actions
- `src/stores/ideas-store.ts` — Ideas generation history (via generation-store-factory), idea selection
- `src/stores/generation-store-factory.ts` — Shared factory for generation stores (10-entry cap, navigation, streaming)
- `src/components/TestIdeasResult.tsx` — Props-driven: checkbox list, inline edit, copy, streaming indicator
- `src/components/GenerationHistory.tsx` — ◀ Gen N of M ▶ navigation + editable element label
- `src/components/IdeasTab.tsx` — Self-contained: pick element, generate, results inline, "Automate Selected"
- `src/lib/element-label.ts` — Derives labels from element metadata (textContent, aria-label, etc.)

**Tests:** `prompt-builder.test.ts` (21), `TestIdeasResult.test.tsx` (7), `IdeasTab.test.tsx` (8), `GenerationHistory.test.tsx` (8), `ideas-store.test.ts` (10), `element-label.test.ts` (9)

---

## 6. Test Code Generation

**What the user sees:**
1. In the **Code tab**, pick an element.
2. Click "Automate Tests" — code streams in inline, below the button.
3. Code appears in a dark code block:

```
Generated Code                              [Copy]
┌──────────────────────────────────────────────┐
│ import { test, expect } from '@playwright/t… │
│                                              │
│ test('sign in button submits form', async…   │
│   await page.goto('https://example.com/lo…   │
│   ...                                        │
└──────────────────────────────────────────────┘
```

4. **Copy** button copies the clean code to clipboard.
5. Markdown code fences (` ```typescript `, ` ``` `) are automatically stripped.
6. A **generation history** bar shows "◀ Gen 3 of 5 ▶" — navigate between past code generations (capped at 10).
7. The Code tab also receives **pending automations** from the Ideas tab. When you click "Automate Selected" in Ideas, the Code tab auto-generates code from those selected ideas on mount.

**Prompt customization:**
The automation prompt is built from the element + current Settings:

- **Framework** determines imports and API style:
  - Playwright → `import { test, expect } from '@playwright/test'`
  - Cypress → `describe/it blocks with cy.* commands`
  - Selenium → varies by language (`selenium`, `org.openqa.selenium`, etc.)
- **Language** determines syntax (JS, TS, Java, C#, Python)
- **POM toggle** — when on, the prompt asks the AI to generate a page class with locators and methods, then use it in the test
- The prompt also instructs the AI to prefer best-practice selectors (data-testid, aria-label, role, text over CSS classes)

**Code fence stripping:**
`stripCodeFences(text)` removes ` ```language ` opening and ` ``` ` closing markers. The AI often wraps code in markdown fences — this ensures the displayed code is clean.

**Key files:**
- `src/lib/prompt-builder.ts` — `buildAutomationPrompt()`, `stripCodeFences()`, `getFrameworkInfo()`
- `src/components/CodeResult.tsx` — Props-driven: dark code block, copy button, streaming indicator
- `src/components/CodeTab.tsx` — Self-contained: pick element, automate tests, results inline, pending automation
- `src/stores/code-store.ts` — Code generation history (via generation-store-factory)

**Tests:** `prompt-builder.test.ts` (covers automation prompts), `CodeResult.test.tsx` (5), `CodeTab.test.tsx` (7), `code-store.test.ts` (7)

---

## 7. Accessibility Check (A11y Tab)

**What the user sees:**

The A11y tab is a **dedicated tab** for page-wide accessibility checking. It has its own "Run Accessibility Check" button and displays results independently from test ideas/code. No element picking required.

This is a **two-layer** feature: deterministic scanning + optional AI analysis.

**Layer 1 — axe-core scan (no API key needed):**
1. Switch to the A11y tab.
2. Click "Run Accessibility Check" — the button shows "Scanning..." while axe-core runs.
3. If no violations: a green success message appears.
4. If violations found, they're grouped by severity:

```
3 accessibility violations

CRITICAL (1)
┌─────────────────────────────────────────────┐
│ Missing alt text                  [Explain] │
│ Images must have alternate text             │
│ [wcag2a] [wcag111]                          │
└─────────────────────────────────────────────┘

SERIOUS (1)
┌─────────────────────────────────────────────┐
│ Low contrast text                 [Explain] │
│ Color contrast must meet minimum ratio      │
│ [wcag2aa]                                   │
└─────────────────────────────────────────────┘
```

Each violation shows:
- **Help text** (bold) — what's wrong
- **Description** — more detail
- **WCAG tags** — which criteria apply (e.g. `wcag2a`, `wcag111`)

**Layer 2 — AI "Analyze" (requires API key):**
Click "Analyze" on any violation. The button shows "Analyzing..." while the AI responds, then a structured ticket-ready report appears inline:

```
│ Missing alt text                  [Analyze] │
│ Images must have alternate text             │
│ [wcag2a] [wcag111]                          │
│                                             │
│ ▶ Hide analysis                             │
│ ┌───────────────────────────────────────────┐│
│ │ Description: This image element on the    ││
│ │ Login page has no alt attribute...        ││
│ │                                           ││
│ │ Who is affected: Blind users using screen ││
│ │ readers will hear "image" with no context ││
│ │                                           ││
│ │ WCAG: 1.1.1 Non-text Content (Level A)   ││
│ │                                           ││
│ │ Priority: High — blocks Level A           ││
│ │                                           ││
│ │ Acceptance Criteria:                      ││
│ │ - Image has descriptive alt text          ││
│ │ - Alt text conveys the image's purpose    ││
│ │                                           ││
│ │ Implementation Notes:                     ││
│ │ Add an alt attribute describing the image ││
│ └───────────────────────────────────────────┘│
```

Key behaviors:
- Once generated, the "Analyze" button is replaced by a collapsible toggle ("Show/Hide analysis").
- Analysis results persist across tab navigation (stored in the accessibility store, not local component state).
- The AI uses the first affected HTML node from the violation for context.

**How axe-core scanning works internally:**

```
User clicks "Run Accessibility Check" in the A11y tab
    → AccessibilityTab sends RUN_AXE message to content script via chrome.tabs.sendMessage
    → Content script imports axe-core and runs axe.run(document) (full page scan)
    → axe returns structured violations (Result[])
    → Violations sent back to side panel via sendResponse
    → mapAxeViolations() transforms axe format → our A11yViolation format
    → Violations stored in accessibility store, UI renders AccessibilityResult
```

axe-core is bundled into the content script (~500KB). It runs deterministically in the page context — no AI calls, no API key needed for the base scan. Only "Analyze" requires an AI provider.

**Impact levels:** `critical` (red), `serious` (orange), `moderate` (yellow), `minor` (blue)

**Key files:**
- `src/lib/accessibility.ts` — `mapAxeViolations()`, `groupByImpact()`, impact labels/colors
- `src/lib/prompt-builder.ts` — `buildAccessibilityPrompt()`, accessibility system message
- `src/components/AccessibilityTab.tsx` — Dedicated tab with "Run Check" button, error/empty states
- `src/components/AccessibilityResult.tsx` — Violation list, grouped by impact, AI Analyze per violation
- `src/stores/accessibility-store.ts` — `violations`, `explanations`, `isScanning`, `error`
- `src/entrypoints/content.ts` — RUN_AXE message handler

**Tests:** `accessibility.test.ts` (5), `AccessibilityResult.test.tsx` (6), `AccessibilityTab.test.tsx` (5), `accessibility-store.test.ts` (7)

---

## 8. Error Handling

**App-level error boundary:**
The entire side panel app is wrapped in `<ErrorBoundary>`. If any React component throws during rendering, the user sees:

```
Something went wrong
[error message text]
[Try again]
```

Clicking "Try again" resets the error state and re-renders normally.

**AI error handling:**
- Network errors, invalid keys, rate limits are caught in `useAIGenerate` and displayed as an error message inline in the Ideas or Code tab (red box with "Error" heading).
- The `AIProviderError` class maps HTTP status codes to user-friendly messages.
- While streaming, if the connection drops, whatever content was received so far stays visible.

**Key files:**
- `src/components/ErrorBoundary.tsx` — Class component error boundary
- `src/lib/ai-provider.ts` — `AIProviderError` class
- `src/hooks/useAIGenerate.ts` — try/catch around streaming
- `src/components/IdeasTab.tsx` — Error state rendering for ideas
- `src/components/CodeTab.tsx` — Error state rendering for code

---

## State Management Overview

All state is managed via Zustand stores. Here's what each store holds:

| Store | Key state | Persisted? |
|-------|-----------|------------|
| `useElementStore` | `pickedElement`, `isPicking` | Yes — `pickedElement` synced to `chrome.storage.local` |
| `usePageStore` | `inventory` (scanned elements) | No — re-scanned on panel open |
| `useSettingsStore` | provider, apiKey, model, framework, language, usePOM, useProxy, theme | Yes — full settings object synced to `chrome.storage.local` |
| `useIdeasStore` | entries[] (GenerationEntry with selectedIdeas), currentIndex, isStreaming, error | No — in-memory, keeps up to 10 generations |
| `useCodeStore` | entries[] (GenerationEntry), currentIndex, isStreaming, error | No — in-memory, keeps up to 10 generations |
| `useAccessibilityStore` | violations, explanations, isScanning, error | No — persists across tab switches within a session, resets on new scan |

---

## Message Passing Overview

Communication between the side panel, background script, and content script uses `chrome.runtime.sendMessage` and `chrome.tabs.sendMessage`.

| Message | Direction | Purpose |
|---------|-----------|---------|
| `start-picking` | Side panel → Content script | Activate element picker |
| `stop-picking` | Side panel → Content script | Deactivate element picker |
| `element-picked` | Content script → Side panel | Send captured element data |
| `scan-page` | Side panel → Content script | Request page element inventory |
| `highlight-element` | Side panel → Content script | Highlight element by selector |
| `clear-highlight` | Side panel → Content script | Remove highlight |
| `run-axe` | Side panel → Content script | Run axe-core accessibility scan |
| `capture-screenshot` | Side panel → Background | Capture + crop element screenshot |
