import { useEffect, useMemo, useRef } from 'react';
import {
    buildAutomationPrompt,
    AUTOMATION_SYSTEM_MESSAGE,
} from '../lib/prompt-builder';
import { deriveElementLabel } from '../lib/element-label';
import { useElementStore } from '../stores/element-store';
import { useSettingsStore } from '../stores/settings-store';
import { useCodeStore } from '../stores/code-store';
import { useAIGenerate } from '../hooks/useAIGenerate';
import { useElementPicker } from '../hooks/useElementPicker';
import { ElementPreview } from './ElementPreview';
import { GenerationHistory } from './GenerationHistory';
import { CodeResult } from './CodeResult';
import type { PickedElement } from '../lib/types';

interface PendingAutomation {
    ideas: string[];
    element: PickedElement;
}

interface CodeTabProps {
    pendingAutomation: PendingAutomation | null;
    onClearPending: () => void;
}

export function CodeTab({ pendingAutomation, onClearPending }: CodeTabProps) {
    const { pickedElement, isPicking } = useElementStore();
    const { framework, language, usePOM } = useSettingsStore();
    const { handlePickElement } = useElementPicker();
    const store = useCodeStore();
    const pendingProcessed = useRef(false);

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

    // Handle pending automation from Ideas tab
    useEffect(() => {
        if (pendingAutomation && !pendingProcessed.current) {
            pendingProcessed.current = true;
            const { ideas, element } = pendingAutomation;
            const pageContext = { url: element.pageUrl, title: element.pageTitle };
            const prompt = buildAutomationPrompt(element, pageContext, framework, language, usePOM, ideas);
            const label = deriveElementLabel(element);
            generate(prompt, AUTOMATION_SYSTEM_MESSAGE, label, element.pageUrl).then(() => {
                onClearPending();
            });
        }
        if (!pendingAutomation) {
            pendingProcessed.current = false;
        }
    }, [pendingAutomation, framework, language, usePOM, generate, onClearPending]);

    const currentEntry = store.entries[store.currentIndex];
    const hasElement = pickedElement !== null;
    const isCurrentStreaming = store.isStreaming && store.currentIndex === store.streamingIndex;
    const hasResults = currentEntry && currentEntry.content.length > 0;

    const handleAutomateTests = async () => {
        if (!pickedElement) return;
        const pageContext = { url: pickedElement.pageUrl, title: pickedElement.pageTitle };
        const prompt = buildAutomationPrompt(pickedElement, pageContext, framework, language, usePOM);
        const label = deriveElementLabel(pickedElement);
        await generate(prompt, AUTOMATION_SYSTEM_MESSAGE, label, pickedElement.pageUrl);
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <button
                    onClick={handlePickElement}
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        isPicking
                            ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
                    }`}
                >
                    {isPicking ? 'Cancel Picking' : 'Pick Element'}
                </button>
                <button
                    disabled={!hasElement || store.isStreaming}
                    onClick={handleAutomateTests}
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        hasElement && !store.isStreaming
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                    }`}
                >
                    Automate Tests
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
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
                    <p className="font-medium">Error</p>
                    <p>{store.error}</p>
                </div>
            )}

            {isCurrentStreaming && !hasResults && (
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600 dark:border-gray-600 dark:border-t-indigo-400" />
                    Generating...
                </div>
            )}

            {hasResults && (
                <CodeResult
                    content={currentEntry.content}
                    isStreaming={isCurrentStreaming}
                    language={language}
                />
            )}
        </div>
    );
}
