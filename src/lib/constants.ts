export const ACTIONS = {
    START_PICKING: 'start-picking',
    STOP_PICKING: 'stop-picking',
    ELEMENT_PICKED: 'element-picked',
    CAPTURE_SCREENSHOT: 'capture-screenshot',
    SCREENSHOT_CAPTURED: 'screenshot-captured',
    HIGHLIGHT_ELEMENT: 'highlight-element',
    CLEAR_HIGHLIGHT: 'clear-highlight',
    SCAN_PAGE: 'scan-page',
    PAGE_SCANNED: 'page-scanned',
    RUN_AXE: 'run-axe',
    GOOGLE_SIGN_IN: 'google-sign-in',
} as const;

export const STORAGE_KEYS = {
    PICKED_ELEMENT: 'pickedElement',
    SETTINGS: 'settings',
    AUTH: 'auth',
} as const;

export const API_V2_URL = 'https://openai-api-proxy-dev-440630564453.us-central1.run.app';

export const FREE_TIER_MODEL = 'gpt-4o-mini';
export const DAILY_LIMIT = 10;
