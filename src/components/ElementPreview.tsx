import { parseElement } from '../lib/parse-element';
import { useElementStore } from '../stores/element-store';

export function ElementPreview() {
    const { pickedElement, clearPickedElement } = useElementStore();

    if (!pickedElement) return null;

    const parsed = parseElement(pickedElement.outerHTML);

    return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-gray-400">Selected element</span>
                <button
                    onClick={clearPickedElement}
                    className="shrink-0 text-xs text-gray-400 hover:text-gray-600"
                    aria-label="Clear selected element"
                >
                    Clear
                </button>
            </div>

            {pickedElement.screenshot && (
                <div className="mb-2 flex justify-center">
                    <img
                        src={pickedElement.screenshot}
                        alt="Element screenshot"
                        className="max-h-32 rounded border border-gray-200"
                    />
                </div>
            )}

            <details>
                <summary className="cursor-pointer text-xs text-gray-500">HTML</summary>
                <pre className="mt-1 max-h-24 overflow-auto rounded bg-gray-100 p-2 text-xs">
                    {parsed.truncatedHTML}
                </pre>
            </details>
        </div>
    );
}
