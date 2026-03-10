import { useState } from 'react';
import { ACTIONS, FREE_TIER_MODEL } from '../lib/constants';
import type { DetectedFormField, TestDataSet } from '../lib/form-data';
import {
    buildTestDataPrompt,
    parseTestDataSets,
    TEST_DATA_SYSTEM_MESSAGE,
} from '../lib/prompt-builder';
import { createAIProvider, AIProviderError } from '../lib/ai-provider';
import { useSettingsStore } from '../stores/settings-store';
import { useAuthStore, canGenerate, isFreeTier } from '../stores/auth-store';

export function TestDataTab() {
    const settings = useSettingsStore();
    const token = useAuthStore((s) => s.token);
    const signOut = useAuthStore((s) => s.signOut);
    const refreshUsage = useAuthStore((s) => s.refreshUsage);

    const [fields, setFields] = useState<DetectedFormField[]>([]);
    const [datasets, setDatasets] = useState<TestDataSet[]>([]);
    const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
    const [isDetecting, setIsDetecting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isFilling, setIsFilling] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDetectFields = async () => {
        setIsDetecting(true);
        setError(null);
        setDatasets([]);
        setSelectedDatasetId('');

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) {
                setError('No active tab found.');
                return;
            }

            const response = await chrome.tabs.sendMessage(tab.id, { action: ACTIONS.DETECT_FORM_FIELDS });
            const detected = Array.isArray(response?.fields) ? response.fields : [];
            setFields(detected);
            if (detected.length === 0) {
                setError('No form fields were detected on the current page.');
            }
        } catch {
            setError('Failed to detect fields. Make sure you are on a standard web page.');
        } finally {
            setIsDetecting(false);
        }
    };

    const handleGenerateData = async () => {
        if (fields.length === 0) {
            setError('Detect fields first before generating test data.');
            return;
        }

        if (!canGenerate(settings.apiKey, token)) {
            setError('Sign in with Google or add an API key in Settings to generate.');
            return;
        }

        setIsGenerating(true);
        setError(null);

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

            const prompt = buildTestDataPrompt(fields, pageContext, settings.promptContext);
            let content = '';
            for await (const chunk of provider.stream(prompt, TEST_DATA_SYSTEM_MESSAGE)) {
                content += chunk;
            }

            const parsed = parseTestDataSets(content);
            if (parsed.length === 0) {
                setError('AI response could not be parsed into datasets. Try again.');
                return;
            }

            setDatasets(parsed);
            setSelectedDatasetId(parsed[0].id);

            if (useProxy) {
                refreshUsage();
            }
        } catch (err) {
            if (err instanceof AIProviderError && err.status === 401 && isFreeTier(settings.apiKey, token)) {
                signOut();
            }
            const message = err instanceof Error ? err.message : 'Failed to generate test data.';
            setError(message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFillSelected = async () => {
        const selected = datasets.find((d) => d.id === selectedDatasetId);
        if (!selected) {
            setError('Select a dataset first.');
            return;
        }

        setIsFilling(true);
        setError(null);

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) {
                setError('No active tab found.');
                return;
            }

            const response = await chrome.tabs.sendMessage(tab.id, {
                action: ACTIONS.FILL_FORM_DATA,
                payload: { valuesBySelector: selected.values },
            });

            const filledCount = Number(response?.filledCount ?? 0);
            if (filledCount === 0) {
                setError('No fields were filled. The page may have changed since detection.');
            }
        } catch {
            setError('Failed to auto-fill the form.');
        } finally {
            setIsFilling(false);
        }
    };

    const selectedDataset = datasets.find((d) => d.id === selectedDatasetId);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
                <button
                    onClick={handleDetectFields}
                    disabled={isDetecting || isGenerating || isFilling}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        !isDetecting && !isGenerating && !isFilling
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
                            : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                    }`}
                >
                    {isDetecting ? 'Detecting...' : 'Detect Form Fields'}
                </button>

                <button
                    onClick={handleGenerateData}
                    disabled={fields.length === 0 || isGenerating || isDetecting || isFilling}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                        fields.length > 0 && !isGenerating && !isDetecting && !isFilling
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                    }`}
                >
                    {isGenerating ? 'Generating...' : 'Generate Datasets'}
                </button>
            </div>

            {fields.length > 0 && (
                <div className="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
                    <p className="font-medium">Detected Fields ({fields.length})</p>
                    <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-300">
                        {fields.slice(0, 10).map((field) => (
                            <li key={field.selector}>
                                {field.label} <span className="text-gray-400">({field.type})</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {datasets.length > 0 && (
                <div className="space-y-2">
                    <label className="block text-sm font-medium">Select Dataset</label>
                    <select
                        value={selectedDatasetId}
                        onChange={(e) => setSelectedDatasetId(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
                    >
                        {datasets.map((dataset) => (
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
                        disabled={!selectedDataset || isFilling || isGenerating || isDetecting}
                        className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                            selectedDataset && !isFilling && !isGenerating && !isDetecting
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600'
                                : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                        }`}
                    >
                        {isFilling ? 'Filling...' : 'Auto-fill Form'}
                    </button>
                </div>
            )}

            {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-400">
                    <p className="font-medium">Error</p>
                    <p>{error}</p>
                </div>
            )}
        </div>
    );
}
