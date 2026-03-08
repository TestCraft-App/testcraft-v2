import { ACTIONS } from '../lib/constants';
import type { ExtensionMessage } from '../lib/types';

export default defineBackground(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

    chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
        if (message.action === ACTIONS.CAPTURE_SCREENSHOT) {
            captureAndCropScreenshot(message.payload.boundingRect)
                .then((screenshot) => sendResponse({ screenshot }))
                .catch(() => sendResponse({ screenshot: '' }));
            return true; // async response
        }
    });
});

async function captureAndCropScreenshot(rect: {
    x: number;
    y: number;
    width: number;
    height: number;
}): Promise<string> {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return '';

    const dataUrl = await chrome.tabs.captureVisibleTab(undefined, { format: 'png' });

    // Infer DPR: captureVisibleTab captures at device resolution.
    // Compare captured image width to the tab's CSS viewport width.
    const zoom = await chrome.tabs.getZoom(tab.id);

    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    // Get tab viewport width via executeScript (window.innerWidth)
    const [{ result: viewportWidth }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.innerWidth,
    });
    const dpr = viewportWidth ? bitmap.width / viewportWidth : 1;
    const scale = dpr * zoom;

    const cropX = Math.round(rect.x * scale);
    const cropY = Math.round(rect.y * scale);
    const cropW = Math.round(rect.width * scale);
    const cropH = Math.round(rect.height * scale);

    const canvas = new OffscreenCanvas(cropW, cropH);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });
    const reader = new FileReader();
    return new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(croppedBlob);
    });
}
