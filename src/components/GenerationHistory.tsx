import { useState } from 'react';
import type { GenerationEntry } from '../lib/types';

interface GenerationHistoryProps {
    entries: GenerationEntry[];
    currentIndex: number;
    onNavigate: (index: number) => void;
    onUpdateLabel: (index: number, label: string) => void;
    onRemove: () => void;
}

export function GenerationHistory({ entries, currentIndex, onNavigate, onUpdateLabel, onRemove }: GenerationHistoryProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState('');

    if (entries.length === 0) return null;

    const current = entries[currentIndex];
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < entries.length - 1;

    const handleStartEdit = () => {
        setEditText(current.elementLabel);
        setIsEditing(true);
    };

    const handleSaveEdit = () => {
        const trimmed = editText.trim();
        if (trimmed && trimmed !== current.elementLabel) {
            onUpdateLabel(currentIndex, trimmed);
        }
        setIsEditing(false);
    };

    return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onNavigate(currentIndex - 1)}
                        disabled={!hasPrev}
                        className="rounded p-1 text-gray-500 hover:bg-gray-200 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-700"
                        aria-label="Previous generation"
                    >
                        ◀
                    </button>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                        Gen {currentIndex + 1} of {entries.length}
                    </span>
                    <button
                        onClick={() => onNavigate(currentIndex + 1)}
                        disabled={!hasNext}
                        className="rounded p-1 text-gray-500 hover:bg-gray-200 disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-700"
                        aria-label="Next generation"
                    >
                        ▶
                    </button>
                </div>
                <button
                    onClick={onRemove}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                    Remove
                </button>
            </div>
            <div className="mt-1 flex items-center gap-1">
                {isEditing ? (
                    <input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onBlur={handleSaveEdit}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                        className="min-w-0 flex-1 rounded border border-gray-300 px-1 text-xs text-gray-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        autoFocus
                    />
                ) : (
                    <>
                        <p className="min-w-0 flex-1 truncate text-xs text-gray-500 dark:text-gray-400">
                            {current.elementLabel}
                        </p>
                        <button
                            onClick={handleStartEdit}
                            className="shrink-0 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                            aria-label="Edit label"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                                <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L3.22 10.306a1 1 0 0 0-.26.442l-.83 3.04a.53.53 0 0 0 .649.649l3.04-.83a1 1 0 0 0 .443-.261l7.793-7.793a1.75 1.75 0 0 0 0-2.475l-.567-.565ZM11.72 3.22a.25.25 0 0 1 .354 0l.566.566a.25.25 0 0 1 0 .354L12 4.78l-.92-.92.64-.64Zm-1.348 1.348.92.92-5.49 5.49a.5.5 0 0 1-.221.13l-1.86.508.507-1.86a.5.5 0 0 1 .131-.22l5.49-5.49h.523Z" />
                            </svg>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
