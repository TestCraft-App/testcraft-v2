export type ElementCategory = 'form' | 'button' | 'link' | 'input' | 'select' | 'media' | 'other';

export interface ScannedElement {
    category: ElementCategory;
    tagName: string;
    text: string;
    selector: string;
    attributes: Record<string, string>;
}

export interface PageInventory {
    url: string;
    title: string;
    elements: ScannedElement[];
    counts: Record<ElementCategory, number>;
}

const INTERACTIVE_SELECTORS = [
    'a[href]',
    'button',
    '[role="button"]',
    'input:not([type="hidden"])',
    'textarea',
    'select',
    '[role="link"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="switch"]',
    '[role="slider"]',
    '[role="textbox"]',
    '[role="combobox"]',
    '[contenteditable="true"]',
    'details > summary',
    'video',
    'audio',
    'img[alt]',
].join(', ');

function classifyElement(el: Element): ElementCategory {
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute('role');

    if (tag === 'form' || role === 'form') return 'form';
    if (tag === 'button' || role === 'button' || (tag === 'input' && el.getAttribute('type') === 'submit'))
        return 'button';
    if (tag === 'a' || role === 'link') return 'link';
    if (tag === 'input' || tag === 'textarea' || role === 'textbox' || role === 'combobox') return 'input';
    if (tag === 'select' || role === 'listbox') return 'select';
    if (tag === 'video' || tag === 'audio' || tag === 'img') return 'media';
    return 'other';
}

function getUniqueSelector(el: Element): string {
    if (el.id) return `#${el.id}`;

    const tag = el.tagName.toLowerCase();
    const testId = el.getAttribute('data-testid') || el.getAttribute('data-test-id');
    if (testId) return `[data-testid="${testId}"]`;

    const name = el.getAttribute('name');
    if (name) return `${tag}[name="${name}"]`;

    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return `${tag}[aria-label="${ariaLabel}"]`;

    const type = el.getAttribute('type');
    if (type && tag === 'input') return `input[type="${type}"]`;

    return tag;
}

function getElementText(el: Element): string {
    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    const text = (el.textContent ?? '').trim();
    return text.length > 60 ? text.slice(0, 60) + '...' : text;
}

function getElementAttributes(el: Element): Record<string, string> {
    const attrs: Record<string, string> = {};
    for (const attr of el.attributes) {
        attrs[attr.name] = attr.value;
    }
    return attrs;
}

export function scanPage(doc: Document): PageInventory {
    const elements: ScannedElement[] = [];
    const seen = new Set<Element>();

    // Also scan forms
    doc.querySelectorAll('form').forEach((form) => {
        if (seen.has(form)) return;
        seen.add(form);
        elements.push({
            category: 'form',
            tagName: 'form',
            text: form.getAttribute('aria-label') || form.getAttribute('name') || 'form',
            selector: getUniqueSelector(form),
            attributes: getElementAttributes(form),
        });
    });

    doc.querySelectorAll(INTERACTIVE_SELECTORS).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);

        const scanned: ScannedElement = {
            category: classifyElement(el),
            tagName: el.tagName.toLowerCase(),
            text: getElementText(el),
            selector: getUniqueSelector(el),
            attributes: getElementAttributes(el),
        };
        elements.push(scanned);
    });

    const counts = {} as Record<ElementCategory, number>;
    const categories: ElementCategory[] = ['form', 'button', 'link', 'input', 'select', 'media', 'other'];
    for (const cat of categories) {
        counts[cat] = elements.filter((e) => e.category === cat).length;
    }

    return {
        url: doc.location?.href ?? '',
        title: doc.title ?? '',
        elements,
        counts,
    };
}

export function isInteractiveElement(el: Element): boolean {
    return el.matches(INTERACTIVE_SELECTORS) || el.tagName.toLowerCase() === 'form';
}
