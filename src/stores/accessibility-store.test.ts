import { describe, it, expect, beforeEach } from 'vitest';
import { useAccessibilityStore } from './accessibility-store';
import type { A11yViolation } from '../lib/accessibility';

const mockViolation: A11yViolation = {
    id: 'image-alt',
    impact: 'critical',
    description: 'Images must have alternate text',
    help: 'Missing alt text',
    helpUrl: '',
    wcagTags: ['wcag2a'],
    nodes: [{ html: '<img src="x">', failureSummary: 'No alt' }],
};

describe('useAccessibilityStore', () => {
    beforeEach(() => {
        useAccessibilityStore.getState().reset();
    });

    it('starts with empty state', () => {
        const state = useAccessibilityStore.getState();
        expect(state.violations).toEqual([]);
        expect(state.explanations).toEqual({});
        expect(state.isScanning).toBe(false);
        expect(state.error).toBeNull();
    });

    it('sets violations and clears previous explanations', () => {
        useAccessibilityStore.getState().setExplanation('old-id', 'old explanation');
        useAccessibilityStore.getState().setViolations([mockViolation]);

        const state = useAccessibilityStore.getState();
        expect(state.violations).toHaveLength(1);
        expect(state.explanations).toEqual({});
    });

    it('sets explanation for a violation', () => {
        useAccessibilityStore.getState().setExplanation('image-alt', 'This image needs alt text.');
        expect(useAccessibilityStore.getState().explanations['image-alt']).toBe('This image needs alt text.');
    });

    it('preserves existing explanations when adding new ones', () => {
        useAccessibilityStore.getState().setExplanation('image-alt', 'First');
        useAccessibilityStore.getState().setExplanation('color-contrast', 'Second');

        const { explanations } = useAccessibilityStore.getState();
        expect(explanations['image-alt']).toBe('First');
        expect(explanations['color-contrast']).toBe('Second');
    });

    it('sets scanning state', () => {
        useAccessibilityStore.getState().setScanning(true);
        expect(useAccessibilityStore.getState().isScanning).toBe(true);
    });

    it('sets error and stops scanning', () => {
        useAccessibilityStore.getState().setScanning(true);
        useAccessibilityStore.getState().setError('Something went wrong');

        const state = useAccessibilityStore.getState();
        expect(state.error).toBe('Something went wrong');
        expect(state.isScanning).toBe(false);
    });

    it('resets all state', () => {
        useAccessibilityStore.getState().setViolations([mockViolation]);
        useAccessibilityStore.getState().setExplanation('image-alt', 'explanation');
        useAccessibilityStore.getState().setScanning(true);

        useAccessibilityStore.getState().reset();

        const state = useAccessibilityStore.getState();
        expect(state.violations).toEqual([]);
        expect(state.explanations).toEqual({});
        expect(state.isScanning).toBe(false);
        expect(state.error).toBeNull();
    });
});
