import { describe, expect, it } from 'vitest';
import { buildTestDataPrompt, parseTestDataSets } from './prompt-builder';

describe('test data prompt helpers', () => {
    it('builds prompt with strict JSON instructions', () => {
        const prompt = buildTestDataPrompt(
            [{ selector: '#email', name: 'email', label: 'Email', type: 'email', required: true }],
            { url: 'https://example.com', title: 'Sign up' },
            'B2B app',
        );

        expect(prompt).toContain('Return only valid JSON');
        expect(prompt).toContain('"datasets"');
        expect(prompt).toContain('Additional context: B2B app');
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
});
