import { create, type StoreApi, type UseBoundStore } from 'zustand';
import type { GenerationEntry } from '../lib/types';

const MAX_ENTRIES = 10;

export interface GenerationState {
    entries: GenerationEntry[];
    currentIndex: number;
    streamingIndex: number;
    isStreaming: boolean;
    error: string | null;
    startGeneration: (elementLabel: string, pageUrl: string) => void;
    appendContent: (chunk: string) => void;
    setStreaming: (streaming: boolean) => void;
    setError: (error: string | null) => void;
    navigateTo: (index: number) => void;
    updateElementLabel: (index: number, label: string) => void;
    removeCurrent: () => void;
    clearAll: () => void;
}

export interface IdeasGenerationState extends GenerationState {
    toggleIdea: (index: number) => void;
    getSelectedIdeasText: () => string[];
}

interface FactoryOptions {
    withSelectedIdeas: boolean;
}

export function createGenerationStore(
    options: FactoryOptions & { withSelectedIdeas: true },
): UseBoundStore<StoreApi<IdeasGenerationState>>;
export function createGenerationStore(
    options: FactoryOptions & { withSelectedIdeas: false },
): UseBoundStore<StoreApi<GenerationState>>;
export function createGenerationStore(
    options: FactoryOptions,
): UseBoundStore<StoreApi<GenerationState | IdeasGenerationState>> {
    if (options.withSelectedIdeas) {
        return create<IdeasGenerationState>((set, get) => ({
            ...baseState(),
            ...baseActions(set, get),
            startGeneration: (elementLabel, pageUrl) => {
                const entry: GenerationEntry = {
                    id: crypto.randomUUID(),
                    content: '',
                    elementLabel,
                    pageUrl,
                    timestamp: Date.now(),
                    selectedIdeas: new Set(),
                };
                addEntry(set, get, entry);
            },
            toggleIdea: (index: number) => {
                const { entries, currentIndex } = get();
                const entry = entries[currentIndex];
                if (!entry) return;
                const selected = new Set(entry.selectedIdeas);
                if (selected.has(index)) {
                    selected.delete(index);
                } else {
                    selected.add(index);
                }
                const updated = [...entries];
                updated[currentIndex] = { ...entry, selectedIdeas: selected };
                set({ entries: updated });
            },
            getSelectedIdeasText: () => {
                const { entries, currentIndex } = get();
                const entry = entries[currentIndex];
                if (!entry?.selectedIdeas || entry.selectedIdeas.size === 0) return [];

                // Parse ideas from content and return selected ones
                const lines = entry.content.split('\n');
                const ideas: string[] = [];
                let ideaIndex = 0;
                for (const line of lines) {
                    const match = line.trim().match(/^(?:\d+[\.\)]\s*|-\s*|\*\s+)(.+)/);
                    if (match) {
                        if (entry.selectedIdeas.has(ideaIndex)) {
                            ideas.push(match[1].replace(/\*+/g, '').trim());
                        }
                        ideaIndex++;
                    }
                }
                return ideas;
            },
        }));
    }

    return create<GenerationState>((set, get) => ({
        ...baseState(),
        ...baseActions(set, get),
        startGeneration: (elementLabel, pageUrl) => {
            const entry: GenerationEntry = {
                id: crypto.randomUUID(),
                content: '',
                elementLabel,
                pageUrl,
                timestamp: Date.now(),
            };
            addEntry(set, get, entry);
        },
    }));
}

function baseState() {
    return {
        entries: [] as GenerationEntry[],
        currentIndex: -1,
        streamingIndex: -1,
        isStreaming: false,
        error: null as string | null,
    };
}

function baseActions(
    set: (partial: Partial<GenerationState>) => void,
    get: () => GenerationState,
) {
    return {
        appendContent: (chunk: string) => {
            const { entries, streamingIndex } = get();
            if (streamingIndex < 0 || streamingIndex >= entries.length) return;
            const updated = [...entries];
            updated[streamingIndex] = {
                ...updated[streamingIndex],
                content: updated[streamingIndex].content + chunk,
            };
            set({ entries: updated });
        },
        setStreaming: (streaming: boolean) => set({ isStreaming: streaming, streamingIndex: streaming ? get().streamingIndex : -1 }),
        setError: (error: string | null) => set({ error, isStreaming: false, streamingIndex: -1 }),
        navigateTo: (index: number) => {
            const { entries } = get();
            if (index >= 0 && index < entries.length) {
                set({ currentIndex: index });
            }
        },
        updateElementLabel: (index: number, label: string) => {
            const { entries } = get();
            if (index < 0 || index >= entries.length) return;
            const updated = [...entries];
            updated[index] = { ...updated[index], elementLabel: label };
            set({ entries: updated });
        },
        removeCurrent: () => {
            const { entries, currentIndex, streamingIndex } = get();
            if (currentIndex < 0 || currentIndex >= entries.length) return;
            const updated = entries.filter((_, i) => i !== currentIndex);
            // Adjust streamingIndex if it was after the removed entry
            let newStreamingIndex = streamingIndex;
            if (streamingIndex === currentIndex) {
                newStreamingIndex = -1; // stop streaming into removed entry
            } else if (streamingIndex > currentIndex) {
                newStreamingIndex = streamingIndex - 1;
            }
            const newIndex = updated.length === 0 ? -1 : Math.min(currentIndex, updated.length - 1);
            set({ entries: updated, currentIndex: newIndex, streamingIndex: newStreamingIndex });
        },
        clearAll: () => set({ entries: [], currentIndex: -1, streamingIndex: -1, isStreaming: false, error: null }),
    };
}

function addEntry(
    set: (partial: Partial<GenerationState>) => void,
    get: () => GenerationState,
    entry: GenerationEntry,
) {
    const { entries } = get();
    let updated = [...entries, entry];
    let newIndex = updated.length - 1;
    if (updated.length > MAX_ENTRIES) {
        updated = updated.slice(updated.length - MAX_ENTRIES);
        newIndex = updated.length - 1;
    }
    set({ entries: updated, currentIndex: newIndex, streamingIndex: newIndex, isStreaming: true, error: null });
}
