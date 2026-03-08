import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore } from './settings-store';
import { STORAGE_KEYS } from '../lib/constants';
import { setChromeStoreData } from '../test/chrome-mock';

describe('useSettingsStore', () => {
    beforeEach(() => {
        useSettingsStore.setState({
            provider: 'openai',
            apiKey: '',
            apiKeys: { openai: '', anthropic: '', google: '' },
            model: 'gpt-4o',
            framework: 'playwright',
            language: 'typescript',
            usePOM: false,
            useProxy: false,
        });
    });

    it('starts with default settings', () => {
        const state = useSettingsStore.getState();
        expect(state.provider).toBe('openai');
        expect(state.model).toBe('gpt-4o');
        expect(state.framework).toBe('playwright');
        expect(state.language).toBe('typescript');
    });

    it('updates provider and sets default model', () => {
        useSettingsStore.getState().updateSettings({ provider: 'anthropic' });
        const state = useSettingsStore.getState();
        expect(state.provider).toBe('anthropic');
        expect(state.model).toBe('claude-sonnet-4-6');
    });

    it('persists settings to chrome.storage', () => {
        useSettingsStore.getState().updateSettings({ apiKey: 'sk-test' });
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
            [STORAGE_KEYS.SETTINGS]: expect.objectContaining({
                apiKeys: expect.objectContaining({ openai: 'sk-test' }),
            }),
        });
    });

    it('loads settings from chrome.storage', async () => {
        setChromeStoreData({
            [STORAGE_KEYS.SETTINGS]: {
                provider: 'anthropic',
                apiKeys: { openai: 'sk-oai', anthropic: 'sk-ant-test', google: '' },
                model: 'claude-sonnet-4-6',
                framework: 'cypress',
                language: 'javascript',
                usePOM: true,
                useProxy: false,
            },
        });

        await useSettingsStore.getState().loadFromStorage();

        const state = useSettingsStore.getState();
        expect(state.provider).toBe('anthropic');
        expect(state.apiKey).toBe('sk-ant-test');
        expect(state.apiKeys.openai).toBe('sk-oai');
        expect(state.framework).toBe('cypress');
        expect(state.usePOM).toBe(true);
    });

    it('migrates old single apiKey format on load', async () => {
        setChromeStoreData({
            [STORAGE_KEYS.SETTINGS]: {
                provider: 'openai',
                apiKey: 'sk-old-key',
                model: 'gpt-4o',
                framework: 'playwright',
                language: 'typescript',
                usePOM: false,
                useProxy: false,
            },
        });

        await useSettingsStore.getState().loadFromStorage();

        const state = useSettingsStore.getState();
        expect(state.apiKey).toBe('sk-old-key');
        expect(state.apiKeys.openai).toBe('sk-old-key');
    });

    it('gates language when switching to cypress', () => {
        useSettingsStore.setState({ language: 'python' });
        useSettingsStore.getState().updateSettings({ framework: 'cypress' });
        const state = useSettingsStore.getState();
        expect(state.language).toBe('javascript');
    });

    it('keeps language when it is valid for the new framework', () => {
        useSettingsStore.setState({ language: 'typescript' });
        useSettingsStore.getState().updateSettings({ framework: 'cypress' });
        expect(useSettingsStore.getState().language).toBe('typescript');
    });

    it('updates usePOM flag', () => {
        useSettingsStore.getState().updateSettings({ usePOM: true });
        expect(useSettingsStore.getState().usePOM).toBe(true);
    });

    it('stores api key per provider and switches on provider change', () => {
        useSettingsStore.getState().updateSettings({ apiKey: 'sk-openai-key' });
        expect(useSettingsStore.getState().apiKey).toBe('sk-openai-key');

        useSettingsStore.getState().updateSettings({ provider: 'anthropic' });
        expect(useSettingsStore.getState().apiKey).toBe('');

        useSettingsStore.getState().updateSettings({ apiKey: 'sk-ant-key' });
        expect(useSettingsStore.getState().apiKey).toBe('sk-ant-key');

        // Switch back to openai — key should be restored
        useSettingsStore.getState().updateSettings({ provider: 'openai' });
        expect(useSettingsStore.getState().apiKey).toBe('sk-openai-key');
    });
});
