import { useCallback } from 'react';
import { createAIProvider, AIProviderError } from '../lib/ai-provider';
import { FREE_TIER_MODEL } from '../lib/constants';
import { useSettingsStore } from '../stores/settings-store';
import { useAuthStore, isFreeTier, canGenerate } from '../stores/auth-store';

export interface GenerationStoreActions {
    startGeneration: (elementLabel: string, pageUrl: string) => void;
    appendContent: (chunk: string) => void;
    setStreaming: (streaming: boolean) => void;
    setError: (error: string | null) => void;
}

export function useAIGenerate(storeActions: GenerationStoreActions) {
    const settings = useSettingsStore();
    const token = useAuthStore((s) => s.token);
    const signOut = useAuthStore((s) => s.signOut);
    const refreshUsage = useAuthStore((s) => s.refreshUsage);

    const generate = useCallback(
        async (prompt: string, systemMessage: string, elementLabel: string, pageUrl: string) => {
            // Determine generation mode based on useOwnKey toggle
            const effectiveKey = settings.useOwnKey ? settings.apiKey : '';
            const hasKey = !!effectiveKey;
            const useProxy = isFreeTier(effectiveKey, token);

            if (!canGenerate(effectiveKey, token)) {
                storeActions.setError(
                    settings.useOwnKey
                        ? 'Add an API key in Settings to generate.'
                        : 'Sign in with Google or enable your API key in Settings to generate.',
                );
                return;
            }

            storeActions.startGeneration(elementLabel, pageUrl);

            try {
                const provider = createAIProvider({
                    provider: hasKey ? settings.provider : 'openai',
                    apiKey: effectiveKey,
                    model: useProxy ? FREE_TIER_MODEL : settings.model,
                    useProxy,
                    authToken: useProxy ? (token ?? undefined) : undefined,
                });

                for await (const chunk of provider.stream(prompt, systemMessage)) {
                    storeActions.appendContent(chunk);
                }

                // On successful proxy generation, refresh usage count
                if (useProxy) {
                    refreshUsage();
                }
            } catch (err) {
                if (err instanceof AIProviderError && err.status === 401 && useProxy) {
                    signOut();
                }
                const message = err instanceof Error ? err.message : 'An unexpected error occurred';
                storeActions.setError(message);
            } finally {
                storeActions.setStreaming(false);
            }
        },
        [settings.provider, settings.apiKey, settings.model, settings.useOwnKey, token, signOut, refreshUsage, storeActions],
    );

    return { generate };
}
