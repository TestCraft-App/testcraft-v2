import { describe, it, expect } from 'vitest';
import { scanPage, isInteractiveElement } from './page-scanner';

function createDocument(html: string): Document {
    const parser = new DOMParser();
    return parser.parseFromString(html, 'text/html');
}

const fixtureHTML = `
<html>
<head><title>Test Page</title></head>
<body>
    <form id="login-form" aria-label="Login Form">
        <input type="email" name="email" placeholder="Email" />
        <input type="password" name="password" placeholder="Password" />
        <button type="submit">Sign In</button>
    </form>
    <nav>
        <a href="/home">Home</a>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
    </nav>
    <select name="language">
        <option>English</option>
        <option>Spanish</option>
    </select>
    <textarea name="notes" placeholder="Add notes"></textarea>
    <div role="button" aria-label="Custom Button">Click</div>
    <input type="hidden" name="csrf" value="abc" />
    <video controls><source src="video.mp4" /></video>
    <p>Just some text</p>
</body>
</html>
`;

describe('scanPage', () => {
    it('returns correct element inventory from fixture HTML', () => {
        const doc = createDocument(fixtureHTML);
        const inventory = scanPage(doc);

        expect(inventory.elements.length).toBeGreaterThan(0);
        expect(inventory.title).toBe('Test Page');
    });

    it('classifies forms correctly', () => {
        const doc = createDocument(fixtureHTML);
        const inventory = scanPage(doc);

        expect(inventory.counts.form).toBe(1);
        const forms = inventory.elements.filter((e) => e.category === 'form');
        expect(forms[0].text).toBe('Login Form');
    });

    it('classifies buttons correctly', () => {
        const doc = createDocument(fixtureHTML);
        const inventory = scanPage(doc);

        // submit button + div[role="button"]
        expect(inventory.counts.button).toBe(2);
    });

    it('classifies links correctly', () => {
        const doc = createDocument(fixtureHTML);
        const inventory = scanPage(doc);

        expect(inventory.counts.link).toBe(3);
    });

    it('classifies inputs correctly', () => {
        const doc = createDocument(fixtureHTML);
        const inventory = scanPage(doc);

        // email + password + textarea = 3 inputs
        expect(inventory.counts.input).toBe(3);
    });

    it('classifies select elements correctly', () => {
        const doc = createDocument(fixtureHTML);
        const inventory = scanPage(doc);

        expect(inventory.counts.select).toBe(1);
    });

    it('excludes hidden inputs', () => {
        const doc = createDocument(fixtureHTML);
        const inventory = scanPage(doc);

        const hiddenInputs = inventory.elements.filter(
            (e) => e.tagName === 'input' && e.attributes['type'] === 'hidden',
        );
        expect(hiddenInputs).toHaveLength(0);
    });

    it('detects video as media', () => {
        const doc = createDocument(fixtureHTML);
        const inventory = scanPage(doc);

        expect(inventory.counts.media).toBe(1);
    });

    it('does not include non-interactive p element', () => {
        const doc = createDocument(fixtureHTML);
        const inventory = scanPage(doc);

        const paragraphs = inventory.elements.filter((e) => e.tagName === 'p');
        expect(paragraphs).toHaveLength(0);
    });

    it('handles empty page', () => {
        const doc = createDocument('<html><body></body></html>');
        const inventory = scanPage(doc);

        expect(inventory.elements).toHaveLength(0);
        expect(inventory.counts.button).toBe(0);
    });

    it('generates a selector with id when available', () => {
        const doc = createDocument(fixtureHTML);
        const inventory = scanPage(doc);

        const form = inventory.elements.find((e) => e.category === 'form');
        expect(form?.selector).toBe('#login-form');
    });

    it('generates a selector with name when available', () => {
        const doc = createDocument(fixtureHTML);
        const inventory = scanPage(doc);

        const emailInput = inventory.elements.find((e) => e.attributes['name'] === 'email');
        expect(emailInput?.selector).toBe('input[name="email"]');
    });
});

describe('isInteractiveElement', () => {
    it('returns true for buttons', () => {
        const doc = createDocument('<button>Click</button>');
        const el = doc.querySelector('button')!;
        expect(isInteractiveElement(el)).toBe(true);
    });

    it('returns true for links with href', () => {
        const doc = createDocument('<a href="/home">Home</a>');
        const el = doc.querySelector('a')!;
        expect(isInteractiveElement(el)).toBe(true);
    });

    it('returns false for plain div', () => {
        const doc = createDocument('<div>Text</div>');
        const el = doc.querySelector('div')!;
        expect(isInteractiveElement(el)).toBe(false);
    });

    it('returns true for input', () => {
        const doc = createDocument('<input type="text" />');
        const el = doc.querySelector('input')!;
        expect(isInteractiveElement(el)).toBe(true);
    });

    it('returns true for role="button"', () => {
        const doc = createDocument('<div role="button">Click</div>');
        const el = doc.querySelector('div')!;
        expect(isInteractiveElement(el)).toBe(true);
    });

    it('returns true for form elements', () => {
        const doc = createDocument('<form><input /></form>');
        const el = doc.querySelector('form')!;
        expect(isInteractiveElement(el)).toBe(true);
    });
});
