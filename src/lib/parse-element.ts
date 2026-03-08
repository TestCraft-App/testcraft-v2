export interface ParsedElement {
    tagName: string;
    textPreview: string;
    attributes: Record<string, string>;
    truncatedHTML: string;
}

const MAX_TEXT_LENGTH = 80;
const MAX_HTML_LENGTH = 500;

export function parseElement(html: string): ParsedElement {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const el = doc.body.firstElementChild;

    if (!el) {
        return {
            tagName: 'unknown',
            textPreview: '',
            attributes: {},
            truncatedHTML: html.slice(0, MAX_HTML_LENGTH),
        };
    }

    const tagName = el.tagName.toLowerCase();
    const rawText = el.textContent?.trim() ?? '';
    const textPreview = rawText.length > MAX_TEXT_LENGTH ? rawText.slice(0, MAX_TEXT_LENGTH) + '...' : rawText;

    const attributes: Record<string, string> = {};
    for (const attr of el.attributes) {
        attributes[attr.name] = attr.value;
    }

    const truncatedHTML = html.length > MAX_HTML_LENGTH ? html.slice(0, MAX_HTML_LENGTH) + '...' : html;

    return { tagName, textPreview, attributes, truncatedHTML };
}
