import { describe, it, expect } from 'vitest';
import {
    buildTestIdeasPrompt,
    buildAutomationPrompt,
    buildAccessibilityPrompt,
    parseTestIdeas,
    stripCodeFences,
} from './prompt-builder';
import type { PickedElement } from './types';

const mockElement: PickedElement = {
    outerHTML: '<button class="btn">Sign In</button>',
    tagName: 'button',
    textContent: 'Sign In',
    attributes: { class: 'btn' },
    boundingRect: { x: 0, y: 0, width: 100, height: 40 },
    pageUrl: 'https://example.com/login',
    pageTitle: 'Login Page',
};

const pageContext = { url: 'https://example.com/login', title: 'Login Page' };

describe('buildTestIdeasPrompt', () => {
    it('includes element HTML', () => {
        const prompt = buildTestIdeasPrompt(mockElement, pageContext);
        expect(prompt).toContain('<button class="btn">Sign In</button>');
    });

    it('includes page context', () => {
        const prompt = buildTestIdeasPrompt(mockElement, pageContext);
        expect(prompt).toContain('Login Page');
        expect(prompt).toContain('https://example.com/login');
    });

    it('includes test categories', () => {
        const prompt = buildTestIdeasPrompt(mockElement, pageContext);
        expect(prompt).toContain('Positive Tests');
        expect(prompt).toContain('Negative Tests');
        expect(prompt).toContain('Accessibility Tests');
    });

    it('includes element details', () => {
        const prompt = buildTestIdeasPrompt(mockElement, pageContext);
        expect(prompt).toContain('<button>');
        expect(prompt).toContain('"Sign In"');
    });
});

describe('buildAutomationPrompt', () => {
    it('includes framework name for playwright', () => {
        const prompt = buildAutomationPrompt(mockElement, pageContext, 'playwright', 'typescript', false);
        expect(prompt).toContain('Playwright');
    });

    it('includes framework name for cypress', () => {
        const prompt = buildAutomationPrompt(mockElement, pageContext, 'cypress', 'javascript', false);
        expect(prompt).toContain('Cypress');
    });

    it('includes framework name for selenium', () => {
        const prompt = buildAutomationPrompt(mockElement, pageContext, 'selenium', 'java', false);
        expect(prompt).toContain('Selenium');
    });

    it('includes POM instruction when enabled', () => {
        const prompt = buildAutomationPrompt(mockElement, pageContext, 'playwright', 'typescript', true);
        expect(prompt).toContain('Page Object Model');
    });

    it('does not include POM when disabled', () => {
        const prompt = buildAutomationPrompt(mockElement, pageContext, 'playwright', 'typescript', false);
        expect(prompt).not.toContain('Page Object Model');
    });

    it('includes selected ideas when provided', () => {
        const ideas = ['Verify sign in button is clickable', 'Test with empty credentials'];
        const prompt = buildAutomationPrompt(mockElement, pageContext, 'playwright', 'typescript', false, ideas);
        expect(prompt).toContain('Verify sign in button is clickable');
        expect(prompt).toContain('Test with empty credentials');
    });

    it('includes element HTML', () => {
        const prompt = buildAutomationPrompt(mockElement, pageContext, 'playwright', 'typescript', false);
        expect(prompt).toContain('<button class="btn">Sign In</button>');
    });
});

describe('buildAccessibilityPrompt', () => {
    it('includes violation description', () => {
        const prompt = buildAccessibilityPrompt('Missing alt text', '<img src="photo.jpg" />');
        expect(prompt).toContain('Missing alt text');
    });

    it('includes element HTML', () => {
        const prompt = buildAccessibilityPrompt('Missing alt text', '<img src="photo.jpg" />');
        expect(prompt).toContain('<img src="photo.jpg" />');
    });

    it('includes structured report format instructions with Element field', () => {
        const prompt = buildAccessibilityPrompt('Missing alt text', '<img src="photo.jpg" />');
        expect(prompt).toContain('Element:');
        expect(prompt).toContain('Description:');
        expect(prompt).toContain('Who is affected:');
        expect(prompt).toContain('WCAG:');
        expect(prompt).toContain('Priority:');
        expect(prompt).toContain('Acceptance Criteria:');
        expect(prompt).toContain('Implementation Notes:');
    });
});

describe('parseTestIdeas', () => {
    it('parses categorized ideas from markdown output', () => {
        const text = `
**1. Positive Tests**
1. Verify the Sign In button submits the form
2. Verify successful login redirects to dashboard

**2. Negative Tests**
1. Verify error message with invalid credentials
2. Verify button is disabled during submission
`;
        const sections = parseTestIdeas(text);
        expect(sections).toHaveLength(2);
        expect(sections[0].category).toContain('Positive Tests');
        expect(sections[0].ideas).toHaveLength(2);
        expect(sections[1].category).toContain('Negative Tests');
        expect(sections[1].ideas).toHaveLength(2);
    });

    it('handles heading-style categories', () => {
        const text = `
## Positive Tests
1. First test idea
2. Second test idea

## Negative Tests
- Third test idea
`;
        const sections = parseTestIdeas(text);
        expect(sections).toHaveLength(2);
        expect(sections[0].ideas).toHaveLength(2);
        expect(sections[1].ideas).toHaveLength(1);
    });

    it('parses plain text headings with colons', () => {
        const text = `Positive Tests:
1. Verify the button submits the form
2. Verify success message appears

Negative Tests:
1. Verify error with invalid input
`;
        const sections = parseTestIdeas(text);
        expect(sections).toHaveLength(2);
        expect(sections[0].category).toBe('Positive Tests');
        expect(sections[0].ideas).toHaveLength(2);
        expect(sections[1].category).toBe('Negative Tests');
        expect(sections[1].ideas).toHaveLength(1);
    });

    it('returns empty array for empty text', () => {
        expect(parseTestIdeas('')).toEqual([]);
    });
});

describe('stripCodeFences', () => {
    it('removes markdown code fences', () => {
        const code = '```typescript\nconst x = 1;\n```';
        expect(stripCodeFences(code)).toBe('const x = 1;');
    });

    it('removes plain code fences', () => {
        const code = '```\nconst x = 1;\n```';
        expect(stripCodeFences(code)).toBe('const x = 1;');
    });

    it('returns plain code unchanged', () => {
        expect(stripCodeFences('const x = 1;')).toBe('const x = 1;');
    });
});
