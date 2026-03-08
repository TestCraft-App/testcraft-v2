import { vi } from 'vitest';

const store: Record<string, unknown> = {};

export const chromeMock = {
    storage: {
        local: {
            get: vi.fn((keys?: string | string[] | Record<string, unknown> | null) => {
                if (!keys) return Promise.resolve({ ...store });
                if (typeof keys === 'string') {
                    return Promise.resolve({ [keys]: store[keys] });
                }
                if (Array.isArray(keys)) {
                    const result: Record<string, unknown> = {};
                    keys.forEach((k) => {
                        if (k in store) result[k] = store[k];
                    });
                    return Promise.resolve(result);
                }
                const result: Record<string, unknown> = {};
                for (const [k, defaultVal] of Object.entries(keys)) {
                    result[k] = k in store ? store[k] : defaultVal;
                }
                return Promise.resolve(result);
            }),
            set: vi.fn((items: Record<string, unknown>) => {
                Object.assign(store, items);
                return Promise.resolve();
            }),
            remove: vi.fn((keys: string | string[]) => {
                const keyList = Array.isArray(keys) ? keys : [keys];
                keyList.forEach((k) => delete store[k]);
                return Promise.resolve();
            }),
            clear: vi.fn(() => {
                Object.keys(store).forEach((k) => delete store[k]);
                return Promise.resolve();
            }),
        },
    },
    runtime: {
        sendMessage: vi.fn(),
        onMessage: {
            addListener: vi.fn(),
            removeListener: vi.fn(),
            hasListener: vi.fn(() => false),
        },
        getURL: vi.fn((path: string) => `chrome-extension://test-id/${path}`),
        id: 'test-id',
    },
    tabs: {
        query: vi.fn(() => Promise.resolve([{ id: 1, url: 'https://example.com', title: 'Example' }])),
        sendMessage: vi.fn(),
        captureVisibleTab: vi.fn(() => Promise.resolve('data:image/png;base64,fake')),
    },
    sidePanel: {
        open: vi.fn(() => Promise.resolve()),
        setOptions: vi.fn(() => Promise.resolve()),
        setPanelBehavior: vi.fn(() => Promise.resolve()),
    },
};

export function resetChromeStore() {
    Object.keys(store).forEach((k) => delete store[k]);
}

export function setChromeStoreData(data: Record<string, unknown>) {
    Object.assign(store, data);
}
