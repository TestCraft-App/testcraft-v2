import { useMemo } from 'react';
import { stripCodeFences } from '../lib/prompt-builder';

export interface CodeResultProps {
    content: string;
    isStreaming: boolean;
}

export function CodeResult({ content, isStreaming }: CodeResultProps) {
    const cleanCode = useMemo(() => stripCodeFences(content), [content]);

    const handleCopy = () => {
        navigator.clipboard.writeText(cleanCode);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">Generated Code</h3>
                <button
                    onClick={handleCopy}
                    className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200"
                >
                    Copy
                </button>
            </div>

            <pre className="max-h-[60vh] overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
                <code>{cleanCode || content}</code>
            </pre>

            {isStreaming && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
                    Streaming...
                </div>
            )}
        </div>
    );
}
