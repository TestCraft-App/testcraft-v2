import { describe, expect, it } from 'vitest';
import { buildTestDataPrompt, parseTestDataSets } from './prompt-builder';

describe('test data prompt helpers', () => {
    it('builds prompt with test design techniques and JSON instructions', () => {
        const prompt = buildTestDataPrompt(
            [{ selector: '#email', name: 'email', label: 'Email', type: 'email', required: true }],
            { url: 'https://example.com', title: 'Sign up' },
            'B2B app',
        );

        expect(prompt).toContain('Return only valid JSON');
        expect(prompt).toContain('"datasets"');
        expect(prompt).toContain('B2B app');
        expect(prompt).toContain('Equivalence Partitioning');
        expect(prompt).toContain('Boundary Value Analysis');
        expect(prompt).toContain('Negative Testing');
    });

    it('builds prompt without context block when no context provided', () => {
        const prompt = buildTestDataPrompt(
            [{ selector: '#name', name: 'name', label: 'Name', type: 'text', required: false }],
            { url: 'https://example.com', title: 'Form' },
        );

        expect(prompt).not.toContain('Additional context');
        expect(prompt).toContain('Descriptive scenario name');
    });

    it('parses datasets from JSON response', () => {
        const datasets = parseTestDataSets(`{
          "datasets": [
            {"id":"happy-path","name":"Happy Path","values":{"#email":"test@example.com","#agree":true}}
          ]
        }`);

        expect(datasets).toHaveLength(1);
        expect(datasets[0].id).toBe('happy-path');
        expect(datasets[0].values['#agree']).toBe(true);
    });

    it('parses datasets wrapped in markdown code fences', () => {
        const datasets = parseTestDataSets('```json\n{"datasets":[{"id":"d1","name":"Test","values":{"#x":"y"}}]}\n```');

        expect(datasets).toHaveLength(1);
        expect(datasets[0].values['#x']).toBe('y');
    });

    it('returns empty array for unparseable response', () => {
        expect(parseTestDataSets('not json at all')).toEqual([]);
        expect(parseTestDataSets('{"datasets":[]}')).toEqual([]);
    });
});
