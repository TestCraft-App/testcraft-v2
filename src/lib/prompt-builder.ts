import type { PickedElement } from './types';
import type { DetectedFormField, TestDataSet } from './form-data';
import type { Framework, Language } from './ai-provider';

export interface PageContext {
    url: string;
    title: string;
}

export function buildTestIdeasPrompt(element: PickedElement, pageContext: PageContext, context?: string): string {
    const contextBlock = context?.trim() ? `\n\n## Additional Context\n${context.trim()}\n` : '';

    return `Generate test ideas for the following UI element on the page "${pageContext.title}" (${pageContext.url}).

Element HTML:
\`\`\`html
${element.outerHTML}
\`\`\`

Element details:
- Tag: <${element.tagName}>
- Text content: "${element.textContent}"
- Attributes: ${JSON.stringify(element.attributes)}${contextBlock}

Generate comprehensive test ideas organized into these categories: Positive Tests, Negative Tests, Boundary Tests, Accessibility Tests, and Visual/UX Tests.

Format each test idea as a concise, actionable description. Number them within each category.

You MUST use exactly this output format:

Positive Tests:
1. <idea>
2. <idea>

Negative Tests:
1. <idea>
2. <idea>

Boundary Tests:
1. <idea>

Accessibility Tests:
1. <idea>

Visual/UX Tests:
1. <idea>

Do not use markdown bold, headers, or any other formatting. Just plain text headings with a colon, followed by numbered ideas.`;
}

export const TEST_IDEAS_SYSTEM_MESSAGE = `You are an expert software tester specializing in web application testing. Generate thorough, practical test ideas that a QA engineer can use directly. Focus on real-world scenarios and edge cases. Be specific about expected behaviors and outcomes.`;

export function buildAutomationPrompt(
    element: PickedElement,
    pageContext: PageContext,
    framework: Framework,
    language: Language,
    usePOM: boolean,
    selectedIdeas?: string[],
    context?: string,
): string {
    const frameworkInfo = getFrameworkInfo(framework, language);
    const contextBlock = context?.trim() ? `\n\n## Additional Context\n${context.trim()}\n` : '';

    let prompt = `Generate ${frameworkInfo.name} test automation code in ${language} for the following UI element on "${pageContext.title}" (${pageContext.url}).

Element HTML:
\`\`\`html
${element.outerHTML}
\`\`\`

Element details:
- Tag: <${element.tagName}>
- Text content: "${element.textContent}"
- Attributes: ${JSON.stringify(element.attributes)}${contextBlock}

Requirements:
- Use ${frameworkInfo.name} with ${frameworkInfo.testRunner}
- Use ${frameworkInfo.importExample}
- Use best-practice selectors (prefer data-testid, aria-label, role, text content over CSS classes)
- Include assertions for expected outcomes
- Add descriptive test names`;

    if (usePOM) {
        prompt += `\n- Use the Page Object Model pattern: create a page class with locators and methods, then use it in the test`;
    }

    if (selectedIdeas && selectedIdeas.length > 0) {
        prompt += `\n\nGenerate test code for these specific test ideas:\n${selectedIdeas.map((idea, i) => `${i + 1}. ${idea}`).join('\n')}`;
    }

    prompt += `\n\nReturn ONLY the code, no explanations.`;

    return prompt;
}

export const AUTOMATION_SYSTEM_MESSAGE = `You are an expert test automation engineer. Write clean, maintainable, production-ready test code. Follow the framework's conventions and best practices. Use descriptive variable names and test descriptions.`;

export function buildAccessibilityPrompt(
    violation: string,
    elementHtml: string,
    context?: string,
): string {
    const contextBlock = context?.trim() ? `\n\n## Additional Context\n${context.trim()}\n` : '';

    return `Analyze the following WCAG accessibility violation and produce a structured report.

Violation:
${violation}

Affected element HTML:
\`\`\`html
${elementHtml}
\`\`\`${contextBlock}

You MUST use exactly this output format (plain text, no markdown):

Element: <a short, human-readable reference to the specific element, e.g. "the 'Sort by' select in the product filters" or "the search icon button in the header". Use attributes, text content, or context from the HTML to make it identifiable.>

Description: <1-2 sentence plain-language explanation of what is wrong>

Who is affected: <which users are impacted and how>

WCAG: <criteria number, name, and conformance level, e.g. "1.1.1 Non-text Content (Level A)">

Priority: <High/Medium/Low with brief justification>

Acceptance Criteria:
- <criterion 1>
- <criterion 2>

Implementation Notes:
<Concise direction on what needs to change conceptually — not code. Enough for a developer or coding agent to implement the fix.>

Do not include code snippets, HTML fixes, or markdown formatting.`;
}

export const ACCESSIBILITY_SYSTEM_MESSAGE = `You are a web accessibility expert writing reports for software testers. Be concise and practical. Focus on impact, WCAG compliance, and clear direction for fixes. Do not write code.`;

export function buildTestDataPrompt(fields: DetectedFormField[], pageContext: PageContext, context?: string): string {
    const contextBlock = context?.trim() ? `\n\nAdditional context: ${context.trim()}` : '';

    return `Generate realistic test datasets for a web form on "${pageContext.title}" (${pageContext.url}).

Detected fields:
${JSON.stringify(fields, null, 2)}${contextBlock}

Return only valid JSON (no markdown or extra text) in this exact shape:
{
  "datasets": [
    {
      "id": "short-kebab-id",
      "name": "Human readable name",
      "values": {
        "<field selector>": "<value or boolean>",
        "<field selector>": true
      }
    }
  ]
}

Rules:
- Return exactly 3 datasets.
- Include values for every field selector in each dataset.
- Use booleans only for checkbox/radio fields.
- Keep values safe for test environments (fake data only).
- For select fields, use one of the provided options when available.`;
}

export const TEST_DATA_SYSTEM_MESSAGE = `You generate high-quality synthetic form test data for QA workflows. Output must be strict JSON only, with deterministic keys and no commentary.`;

export function parseTestDataSets(text: string): TestDataSet[] {
    const candidate = extractJsonObject(text);
    if (!candidate) return [];

    try {
        const parsed = JSON.parse(candidate) as { datasets?: Array<{ id?: string; name?: string; values?: Record<string, string | boolean> }> };
        if (!Array.isArray(parsed.datasets)) return [];

        return parsed.datasets
            .map((dataset, index) => ({
                id: dataset.id?.trim() || `dataset-${index + 1}`,
                name: dataset.name?.trim() || `Dataset ${index + 1}`,
                values: dataset.values && typeof dataset.values === 'object' ? dataset.values : {},
            }))
            .filter((dataset) => Object.keys(dataset.values).length > 0);
    } catch {
        return [];
    }
}

function extractJsonObject(text: string): string | null {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    return text.slice(start, end + 1);
}

function getFrameworkInfo(framework: Framework, language: Language) {
    switch (framework) {
        case 'playwright':
            return {
                name: 'Playwright',
                testRunner: '@playwright/test',
                importExample:
                    language === 'python'
                        ? 'from playwright.sync_api import sync_playwright'
                        : language === 'java'
                          ? 'com.microsoft.playwright'
                          : language === 'csharp'
                            ? 'Microsoft.Playwright'
                            : "import { test, expect } from '@playwright/test'",
            };
        case 'cypress':
            return {
                name: 'Cypress',
                testRunner: 'Cypress',
                importExample: "describe/it blocks with cy.* commands",
            };
        case 'selenium':
            return {
                name: 'Selenium WebDriver',
                testRunner: language === 'python' ? 'pytest' : language === 'java' ? 'JUnit/TestNG' : 'jest',
                importExample:
                    language === 'python'
                        ? 'from selenium import webdriver'
                        : language === 'java'
                          ? 'org.openqa.selenium'
                          : language === 'csharp'
                            ? 'OpenQA.Selenium'
                            : "import { Builder, By } from 'selenium-webdriver'",
            };
    }
}

const KNOWN_CATEGORIES = [
    'positive tests', 'negative tests', 'boundary tests',
    'accessibility tests', 'visual/ux tests', 'visual tests',
    'ux tests', 'creative test scenarios',
];

export function parseTestIdeas(text: string): { category: string; ideas: string[] }[] {
    const sections: { category: string; ideas: string[] }[] = [];
    let currentCategory = '';
    let currentIdeas: string[] = [];

    for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Try to detect a category heading:
        // 1. Bold markdown: "**Positive Tests**" or "1. **Positive Tests**"
        // 2. Markdown heading: "## Positive Tests"
        // 3. Plain heading with colon: "Positive Tests:"
        // 4. Numbered heading: "1. Positive Tests:"

        // Strip leading number prefix like "1. " or "1) "
        const withoutNumber = trimmed.replace(/^\d+[\.\)]\s*/, '');
        // Strip bold markers
        const withoutBold = withoutNumber.replace(/\*+/g, '');
        // Strip heading markers
        const withoutHeading = withoutBold.replace(/^#{1,3}\s*/, '');
        // Strip trailing colon, dash, em-dash
        const cleaned = withoutHeading.replace(/\s*[-—:]\s*$/, '').trim();

        const isBold = trimmed.includes('**');
        const isHeading = withoutNumber.startsWith('#');
        const hasColon = withoutBold.endsWith(':');
        const isKnownCategory = KNOWN_CATEGORIES.includes(cleaned.toLowerCase());

        if ((isBold || isHeading || hasColon || isKnownCategory) && !trimmed.match(/^\d+[\.\)]\s+[a-z]/)) {
            // Only treat as category if it matches known pattern
            if (isBold || isHeading || isKnownCategory || (hasColon && !cleaned.includes(' - '))) {
                if (currentCategory && currentIdeas.length > 0) {
                    sections.push({ category: currentCategory, ideas: [...currentIdeas] });
                }
                currentCategory = cleaned;
                currentIdeas = [];
                continue;
            }
        }

        // Match numbered ideas like "1. Verify that..." or "- Verify that..." or "* Verify..."
        const ideaMatch = trimmed.match(/^(?:\d+[\.\)]\s*|-\s*|\*\s+)(.+)/);
        if (ideaMatch && currentCategory) {
            // Strip any bold from the idea text itself
            currentIdeas.push(ideaMatch[1].replace(/\*+/g, '').trim());
        }
    }

    if (currentCategory && currentIdeas.length > 0) {
        sections.push({ category: currentCategory, ideas: [...currentIdeas] });
    }

    return sections;
}

export function stripCodeFences(text: string): string {
    return text.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '').trim();
}
