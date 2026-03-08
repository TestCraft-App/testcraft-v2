import { describe, it, expect } from 'vitest';
import { deriveElementLabel } from './element-label';
import type { PickedElement } from './types';

function makeElement(overrides: Partial<PickedElement> = {}): PickedElement {
    return {
        outerHTML: '<button>Click me</button>',
        tagName: 'button',
        textContent: '',
        attributes: {},
        boundingRect: { x: 0, y: 0, width: 100, height: 40 },
        pageUrl: 'https://example.com',
        pageTitle: 'Test',
        ...overrides,
    };
}

describe('deriveElementLabel', () => {
    it('uses textContent when available', () => {
        const label = deriveElementLabel(makeElement({ textContent: 'Submit Form' }));
        expect(label).toBe('Submit Form');
    });

    it('truncates long textContent to 50 chars', () => {
        const longText = 'A'.repeat(60);
        const label = deriveElementLabel(makeElement({ textContent: longText }));
        expect(label).toBe('A'.repeat(50) + '…');
    });

    it('trims whitespace from textContent', () => {
        const label = deriveElementLabel(makeElement({ textContent: '  Submit  ' }));
        expect(label).toBe('Submit');
    });

    it('falls back to aria-label', () => {
        const label = deriveElementLabel(makeElement({ attributes: { 'aria-label': 'Close dialog' } }));
        expect(label).toBe('Close dialog');
    });

    it('falls back to placeholder', () => {
        const label = deriveElementLabel(makeElement({ tagName: 'input', attributes: { placeholder: 'Enter email' } }));
        expect(label).toBe('Enter email');
    });

    it('falls back to title', () => {
        const label = deriveElementLabel(makeElement({ attributes: { title: 'Tooltip text' } }));
        expect(label).toBe('Tooltip text');
    });

    it('falls back to name', () => {
        const label = deriveElementLabel(makeElement({ attributes: { name: 'username' } }));
        expect(label).toBe('username');
    });

    it('falls back to tag#id.class', () => {
        const label = deriveElementLabel(makeElement({ tagName: 'div', attributes: { id: 'main', class: 'container wide' } }));
        expect(label).toBe('div#main.container.wide');
    });

    it('falls back to tag only when no attributes', () => {
        const label = deriveElementLabel(makeElement({ tagName: 'span' }));
        expect(label).toBe('span');
    });
});
