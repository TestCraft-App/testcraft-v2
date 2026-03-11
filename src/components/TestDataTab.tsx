import { useEffect, useRef } from 'react';
import { ACTIONS, FREE_TIER_MODEL } from '../lib/constants';
import type { DetectedFormField } from '../lib/form-data';
import {
    buildTestDataPrompt,
    parseTestDataSets,
    TEST_DATA_SYSTEM_MESSAGE,
} from '../lib/prompt-builder';
import { createAIProvider, AIProviderError } from '../lib/ai-provider';
import { useSettingsStore } from '../stores/settings-store';
import { useAuthStore, canGenerate, isFreeTier } from '../stores/auth-store';
import { useTestDataStore } from '../stores/test-data-store';
import { ContextInput } from './ContextInput';

export function TestDataTab() {
    const settings = useSettingsStore();
    const token = useAuthStore((s) => s.token);
    const signOut = useAuthStore((s) => s.signOut);
    const refreshUsage = useAuthStore((s) => s.refreshUsage);

    const store = useTestDataStore();
    const hasAutoDetected = useRef(false);

    // Auto-detect on first mount when no fields cached
    useEffect(() => {
        if (store.fields.length === 0 && !hasAutoDetected.current) {
            hasAutoDetected.current = true;
            handleDetectFields();
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleDetectFields = async () => {
        store.setDetecting(true);
        store.setError(null);

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) {
                store.setError('No active tab found.');
                return;
            }

            const response = await chrome.tabs.sendMessage(tab.id, { action: ACTIONS.DETECT_FORM_FIELDS });
            const detected: DetectedFormField[] = Array.isArray(response?.fields) ? response.fields : [];
            store.setFields(detected);
            if (detected.length === 0) {
                store.setError('No form fields were detected on the current page.');
            }
        } catch {
            store.setError('Failed to detect fields. Make sure you are on a standard web page.');
        } finally {
            store.setDetecting(false);
        }
    };

    const handleGenerateData = async () => {
        const selectedFields = store.fields.filter((f) => store.selectedSelectors.has(f.selector));
        if (selectedFields.length === 0) {
            store.setError('Select at least one field to generate test data.');
            return;
        }

        if (!canGenerate(settings.apiKey, token)) {
            store.setError('Sign in with Google or add an API key in Settings to generate.');
            return;
        }

        store.setGenerating(true);
        store.setError(null);

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const pageContext = {
                url: tab?.url ?? '',
                title: tab?.title ?? 'Current page',
            };

            const useProxy = isFreeTier(settings.apiKey, token);
            const provider = createAIProvider({
                provider: settings.apiKey ? settings.provider : 'openai',
                apiKey: settings.apiKey,
                model: useProxy ? FREE_TIER_MODEL : settings.model,
                useProxy,
                authToken: useProxy ? (token ?? undefined) : undefined,
            });

            const prompt = buildTestDataPrompt(selectedFields, pageContext, settings.promptContext);
            let content = '';
            for await (const chunk of provider.stream(prompt, TEST_DATA_SYSTEM_MESSAGE)) {
                content += chunk;
            }

            const parsed = parseTestDataSets(content);
            if (parsed.length === 0) {
                store.setError('AI response could not be parsed into datasets. Try again.');
                return;
            }

            store.setDatasets(parsed);

            if (useProxy) {
                refreshUsage();
            }
        } catch (err) {
            if (err instanceof AIProviderError && err.status === 401 && isFreeTier(settings.apiKey, token)) {
                signOut();
            }
            const message = err instanceof Error ? err.message : 'Failed to generate test data.';
            store.setError(message);
        } finally {
            store.setGenerating(false);
        }
    };

    const handleFillSelected = async () => {
        const selected = store.datasets.find((d) => d.id === store.selectedDatasetId);
        if (!selected) {
            store.setError('Select a dataset first.');
            return;
        }

        store.setFilling(true);
        store.setError(null);

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) {
                store.setError('No active tab found.');
                return;
            }

            const response = await chrome.tabs.sendMessage(tab.id, {
                action: ACTIONS.FILL_FORM_DATA,
                payload: { valuesBySelector: selected.values },
            });

            const filledCount = Number(response?.filledCount ?? 0);
            if (filledCount === 0) {
                store.setError('No fields were filled. The page may have changed since detection.');
            }
        } catch {
            store.setError('Failed to auto-fill the form.');
        } finally {
            store.setFilling(false);
        }
    };

    const isBusy = store.isDetecting || store.isGenerating || store.isFilling;
    const selectedCount = store.selectedSelectors.size;
    const allSelected = store.fields.length > 0 && selectedCount === store.fields.length;
    const selectedDataset = store.datasets.find((d) => d.id === store.selectedDatasetId);

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <button
                    onClick={handleDetectFields}
                    disabled={isBusy}
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        !isBusy
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
                            : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                    }`}
                >
                    {store.isDetecting ? 'Detecting...' : 'Detect Fields'}
                </button>
                <button
                    onClick={handleGenerateData}
                    disabled={selectedCount === 0 || isBusy}
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        selectedCount > 0 && !isBusy
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                    }`}
                >
                    {store.isGenerating ? 'Generating...' : 'Generate Data'}
                </button>
            </div>

            <ContextInput />

            {store.fields.length > 0 && (
                <DetectedFieldsList
                    fields={store.fields}
                    selectedSelectors={store.selectedSelectors}
                    onToggle={store.toggleField}
                    allSelected={allSelected}
                    onToggleAll={allSelected ? store.deselectAllFields : store.selectAllFields}
                />
            )}

            {store.datasets.length > 0 && (
                <div className="space-y-2">
                    <label className="block text-sm font-medium">Select Dataset</label>
                    <select
                        value={store.selectedDatasetId}
                        onChange={(e) => store.setSelectedDatasetId(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                    >
                        {store.datasets.map((dataset) => (
                            <option key={dataset.id} value={dataset.id}>
                                {dataset.name}
                            </option>
                        ))}
                    </select>

                    {selectedDataset && (
                        <pre className="max-h-48 overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
                            {JSON.stringify(selectedDataset.values, null, 2)}
                        </pre>
                    )}

                    <button
                        onClick={handleFillSelected}
                        disabled={!selectedDataset || isBusy}
                        className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                            selectedDataset && !isBusy
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600'
                                : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                        }`}
                    >
                        {store.isFilling ? 'Filling...' : 'Auto-fill Form'}
                    </button>
                </div>
            )}

            {store.error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
                    <p className="font-medium">Error</p>
                    <p>{store.error}</p>
                </div>
            )}
        </div>
    );
}

interface DetectedFieldsListProps {
    fields: DetectedFormField[];
    selectedSelectors: Set<string>;
    onToggle: (selector: string) => void;
    allSelected: boolean;
    onToggleAll: () => void;
}

function DetectedFieldsList({ fields, selectedSelectors, onToggle, allSelected, onToggleAll }: DetectedFieldsListProps) {
    const selectedCount = selectedSelectors.size;

    return (
        <div className="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
            <div className="flex items-center justify-between">
                <p className="font-medium">
                    Fields ({selectedCount}/{fields.length} selected)
                </p>
                <button
                    type="button"
                    onClick={onToggleAll}
                    className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                    {allSelected ? 'Deselect All' : 'Select All'}
                </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                {fields.map((field) => (
                    <label
                        key={field.selector}
                        className="flex items-center gap-1.5 truncate text-gray-600 dark:text-gray-300"
                        title={`${field.label} (${field.type})`}
                    >
                        <input
                            type="checkbox"
                            checked={selectedSelectors.has(field.selector)}
                            onChange={() => onToggle(field.selector)}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600"
                        />
                        <span className="truncate text-xs">
                            {field.label} <span className="text-gray-400">({field.type})</span>
                        </span>
                    </label>
                ))}
            </div>
        </div>
    );
}
