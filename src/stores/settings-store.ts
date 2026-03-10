import { create } from 'zustand';
import type { AIProviderType, Framework, Language } from '../lib/ai-provider';
import { DEFAULT_MODELS, FRAMEWORK_LANGUAGES } from '../lib/ai-provider';
import { STORAGE_KEYS } from '../lib/constants';

export type Theme = 'light' | 'dark' | 'system';

export interface Settings {
    provider: AIProviderType;
    apiKeys: Record<AIProviderType, string>;
    model: string;
    framework: Framework;
    language: Language;
    usePOM: boolean;
    useProxy: boolean;
    theme: Theme;
    promptContext: string;
}

const defaultSettings: Settings = {
    provider: 'openai',
    apiKeys: { openai: '', anthropic: '', google: '' },
    model: DEFAULT_MODELS.openai,
    framework: 'playwright',
    language: 'typescript',
    usePOM: false,
    useProxy: false,
    theme: 'light',
    promptContext: '',
};

interface SettingsState extends Settings {
    /** The API key for the currently selected provider */
    apiKey: string;
    updateSettings: (partial: Partial<Settings> & { apiKey?: string }) => void;
    loadFromStorage: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
    ...defaultSettings,
    apiKey: '',

    updateSettings: (partial) => {
        const state = get();

        // If apiKey is provided, update the key for the current (or new) provider
        if (partial.apiKey !== undefined) {
            const targetProvider = partial.provider ?? state.provider;
            const updatedKeys = { ...state.apiKeys, ...partial.apiKeys, [targetProvider]: partial.apiKey };
            partial.apiKeys = updatedKeys;
        }

        // If framework changes, validate language
        if (partial.framework) {
            const allowedLanguages = FRAMEWORK_LANGUAGES[partial.framework];
            const currentLang = partial.language ?? state.language;
            if (!allowedLanguages.includes(currentLang)) {
                partial.language = allowedLanguages[0];
            }
        }

        // If provider changes, set default model
        if (partial.provider && !partial.model) {
            partial.model = DEFAULT_MODELS[partial.provider];
        }

        set(partial);

        // Derive apiKey from apiKeys for the active provider
        const newState = get();
        const activeKey = newState.apiKeys[newState.provider] ?? '';
        set({ apiKey: activeKey });

        // Persist to storage
        const toStore: Settings = {
            provider: newState.provider,
            apiKeys: newState.apiKeys,
            model: newState.model,
            framework: newState.framework,
            language: newState.language,
            usePOM: newState.usePOM,
            useProxy: newState.useProxy,
            theme: newState.theme,
            promptContext: newState.promptContext,
        };
        chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: toStore });
    },

    loadFromStorage: async () => {
        const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
        const stored = result[STORAGE_KEYS.SETTINGS] as (Settings & { apiKey?: string }) | undefined;
        if (stored) {
            // Migrate from old single apiKey format
            if (!stored.apiKeys && stored.apiKey) {
                stored.apiKeys = { openai: '', anthropic: '', google: '', [stored.provider]: stored.apiKey };
            }
            const apiKeys = stored.apiKeys ?? defaultSettings.apiKeys;
            set({
                ...stored,
                apiKeys,
                apiKey: apiKeys[stored.provider] ?? '',
            });
        }
    },
}));
