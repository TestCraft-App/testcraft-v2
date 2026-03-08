import { useMemo, useState } from 'react';
import { parseTestIdeas } from '../lib/prompt-builder';

export interface TestIdeasResultProps {
    content: string;
    isStreaming: boolean;
    selectedIdeas: Set<number>;
    onToggleIdea: (index: number) => void;
}

export function TestIdeasResult({ content, isStreaming, selectedIdeas, onToggleIdea }: TestIdeasResultProps) {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editText, setEditText] = useState('');

    const sections = useMemo(() => parseTestIdeas(content), [content]);

    const allIdeas = useMemo(() => {
        const ideas: { category: string; text: string; globalIndex: number }[] = [];
        let idx = 0;
        for (const section of sections) {
            for (const idea of section.ideas) {
                ideas.push({ category: section.category, text: idea, globalIndex: idx });
                idx++;
            }
        }
        return ideas;
    }, [sections]);

    const handleCopy = () => {
        const selectedText = allIdeas
            .filter((idea) => selectedIdeas.has(idea.globalIndex))
            .map((idea) => `- ${idea.text}`)
            .join('\n');
        navigator.clipboard.writeText(selectedText || content);
    };

    const handleEdit = (index: number, text: string) => {
        setEditingIndex(index);
        setEditText(text);
    };

    const handleEditSave = () => {
        setEditingIndex(null);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Test Ideas</h3>
                <div className="flex gap-2">
                    {selectedIdeas.size > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">{selectedIdeas.size} selected</span>
                    )}
                    <button
                        onClick={handleCopy}
                        className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                        Copy
                    </button>
                </div>
            </div>

            {sections.length > 0 ? sections.map((section) => (
                <div key={section.category}>
                    <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                        {section.category}
                    </h4>
                    <ul className="space-y-1">
                        {section.ideas.map((idea, i) => {
                            const globalIdx = allIdeas.findIndex(
                                (a) => a.category === section.category && a.text === idea && allIdeas.indexOf(a) >= 0,
                            );
                            // Find real global index
                            let realIdx = 0;
                            let found = false;
                            for (const s of sections) {
                                for (const id of s.ideas) {
                                    if (s.category === section.category && id === idea && !found) {
                                        if (i === 0 || realIdx === globalIdx) {
                                            found = true;
                                            break;
                                        }
                                    }
                                    realIdx++;
                                }
                                if (found) break;
                            }
                            const idx = allIdeas[realIdx]?.globalIndex ?? realIdx;

                            return (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={selectedIdeas.has(idx)}
                                        onChange={() => onToggleIdea(idx)}
                                        className="mt-1 rounded border-gray-300 dark:border-gray-600"
                                    />
                                    {editingIndex === idx ? (
                                        <input
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            onBlur={handleEditSave}
                                            onKeyDown={(e) => e.key === 'Enter' && handleEditSave()}
                                            className="flex-1 rounded border border-gray-300 px-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                            autoFocus
                                        />
                                    ) : (
                                        <span
                                            className="flex-1 cursor-pointer text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                                            onDoubleClick={() => handleEdit(idx, idea)}
                                        >
                                            {idea}
                                        </span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )) : content && (
                <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{content}</div>
            )}

            {isStreaming && (
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600 dark:border-gray-600 dark:border-t-indigo-400" />
                    Streaming...
                </div>
            )}
        </div>
    );
}
