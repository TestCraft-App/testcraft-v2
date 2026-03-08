import type { PickedElement } from './types';

export function deriveElementLabel(element: PickedElement): string {
    const text = element.textContent?.trim();
    if (text) return text.length > 50 ? text.slice(0, 50) + '…' : text;

    const attrs = element.attributes;
    if (attrs['aria-label']) return attrs['aria-label'];
    if (attrs.placeholder) return attrs.placeholder;
    if (attrs.title) return attrs.title;
    if (attrs.name) return attrs.name;

    // Fallback: tag#id.class
    let fallback = element.tagName.toLowerCase();
    if (attrs.id) fallback += `#${attrs.id}`;
    if (attrs.class) {
        const classes = attrs.class.trim().split(/\s+/).slice(0, 2).join('.');
        fallback += `.${classes}`;
    }
    return fallback;
}
