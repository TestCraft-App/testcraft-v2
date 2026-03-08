import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settings-store';
import { PROVIDER_MODELS, FRAMEWORK_LANGUAGES } from '../lib/ai-provider';
import type { AIProviderType, Framework, Language } from '../lib/ai-provider';
import type { Theme } from '../stores/settings-store';

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

const selectClasses =
    'w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20';

const labelClasses = 'block text-xs font-medium text-gray-600 mb-1 dark:text-gray-400';

const themeOptions: { value: Theme; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
];

export function SettingsTab() {
    const settings = useSettingsStore();
    const { provider, apiKey, model, framework, language, usePOM, theme, updateSettings, loadFromStorage } = settings;

    useEffect(() => {
        loadFromStorage();
    }, [loadFromStorage]);

    const models = PROVIDER_MODELS[provider];
    const languages = FRAMEWORK_LANGUAGES[framework];

    return (
        <div className="space-y-4">
            {/* AI Configuration */}
            <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-3 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-indigo-500">
                        <path d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" />
                    </svg>
                    AI Configuration
                </h3>

                <div>
                    <label htmlFor="provider" className={labelClasses}>
                        AI Provider
                    </label>
                    <select
                        id="provider"
                        value={provider}
                        onChange={(e) => updateSettings({ provider: e.target.value as AIProviderType })}
                        className={selectClasses}
                    >
                        {(Object.keys(providerLabels) as AIProviderType[]).map((p) => (
                            <option key={p} value={p}>
                                {providerLabels[p]}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="apiKey" className={labelClasses}>
                        API Key
                    </label>
                    <input
                        id="apiKey"
                        type="password"
                        value={apiKey}
                        onChange={(e) => updateSettings({ apiKey: e.target.value })}
                        placeholder={`Enter your ${providerLabels[provider]} API key`}
                        className={selectClasses}
                    />
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        Your key is stored locally and never sent to our servers.
                    </p>
                </div>

                <div>
                    <label htmlFor="model" className={labelClasses}>
                        Model
                    </label>
                    <select
                        id="model"
                        value={model}
                        onChange={(e) => updateSettings({ model: e.target.value })}
                        className={selectClasses}
                    >
                        {models.map((m) => (
                            <option key={m} value={m}>
                                {m}
                            </option>
                        ))}
                    </select>
                </div>
            </section>

            {/* Test Configuration */}
            <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-3 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-indigo-500">
                        <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v11.5A2.25 2.25 0 0 0 4.25 18h11.5A2.25 2.25 0 0 0 18 15.75V4.25A2.25 2.25 0 0 0 15.75 2H4.25Zm4.03 6.28a.75.75 0 0 0-1.06-1.06L4.97 9.47a.75.75 0 0 0 0 1.06l2.25 2.25a.75.75 0 0 0 1.06-1.06L6.56 10l1.72-1.72Zm3.44-1.06a.75.75 0 1 0-1.06 1.06L12.38 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06l2.25-2.25a.75.75 0 0 0 0-1.06l-2.25-2.25Z" clipRule="evenodd" />
                    </svg>
                    Test Configuration
                </h3>

                <div>
                    <label htmlFor="framework" className={labelClasses}>
                        Test Framework
                    </label>
                    <select
                        id="framework"
                        value={framework}
                        onChange={(e) => updateSettings({ framework: e.target.value as Framework })}
                        className={selectClasses}
                    >
                        {(Object.keys(frameworkLabels) as Framework[]).map((f) => (
                            <option key={f} value={f}>
                                {frameworkLabels[f]}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="language" className={labelClasses}>
                        Language
                    </label>
                    <select
                        id="language"
                        value={language}
                        onChange={(e) => updateSettings({ language: e.target.value as Language })}
                        className={selectClasses}
                    >
                        {languages.map((l) => (
                            <option key={l} value={l}>
                                {languageLabels[l]}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center justify-between">
                    <label htmlFor="pom" className="text-sm text-gray-700 dark:text-gray-300">
                        Use Page Object Model
                    </label>
                    <button
                        id="pom"
                        role="switch"
                        aria-checked={usePOM}
                        onClick={() => updateSettings({ usePOM: !usePOM })}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            usePOM ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                usePOM ? 'translate-x-4' : 'translate-x-0'
                            }`}
                        />
                    </button>
                </div>
            </section>

            {/* Preferences */}
            <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-3 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-indigo-500">
                        <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
                    </svg>
                    Preferences
                </h3>

                <div>
                    <label className={labelClasses}>Theme</label>
                    <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                        {themeOptions.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => updateSettings({ theme: opt.value })}
                                className={`flex-1 px-3 py-1.5 text-sm font-medium transition-colors ${
                                    theme === opt.value
                                        ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
