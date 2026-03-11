import axe from 'axe-core';
import { ACTIONS } from '../lib/constants';
import { start, stop } from '../lib/element-picker';
import { scanPage } from '../lib/page-scanner';
import { detectFormFields, fillFormFields } from '../lib/form-data';

export default defineContentScript({
    matches: ['<all_urls>'],
    main() {
        chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
            switch (message.action) {
                case ACTIONS.START_PICKING:
                    start();
                    break;
                case ACTIONS.STOP_PICKING:
                    stop();
                    break;
                case ACTIONS.SCAN_PAGE: {
                    const inventory = scanPage(document);
                    sendResponse(inventory);
                    break;
                }
                case ACTIONS.HIGHLIGHT_ELEMENT: {
                    const { selector } = message.payload;
                    highlightBySelector(selector);
                    break;
                }
                case ACTIONS.CLEAR_HIGHLIGHT:
                    clearHighlight();
                    break;
                case ACTIONS.RUN_AXE: {
                    axe.run(document).then((results) => {
                        sendResponse({ violations: results.violations });
                    }).catch(() => {
                        sendResponse({ violations: [] });
                    });
                    return true; // async response
                }
                case ACTIONS.DETECT_FORM_FIELDS: {
                    const fields = detectFormFields(document);
                    sendResponse({ fields });
                    break;
                }
                case ACTIONS.FILL_FORM_DATA: {
                    const valuesBySelector = message.payload?.valuesBySelector ?? {};
                    const filledCount = fillFormFields(document, valuesBySelector);
                    sendResponse({ filledCount });
                    break;
                }
            }
        });
    },
});

let highlightedEl: HTMLElement | null = null;

function highlightBySelector(selector: string) {
    clearHighlight();
    try {
        const el = document.querySelector(selector) as HTMLElement | null;
        if (el) {
            highlightedEl = el;
            el.style.outline = '2px solid #4f46e5';
            el.style.outlineOffset = '2px';
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    } catch {
        // invalid selector
    }
}

function clearHighlight() {
    if (highlightedEl) {
        highlightedEl.style.outline = '';
        highlightedEl.style.outlineOffset = '';
        highlightedEl = null;
    }
}
