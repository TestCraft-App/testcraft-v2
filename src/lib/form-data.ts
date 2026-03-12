export interface DetectedFormField {
    selector: string;
    name: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
}

export interface TestDataSet {
    id: string;
    name: string;
    values: Record<string, string | boolean>;
}

/** Input types that are not data-entry fields and should be excluded from detection. */
const EXCLUDED_INPUT_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'image', 'file']);

export function detectFormFields(root: Document | Element): DetectedFormField[] {
    const controls = Array.from(
        root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
            'input, textarea, select',
        ),
    ).filter((el) => {
        if (el instanceof HTMLInputElement) {
            return !EXCLUDED_INPUT_TYPES.has((el.type || 'text').toLowerCase());
        }
        return true;
    });

    const fields: DetectedFormField[] = [];
    const seen = new Set<string>();

    for (const control of controls) {
        const selector = getBestSelector(control);
        if (!selector || seen.has(selector)) continue;
        seen.add(selector);

        const type = getFieldType(control);
        const options =
            control instanceof HTMLSelectElement
                ? Array.from(control.options)
                    .map((o) => o.value || o.textContent?.trim() || '')
                    .filter(Boolean)
                : undefined;

        fields.push({
            selector,
            name: control.getAttribute('name') || control.id || selector,
            label: getFieldLabel(control),
            type,
            required: control.required || control.getAttribute('aria-required') === 'true',
            options: options && options.length > 0 ? options : undefined,
        });
    }

    return fields;
}

export function fillFormFields(doc: Document, valuesBySelector: Record<string, string | boolean>): number {
    let filled = 0;

    for (const [selector, rawValue] of Object.entries(valuesBySelector)) {
        try {
            const el = doc.querySelector(selector);
            if (!el) continue;

            if (el instanceof HTMLInputElement) {
                const inputType = (el.type || 'text').toLowerCase();
                // Skip file inputs — browsers block programmatic value assignment for security
                if (inputType === 'file') continue;

                if (inputType === 'checkbox' || inputType === 'radio') {
                    el.checked = Boolean(rawValue);
                    dispatchInputEvents(el);
                    filled++;
                    continue;
                }

                el.value = String(rawValue ?? '');
                dispatchInputEvents(el);
                filled++;
                continue;
            }

            if (el instanceof HTMLTextAreaElement) {
                el.value = String(rawValue ?? '');
                dispatchInputEvents(el);
                filled++;
                continue;
            }

            if (el instanceof HTMLSelectElement) {
                const value = String(rawValue ?? '');
                const hasOption = Array.from(el.options).some((option) => option.value === value);
                if (hasOption) {
                    el.value = value;
                } else if (el.options.length > 0) {
                    el.value = el.options[0].value;
                }
                dispatchInputEvents(el);
                filled++;
            }
        } catch {
            // Skip fields that fail (e.g., invalid selector, read-only element)
            continue;
        }
    }

    return filled;
}

function dispatchInputEvents(el: HTMLElement) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
}

function getFieldType(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
    if (control instanceof HTMLTextAreaElement) return 'textarea';
    if (control instanceof HTMLSelectElement) return 'select';
    return (control.type || 'text').toLowerCase();
}

function getFieldLabel(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
    const ariaLabel = control.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    const id = control.id;
    if (id) {
        const label = control.ownerDocument.querySelector(`label[for="${id}"]`);
        const text = label?.textContent?.trim();
        if (text) return text;
    }

    const wrapperLabel = control.closest('label')?.textContent?.trim();
    if (wrapperLabel) return wrapperLabel;

    const placeholder = control.getAttribute('placeholder');
    if (placeholder) return placeholder;

    return control.getAttribute('name') || id || control.tagName.toLowerCase();
}

function getBestSelector(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string | null {
    if (control.id) return `#${cssEscape(control.id)}`;

    const testId = control.getAttribute('data-testid') || control.getAttribute('data-test-id');
    if (testId) return `${control.tagName.toLowerCase()}[data-testid="${cssEscape(testId)}"]`;

    const name = control.getAttribute('name');
    if (name) return `${control.tagName.toLowerCase()}[name="${cssEscape(name)}"]`;

    const ariaLabel = control.getAttribute('aria-label');
    if (ariaLabel) return `${control.tagName.toLowerCase()}[aria-label="${cssEscape(ariaLabel)}"]`;

    return null;
}

function cssEscape(value: string): string {
    if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(value);
    return value.replace(/(["\\#.:\[\]])/g, '\\$1');
}
