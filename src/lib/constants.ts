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
} as const;

export const STORAGE_KEYS = {
    PICKED_ELEMENT: 'pickedElement',
    SETTINGS: 'settings',
} as const;
