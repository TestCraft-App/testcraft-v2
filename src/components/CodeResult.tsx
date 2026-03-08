import { useEffect, useMemo, useRef } from 'react';
import { stripCodeFences } from '../lib/prompt-builder';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import java from 'highlight.js/lib/languages/java';
import csharp from 'highlight.js/lib/languages/csharp';
import python from 'highlight.js/lib/languages/python';
import 'highlight.js/styles/atom-one-dark.css';
import type { Language } from '../lib/ai-provider';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('java', java);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('python', python);

export interface CodeResultProps {
    content: string;
    isStreaming: boolean;
    language: Language;
}

export function CodeResult({ content, isStreaming, language }: CodeResultProps) {
    const cleanCode = useMemo(() => stripCodeFences(content), [content]);
    const codeRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (codeRef.current && cleanCode) {
            codeRef.current.removeAttribute('data-highlighted');
            hljs.highlightElement(codeRef.current);
        }
    }, [cleanCode, language]);

    const handleCopy = () => {
        navigator.clipboard.writeText(cleanCode);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Generated Code</h3>
                <button
                    onClick={handleCopy}
                    className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                    Copy
                </button>
            </div>

            <pre className="max-h-[60vh] overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
                <code ref={codeRef} className={`language-${language}`}>
                    {cleanCode || content}
                </code>
            </pre>

            {isStreaming && (
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600 dark:border-gray-600 dark:border-t-indigo-400" />
                    Streaming...
                </div>
            )}
        </div>
    );
}
