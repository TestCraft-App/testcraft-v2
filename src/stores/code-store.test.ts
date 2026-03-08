import { describe, it, expect, beforeEach } from 'vitest';
import { useCodeStore } from './code-store';

describe('code-store', () => {
    beforeEach(() => {
        useCodeStore.setState({ entries: [], currentIndex: -1, streamingIndex: -1, isStreaming: false, error: null });
    });

    it('starts with empty entries', () => {
        const state = useCodeStore.getState();
        expect(state.entries).toHaveLength(0);
        expect(state.currentIndex).toBe(-1);
    });

    it('adds an entry on startGeneration', () => {
        useCodeStore.getState().startGeneration('Submit button', 'https://example.com');
        const state = useCodeStore.getState();
        expect(state.entries).toHaveLength(1);
        expect(state.currentIndex).toBe(0);
        expect(state.isStreaming).toBe(true);
        expect(state.entries[0].elementLabel).toBe('Submit button');
    });

    it('does not have selectedIdeas', () => {
        useCodeStore.getState().startGeneration('btn', 'https://example.com');
        // Code store entries should not have selectedIdeas initialized
        expect(useCodeStore.getState().entries[0].selectedIdeas).toBeUndefined();
    });

    it('appends content to the current entry', () => {
        const store = useCodeStore.getState();
        store.startGeneration('btn', 'https://example.com');
        store.appendContent('const ');
        store.appendContent('x = 1;');
        expect(useCodeStore.getState().entries[0].content).toBe('const x = 1;');
    });

    it('navigates between entries', () => {
        const store = useCodeStore.getState();
        store.startGeneration('First', 'https://a.com');
        store.setStreaming(false);
        store.startGeneration('Second', 'https://b.com');
        store.setStreaming(false);

        expect(useCodeStore.getState().currentIndex).toBe(1);
        useCodeStore.getState().navigateTo(0);
        expect(useCodeStore.getState().currentIndex).toBe(0);
    });

    it('caps at 10 entries', () => {
        const store = useCodeStore.getState();
        for (let i = 0; i < 12; i++) {
            store.startGeneration(`Entry ${i}`, 'https://example.com');
            store.setStreaming(false);
        }
        const state = useCodeStore.getState();
        expect(state.entries).toHaveLength(10);
        expect(state.entries[0].elementLabel).toBe('Entry 2');
    });

    it('clears all entries', () => {
        const store = useCodeStore.getState();
        store.startGeneration('btn', 'https://example.com');
        store.clearAll();
        expect(useCodeStore.getState().entries).toHaveLength(0);
        expect(useCodeStore.getState().currentIndex).toBe(-1);
    });
});
