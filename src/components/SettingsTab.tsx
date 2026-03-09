import { useCallback, useEffect, useRef, useState } from 'react';
import { useSettingsStore } from '../stores/settings-store';
import { useAuthStore } from '../stores/auth-store';
import { PROVIDER_MODELS, FRAMEWORK_LANGUAGES, validateApiKey } from '../lib/ai-provider';
import { FREE_TIER_MODEL, DAILY_LIMIT } from '../lib/constants';
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

type KeyStatus = 'idle' | 'validating' | 'valid' | 'invalid';

export function SettingsTab() {
    const settings = useSettingsStore();
    const { provider, apiKey, model, framework, language, usePOM, theme, updateSettings, loadFromStorage } = settings;
    const { user, dailyUsage, isSigningIn, signIn, signOut } = useAuthStore();
    const token = useAuthStore((s) => s.token);
    const [keyStatus, setKeyStatus] = useState<KeyStatus>('idle');
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    const hasValidKey = keyStatus === 'valid';
    const isSignedIn = !!token;
    const showFreeTier = isSignedIn && !hasValidKey;

    useEffect(() => {
        loadFromStorage();
    }, [loadFromStorage]);

    // Validate API key with debounce when key or provider changes
    const runValidation = useCallback(
        (currentProvider: AIProviderType, currentKey: string) => {
            if (debounceRef.current) clearTimeout(debounceRef.current);

            if (!currentKey) {
                setKeyStatus('idle');
                return;
            }

            setKeyStatus('validating');
            debounceRef.current = setTimeout(async () => {
                const valid = await validateApiKey(currentProvider, currentKey);
                setKeyStatus(valid ? 'valid' : 'invalid');
            }, 600);
        },
        [],
    );

    useEffect(() => {
        runValidation(provider, apiKey);
    }, [provider, apiKey, runValidation]);

    const models = PROVIDER_MODELS[provider];
    const languages = FRAMEWORK_LANGUAGES[framework];

    return (
        <div className="space-y-4">
            {/* Account */}
            <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-3 dark:border-gray-700 dark:bg-gray-800">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-indigo-500">
                        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-5.5-2.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM10 12a5.99 5.99 0 0 0-4.793 2.39A6.483 6.483 0 0 0 10 16.5a6.483 6.483 0 0 0 4.793-2.11A5.99 5.99 0 0 0 10 12Z" clipRule="evenodd" />
                    </svg>
                    Account
                </h3>

                {user ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            {user.picture && (
                                <img
                                    src={user.picture}
                                    alt=""
                                    className="h-8 w-8 rounded-full"
                                    referrerPolicy="no-referrer"
                                />
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {user.name}
                                </p>
                                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                            </div>
                        </div>

                        {showFreeTier && (
                            <div>
                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    <span>Free tier usage</span>
                                    <span>
                                        {dailyUsage} / {DAILY_LIMIT} used today
                                    </span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                                    <div
                                        className={`h-2 rounded-full transition-all ${dailyUsage >= DAILY_LIMIT ? 'bg-red-500' : 'bg-indigo-500'}`}
                                        style={{ width: `${Math.min((dailyUsage / DAILY_LIMIT) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            onClick={signOut}
                            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            Sign Out
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <button
                            onClick={signIn}
                            disabled={isSigningIn}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                        >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
                        </button>
                        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                            Sign in for free AI features ({DAILY_LIMIT}/day with {FREE_TIER_MODEL})
                        </p>
                    </div>
                )}
            </section>

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
                    <div className="relative">
                        <input
                            id="apiKey"
                            type="password"
                            value={apiKey}
                            onChange={(e) => updateSettings({ apiKey: e.target.value })}
                            placeholder={`Enter your ${providerLabels[provider]} API key`}
                            className={`${selectClasses} pr-8`}
                        />
                        {keyStatus !== 'idle' && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm" aria-label={keyStatus}>
                                {keyStatus === 'validating' && (
                                    <svg className="h-4 w-4 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                )}
                                {keyStatus === 'valid' && (
                                    <svg className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                                {keyStatus === 'invalid' && (
                                    <svg className="h-4 w-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        {keyStatus === 'invalid'
                            ? `Invalid ${providerLabels[provider]} API key.`
                            : showFreeTier
                              ? 'Add your own key for unlimited usage with any model.'
                              : 'Your key is stored locally and never sent to our servers.'}
                    </p>
                </div>

                <div>
                    <label htmlFor="model" className={labelClasses}>
                        Model
                    </label>
                    <select
                        id="model"
                        value={hasValidKey ? model : FREE_TIER_MODEL}
                        onChange={(e) => updateSettings({ model: e.target.value })}
                        className={selectClasses}
                        disabled={!hasValidKey}
                    >
                        {hasValidKey ? (
                            models.map((m) => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))
                        ) : (
                            <option value={FREE_TIER_MODEL}>
                                {FREE_TIER_MODEL}{showFreeTier ? ' (free tier)' : ''}
                            </option>
                        )}
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
