import { useCallback } from 'react';
import { createAIProvider } from '../lib/ai-provider';
import { useSettingsStore } from '../stores/settings-store';

export interface GenerationStoreActions {
    startGeneration: (elementLabel: string, pageUrl: string) => void;
    appendContent: (chunk: string) => void;
    setStreaming: (streaming: boolean) => void;
    setError: (error: string | null) => void;
}

export function useAIGenerate(storeActions: GenerationStoreActions) {
    const settings = useSettingsStore();

    const generate = useCallback(
        async (prompt: string, systemMessage: string, elementLabel: string, pageUrl: string) => {
            storeActions.startGeneration(elementLabel, pageUrl);

            try {
                const provider = createAIProvider({
                    provider: settings.provider,
                    apiKey: settings.apiKey,
                    model: settings.model,
                    useProxy: settings.useProxy,
                });

                for await (const chunk of provider.stream(prompt, systemMessage)) {
                    storeActions.appendContent(chunk);
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : 'An unexpected error occurred';
                storeActions.setError(message);
            } finally {
                storeActions.setStreaming(false);
            }
        },
        [settings.provider, settings.apiKey, settings.model, settings.useProxy, storeActions],
    );

    return { generate };
}
