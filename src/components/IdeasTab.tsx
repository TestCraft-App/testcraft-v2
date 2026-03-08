import { useMemo } from 'react';
import {
    buildTestIdeasPrompt,
    TEST_IDEAS_SYSTEM_MESSAGE,
} from '../lib/prompt-builder';
import { deriveElementLabel } from '../lib/element-label';
import { useElementStore } from '../stores/element-store';
import { useIdeasStore } from '../stores/ideas-store';
import { useAIGenerate } from '../hooks/useAIGenerate';
import { useElementPicker } from '../hooks/useElementPicker';
import { ElementPreview } from './ElementPreview';
import { GenerationHistory } from './GenerationHistory';
import { TestIdeasResult } from './TestIdeasResult';
import type { PickedElement } from '../lib/types';

interface IdeasTabProps {
    onAutomateSelected: (ideas: string[], element: PickedElement) => void;
}

export function IdeasTab({ onAutomateSelected }: IdeasTabProps) {
    const { pickedElement, isPicking } = useElementStore();
    const { handlePickElement } = useElementPicker();
    const store = useIdeasStore();

    const storeActions = useMemo(
        () => ({
            startGeneration: store.startGeneration,
            appendContent: store.appendContent,
            setStreaming: store.setStreaming,
            setError: store.setError,
        }),
        [store.startGeneration, store.appendContent, store.setStreaming, store.setError],
    );
    const { generate } = useAIGenerate(storeActions);

    const currentEntry = store.entries[store.currentIndex];
    const hasElement = pickedElement !== null;
    const isCurrentStreaming = store.isStreaming && store.currentIndex === store.streamingIndex;
    const hasResults = currentEntry && currentEntry.content.length > 0;
    const selectedCount = currentEntry?.selectedIdeas?.size ?? 0;

    const handleGenerateIdeas = async () => {
        if (!pickedElement) return;
        const pageContext = { url: pickedElement.pageUrl, title: pickedElement.pageTitle };
        const prompt = buildTestIdeasPrompt(pickedElement, pageContext);
        const label = deriveElementLabel(pickedElement);
        await generate(prompt, TEST_IDEAS_SYSTEM_MESSAGE, label, pickedElement.pageUrl);
    };

    const handleAutomateSelected = () => {
        if (!pickedElement || selectedCount === 0) return;
        const ideas = store.getSelectedIdeasText();
        onAutomateSelected(ideas, pickedElement);
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <button
                    onClick={handlePickElement}
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        isPicking
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                >
                    {isPicking ? 'Cancel Picking' : 'Pick Element'}
                </button>
                <button
                    disabled={!hasElement || store.isStreaming}
                    onClick={handleGenerateIdeas}
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        hasElement && !store.isStreaming
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-gray-100 text-gray-400'
                    }`}
                >
                    Generate Ideas
                </button>
            </div>

            {hasElement && <ElementPreview />}

            {store.entries.length > 0 && (
                <GenerationHistory
                    entries={store.entries}
                    currentIndex={store.currentIndex}
                    onNavigate={store.navigateTo}
                    onUpdateLabel={store.updateElementLabel}
                    onRemove={store.removeCurrent}
                />
            )}

            {store.error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    <p className="font-medium">Error</p>
                    <p>{store.error}</p>
                </div>
            )}

            {isCurrentStreaming && !hasResults && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
                    Generating...
                </div>
            )}

            {hasResults && (
                <TestIdeasResult
                    content={currentEntry.content}
                    isStreaming={isCurrentStreaming}
                    selectedIdeas={currentEntry.selectedIdeas ?? new Set()}
                    onToggleIdea={store.toggleIdea}
                />
            )}

            {selectedCount > 0 && !isCurrentStreaming && (
                <button
                    onClick={handleAutomateSelected}
                    className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                    Automate Selected ({selectedCount})
                </button>
            )}
        </div>
    );
}
