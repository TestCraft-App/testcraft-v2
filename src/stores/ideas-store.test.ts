import { describe, it, expect, beforeEach } from 'vitest';
import { useIdeasStore } from './ideas-store';

describe('ideas-store', () => {
    beforeEach(() => {
        useIdeasStore.setState({ entries: [], currentIndex: -1, streamingIndex: -1, isStreaming: false, error: null });
    });

    it('starts with empty entries', () => {
        const state = useIdeasStore.getState();
        expect(state.entries).toHaveLength(0);
        expect(state.currentIndex).toBe(-1);
    });

    it('adds an entry on startGeneration', () => {
        useIdeasStore.getState().startGeneration('Submit button', 'https://example.com');
        const state = useIdeasStore.getState();
        expect(state.entries).toHaveLength(1);
        expect(state.currentIndex).toBe(0);
        expect(state.isStreaming).toBe(true);
        expect(state.entries[0].elementLabel).toBe('Submit button');
        expect(state.entries[0].selectedIdeas).toEqual(new Set());
    });

    it('appends content to the current entry', () => {
        const store = useIdeasStore.getState();
        store.startGeneration('btn', 'https://example.com');
        store.appendContent('Hello ');
        store.appendContent('world');
        expect(useIdeasStore.getState().entries[0].content).toBe('Hello world');
    });

    it('navigates between entries', () => {
        const store = useIdeasStore.getState();
        store.startGeneration('First', 'https://a.com');
        store.setStreaming(false);
        store.startGeneration('Second', 'https://b.com');
        store.setStreaming(false);

        expect(useIdeasStore.getState().currentIndex).toBe(1);
        useIdeasStore.getState().navigateTo(0);
        expect(useIdeasStore.getState().currentIndex).toBe(0);
    });

    it('caps at 10 entries', () => {
        const store = useIdeasStore.getState();
        for (let i = 0; i < 12; i++) {
            store.startGeneration(`Entry ${i}`, 'https://example.com');
            store.setStreaming(false);
        }
        const state = useIdeasStore.getState();
        expect(state.entries).toHaveLength(10);
        expect(state.entries[0].elementLabel).toBe('Entry 2');
        expect(state.currentIndex).toBe(9);
    });

    it('toggles idea selection', () => {
        const store = useIdeasStore.getState();
        store.startGeneration('btn', 'https://example.com');
        store.appendContent('1. First idea\n2. Second idea\n');

        store.toggleIdea(0);
        expect(useIdeasStore.getState().entries[0].selectedIdeas).toEqual(new Set([0]));

        store.toggleIdea(1);
        expect(useIdeasStore.getState().entries[0].selectedIdeas).toEqual(new Set([0, 1]));

        store.toggleIdea(0);
        expect(useIdeasStore.getState().entries[0].selectedIdeas).toEqual(new Set([1]));
    });

    it('appends content to the streaming entry even after navigating away', () => {
        const store = useIdeasStore.getState();
        store.startGeneration('First', 'https://a.com');
        store.appendContent('first content');
        store.setStreaming(false);

        store.startGeneration('Second', 'https://b.com');
        // Navigate back to first entry while second is streaming
        useIdeasStore.getState().navigateTo(0);
        // Append should go to the streaming entry (index 1), not the viewed entry (index 0)
        useIdeasStore.getState().appendContent(' streamed');

        const state = useIdeasStore.getState();
        expect(state.entries[0].content).toBe('first content');
        expect(state.entries[1].content).toBe(' streamed');
    });

    it('updates element label', () => {
        const store = useIdeasStore.getState();
        store.startGeneration('Old label', 'https://example.com');
        store.updateElementLabel(0, 'New label');
        expect(useIdeasStore.getState().entries[0].elementLabel).toBe('New label');
    });

    it('removes only the current entry', () => {
        const store = useIdeasStore.getState();
        store.startGeneration('First', 'https://a.com');
        store.setStreaming(false);
        store.startGeneration('Second', 'https://b.com');
        store.setStreaming(false);
        store.startGeneration('Third', 'https://c.com');
        store.setStreaming(false);

        // Navigate to second entry and remove it
        useIdeasStore.getState().navigateTo(1);
        useIdeasStore.getState().removeCurrent();

        const state = useIdeasStore.getState();
        expect(state.entries).toHaveLength(2);
        expect(state.entries[0].elementLabel).toBe('First');
        expect(state.entries[1].elementLabel).toBe('Third');
        expect(state.currentIndex).toBe(1);
    });

    it('removes the last entry and adjusts index', () => {
        const store = useIdeasStore.getState();
        store.startGeneration('Only', 'https://a.com');
        store.setStreaming(false);

        useIdeasStore.getState().removeCurrent();

        const state = useIdeasStore.getState();
        expect(state.entries).toHaveLength(0);
        expect(state.currentIndex).toBe(-1);
    });

    it('clears all entries', () => {
        const store = useIdeasStore.getState();
        store.startGeneration('btn', 'https://example.com');
        store.clearAll();
        const state = useIdeasStore.getState();
        expect(state.entries).toHaveLength(0);
        expect(state.currentIndex).toBe(-1);
    });

    it('sets and clears error', () => {
        const store = useIdeasStore.getState();
        store.setError('Something broke');
        expect(useIdeasStore.getState().error).toBe('Something broke');
        expect(useIdeasStore.getState().isStreaming).toBe(false);
    });

    it('getSelectedIdeasText returns selected idea text', () => {
        const store = useIdeasStore.getState();
        store.startGeneration('btn', 'https://example.com');
        store.appendContent('**Positive Tests**\n1. First idea\n2. Second idea\n');
        store.toggleIdea(1);
        expect(store.getSelectedIdeasText()).toEqual(['Second idea']);
    });
});
