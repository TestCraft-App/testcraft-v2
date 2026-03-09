import { ACTIONS } from '../lib/constants';
import type { ExtensionMessage } from '../lib/types';

const GOOGLE_CLIENT_ID = '440630564453-aa0r5vp9n98grsbslc9r09o1e56jr585.apps.googleusercontent.com';

export default defineBackground(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

    chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
        if (message.action === ACTIONS.CAPTURE_SCREENSHOT) {
            captureAndCropScreenshot(message.payload.boundingRect)
                .then((screenshot) => sendResponse({ screenshot }))
                .catch(() => sendResponse({ screenshot: '' }));
            return true; // async response
        }

        if (message.action === ACTIONS.GOOGLE_SIGN_IN) {
            handleGoogleSignIn()
                .then((result) => sendResponse(result))
                .catch((err) => sendResponse({ error: err.message }));
            return true; // async response
        }
    });
});

async function handleGoogleSignIn(): Promise<{ token: string; user: { email: string; name: string; picture: string } } | { error: string }> {
    const redirectUrl = chrome.identity.getRedirectURL();
    const nonce = crypto.randomUUID();

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('response_type', 'id_token');
    authUrl.searchParams.set('redirect_uri', redirectUrl);
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('prompt', 'select_account');

    const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl.toString(),
        interactive: true,
    });

    if (!responseUrl) {
        return { error: 'Sign-in was cancelled.' };
    }

    // Extract id_token from the URL hash fragment
    const hashParams = new URLSearchParams(responseUrl.split('#')[1] ?? '');
    const idToken = hashParams.get('id_token');

    if (!idToken) {
        return { error: 'No ID token received from Google.' };
    }

    // Decode JWT payload (no verification needed — the API server verifies)
    // Use TextDecoder to properly handle UTF-8 characters (e.g. accented names)
    const payloadBase64 = idToken.split('.')[1];
    const bytes = Uint8Array.from(atob(payloadBase64), (c) => c.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));

    return {
        token: idToken,
        user: {
            email: payload.email ?? '',
            name: payload.name ?? '',
            picture: payload.picture ?? '',
        },
    };
}

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
