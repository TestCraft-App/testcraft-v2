import { describe, it, expect } from 'vitest';
import { parseElement } from './parse-element';

describe('parseElement', () => {
    it('extracts tag name from simple element', () => {
        const result = parseElement('<button>Click me</button>');
        expect(result.tagName).toBe('button');
    });

    it('extracts text content', () => {
        const result = parseElement('<a href="/about">About Us</a>');
        expect(result.textPreview).toBe('About Us');
    });

    it('truncates long text content with ellipsis', () => {
        const longText = 'A'.repeat(100);
        const result = parseElement(`<p>${longText}</p>`);
        expect(result.textPreview.length).toBe(83); // 80 chars + '...'
        expect(result.textPreview.endsWith('...')).toBe(true);
    });

    it('extracts attributes', () => {
        const result = parseElement('<input type="email" name="user-email" placeholder="Enter email" />');
        expect(result.attributes).toEqual({
            type: 'email',
            name: 'user-email',
            placeholder: 'Enter email',
        });
    });

    it('truncates long HTML', () => {
        const longAttr = 'x'.repeat(600);
        const result = parseElement(`<div data-long="${longAttr}">text</div>`);
        expect(result.truncatedHTML.length).toBe(503); // 500 + '...'
        expect(result.truncatedHTML.endsWith('...')).toBe(true);
    });

    it('handles empty/invalid HTML gracefully', () => {
        const result = parseElement('');
        expect(result.tagName).toBe('unknown');
        expect(result.textPreview).toBe('');
    });

    it('handles nested elements — returns top-level tag', () => {
        const result = parseElement('<form><input /><button>Submit</button></form>');
        expect(result.tagName).toBe('form');
        expect(result.textPreview).toBe('Submit');
    });

    it('handles element with no text content', () => {
        const result = parseElement('<input type="text" />');
        expect(result.tagName).toBe('input');
        expect(result.textPreview).toBe('');
    });
});
