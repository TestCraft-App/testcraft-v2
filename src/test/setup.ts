import '@testing-library/jest-dom/vitest';
import { chromeMock, resetChromeStore } from './chrome-mock';
import { beforeEach } from 'vitest';

// Make chrome API available globally
Object.defineProperty(globalThis, 'chrome', {
    value: chromeMock,
    writable: true,
    configurable: true,
});

// Reset chrome store and mocks between tests
beforeEach(() => {
    resetChromeStore();
    Object.values(chromeMock).forEach((namespace) => {
        Object.values(namespace).forEach((method) => {
            if (typeof method === 'object' && method !== null) {
                Object.values(method).forEach((fn) => {
                    if (typeof fn === 'function' && 'mockClear' in fn) {
                        (fn as ReturnType<typeof vi.fn>).mockClear();
                    }
                });
            } else if (typeof method === 'function' && 'mockClear' in method) {
                (method as ReturnType<typeof vi.fn>).mockClear();
            }
        });
    });
});
