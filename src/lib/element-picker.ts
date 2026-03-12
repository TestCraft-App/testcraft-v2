import { ACTIONS } from './constants';
import type { PickedElement } from './types';

const HIGHLIGHT_ID = 'testcraft-highlight-overlay';
const HIGHLIGHT_STYLE = 'outline: 2px solid #4f46e5; outline-offset: 2px; cursor: crosshair;';

let highlightedElement: HTMLElement | null = null;
let lastPickedElement: Element | null = null;
let isActive = false;

function getElementAttributes(el: Element): Record<string, string> {
    const attrs: Record<string, string> = {};
    for (const attr of el.attributes) {
        attrs[attr.name] = attr.value;
    }
    return attrs;
}

function addHighlight(el: HTMLElement) {
    removeHighlight();
    highlightedElement = el;
    el.setAttribute('data-testcraft-highlight', 'true');
    el.style.cssText += HIGHLIGHT_STYLE;
}

function removeHighlight() {
    if (highlightedElement) {
        highlightedElement.removeAttribute('data-testcraft-highlight');
        highlightedElement.style.outline = '';
        highlightedElement.style.outlineOffset = '';
        highlightedElement.style.cursor = '';
        highlightedElement = null;
    }
}

function onMouseOver(e: MouseEvent) {
    if (!isActive) return;
    const target = e.target as HTMLElement;
    if (target && target !== highlightedElement) {
        addHighlight(target);
    }
}

function onMouseOut(_e: MouseEvent) {
    if (!isActive) return;
    removeHighlight();
}

function onClick(e: MouseEvent) {
    if (!isActive) return;
    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement;
    lastPickedElement = target;
    removeHighlight();
    stop();

    const rect = target.getBoundingClientRect();
    const picked: PickedElement = {
        outerHTML: target.outerHTML,
        tagName: target.tagName.toLowerCase(),
        textContent: (target.textContent ?? '').trim().slice(0, 500),
        attributes: getElementAttributes(target),
        boundingRect: {
            x: rect.x + window.scrollX,
            y: rect.y + window.scrollY,
            width: rect.width,
            height: rect.height,
        },
        pageUrl: window.location.href,
        pageTitle: document.title,
    };

    chrome.runtime.sendMessage({
        action: ACTIONS.ELEMENT_PICKED,
        payload: picked,
    });
}

export function start() {
    if (isActive) return;
    isActive = true;
    document.addEventListener('mouseover', onMouseOver, true);
    document.addEventListener('mouseout', onMouseOut, true);
    document.addEventListener('click', onClick, true);
    document.body.style.cursor = 'crosshair';
}

export function stop() {
    if (!isActive) return;
    isActive = false;
    removeHighlight();
    document.removeEventListener('mouseover', onMouseOver, true);
    document.removeEventListener('mouseout', onMouseOut, true);
    document.removeEventListener('click', onClick, true);
    document.body.style.cursor = '';
}

export function isPickerActive() {
    return isActive;
}

export function getLastPickedElement(): Element | null {
    return lastPickedElement;
}
