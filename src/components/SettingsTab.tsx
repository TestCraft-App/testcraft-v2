import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settings-store';
import { PROVIDER_MODELS, FRAMEWORK_LANGUAGES } from '../lib/ai-provider';
import type { AIProviderType, Framework, Language } from '../lib/ai-provider';

const providerLabels: Record<AIProviderType, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
};

const frameworkLabels: Record<Framework, string> = {
    playwright: 'Playwright',
    cypress: 'Cypress',
    selenium: 'Selenium',
};

const languageLabels: Record<Language, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    java: 'Java',
    csharp: 'C#',
    python: 'Python',
};

export function SettingsTab() {
    const settings = useSettingsStore();
    const { provider, apiKey, model, framework, language, usePOM, updateSettings, loadFromStorage } = settings;

    useEffect(() => {
        loadFromStorage();
    }, [loadFromStorage]);

    const models = PROVIDER_MODELS[provider];
    const languages = FRAMEWORK_LANGUAGES[framework];

    return (
        <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Settings</h2>

            <div>
                <label htmlFor="provider" className="block text-xs font-medium text-gray-600 mb-1">
                    AI Provider
                </label>
                <select
                    id="provider"
                    value={provider}
                    onChange={(e) => updateSettings({ provider: e.target.value as AIProviderType })}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                >
                    {(Object.keys(providerLabels) as AIProviderType[]).map((p) => (
                        <option key={p} value={p}>
                            {providerLabels[p]}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="apiKey" className="block text-xs font-medium text-gray-600 mb-1">
                    API Key
                </label>
                <input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => updateSettings({ apiKey: e.target.value })}
                    placeholder={`Enter your ${providerLabels[provider]} API key`}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                />
            </div>

            <div>
                <label htmlFor="model" className="block text-xs font-medium text-gray-600 mb-1">
                    Model
                </label>
                <select
                    id="model"
                    value={model}
                    onChange={(e) => updateSettings({ model: e.target.value })}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                >
                    {models.map((m) => (
                        <option key={m} value={m}>
                            {m}
                        </option>
                    ))}
                </select>
            </div>

            <hr className="border-gray-200" />

            <div>
                <label htmlFor="framework" className="block text-xs font-medium text-gray-600 mb-1">
                    Test Framework
                </label>
                <select
                    id="framework"
                    value={framework}
                    onChange={(e) => updateSettings({ framework: e.target.value as Framework })}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                >
                    {(Object.keys(frameworkLabels) as Framework[]).map((f) => (
                        <option key={f} value={f}>
                            {frameworkLabels[f]}
                        </option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="language" className="block text-xs font-medium text-gray-600 mb-1">
                    Language
                </label>
                <select
                    id="language"
                    value={language}
                    onChange={(e) => updateSettings({ language: e.target.value as Language })}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
                >
                    {languages.map((l) => (
                        <option key={l} value={l}>
                            {languageLabels[l]}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex items-center gap-2">
                <input
                    id="pom"
                    type="checkbox"
                    checked={usePOM}
                    onChange={(e) => updateSettings({ usePOM: e.target.checked })}
                    className="rounded border-gray-300"
                />
                <label htmlFor="pom" className="text-sm text-gray-700">
                    Use Page Object Model
                </label>
            </div>
        </div>
    );
}
