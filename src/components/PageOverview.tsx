import type { ElementCategory } from '../lib/page-scanner';
import { usePageStore } from '../stores/page-store';
import { ACTIONS } from '../lib/constants';

const categoryLabels: Record<ElementCategory, string> = {
    form: 'Forms',
    button: 'Buttons',
    link: 'Links',
    input: 'Inputs',
    select: 'Selects',
    media: 'Media',
    other: 'Other',
};

const categoryOrder: ElementCategory[] = ['form', 'button', 'link', 'input', 'select', 'media', 'other'];

export function PageOverview() {
    const { inventory } = usePageStore();

    if (!inventory) return null;

    const totalElements = inventory.elements.length;

    const handleHighlight = async (selector: string) => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
            await chrome.tabs.sendMessage(tab.id, {
                action: ACTIONS.HIGHLIGHT_ELEMENT,
                payload: { selector },
            });
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">
                    {totalElements} interactive element{totalElements !== 1 ? 's' : ''}
                </h3>
            </div>

            {categoryOrder.map((category) => {
                const items = inventory.elements.filter((e) => e.category === category);
                if (items.length === 0) return null;

                return (
                    <div key={category}>
                        <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">
                            {categoryLabels[category]} ({items.length})
                        </h4>
                        <ul className="space-y-1">
                            {items.map((item, i) => (
                                <li key={`${category}-${i}`}>
                                    <button
                                        onClick={() => handleHighlight(item.selector)}
                                        className="w-full rounded px-2 py-1 text-left text-xs hover:bg-gray-100"
                                    >
                                        <span className="font-mono text-indigo-600">{item.tagName}</span>
                                        {item.text && (
                                            <span className="ml-1 text-gray-600 truncate">
                                                {item.text}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            })}
        </div>
    );
}
