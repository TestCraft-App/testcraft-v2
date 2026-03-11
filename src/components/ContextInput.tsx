import { useState, useEffect, useRef, useCallback } from 'react';
import { useSettingsStore } from '../stores/settings-store';
import type { ContextTab } from '../stores/settings-store';

const MAX_LENGTH = 500;
const DEBOUNCE_MS = 400;

interface ContextInputProps {
    tabKey: ContextTab;
}

export function ContextInput({ tabKey }: ContextInputProps) {
    const promptContext = useSettingsStore((s) => s.promptContexts[tabKey]);
    const updateSettings = useSettingsStore((s) => s.updateSettings);
    const [localValue, setLocalValue] = useState(promptContext);
    const [isExpanded, setIsExpanded] = useState(promptContext.length > 0);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    // Sync from store when it changes externally
    useEffect(() => {
        setLocalValue(promptContext);
        if (promptContext.length > 0) setIsExpanded(true);
    }, [promptContext]);

    const persistValue = useCallback(
        (value: string) => {
            updateSettings({ promptContexts: { ...useSettingsStore.getState().promptContexts, [tabKey]: value } });
        },
        [updateSettings, tabKey],
    );

    const handleChange = (value: string) => {
        const clamped = value.slice(0, MAX_LENGTH);
        setLocalValue(clamped);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => persistValue(clamped), DEBOUNCE_MS);
    };

    const handleClear = () => {
        setLocalValue('');
        clearTimeout(debounceRef.current);
        persistValue('');
    };

    return (
        <div>
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex w-full items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
                <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>&#9654;</span>
                Additional Context
                {localValue.length > 0 && (
                    <span className="ml-auto rounded bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                        active
                    </span>
                )}
            </button>

            {isExpanded && (
                <div className="mt-1.5">
                    <div className="relative">
                        <textarea
                            value={localValue}
                            onChange={(e) => handleChange(e.target.value)}
                            maxLength={MAX_LENGTH}
                            placeholder="e.g., banking login form, e-commerce checkout — focus on security"
                            rows={2}
                            className="w-full resize-none rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 placeholder-gray-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
                        />
                        {localValue.length > 0 && (
                            <button
                                type="button"
                                onClick={handleClear}
                                aria-label="Clear context"
                                className="absolute right-1.5 top-1.5 rounded p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                &#10005;
                            </button>
                        )}
                    </div>
                    <div className="mt-0.5 text-right text-xs text-gray-400 dark:text-gray-500">
                        {localValue.length}/{MAX_LENGTH}
                    </div>
                </div>
            )}
        </div>
    );
}
