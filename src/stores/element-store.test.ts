import { describe, it, expect, beforeEach } from 'vitest';
import { useElementStore } from './element-store';
import type { PickedElement } from '../lib/types';
import { STORAGE_KEYS } from '../lib/constants';
import { setChromeStoreData } from '../test/chrome-mock';

const mockElement: PickedElement = {
    outerHTML: '<button>Sign In</button>',
    tagName: 'button',
    textContent: 'Sign In',
    attributes: {},
    boundingRect: { x: 100, y: 200, width: 120, height: 40 },
    pageUrl: 'https://example.com/login',
    pageTitle: 'Login',
};

describe('useElementStore', () => {
    beforeEach(() => {
        useElementStore.setState({
            pickedElement: null,
            isPicking: false,
        });
    });

    it('starts with null picked element', () => {
        expect(useElementStore.getState().pickedElement).toBeNull();
    });

    it('starts with isPicking false', () => {
        expect(useElementStore.getState().isPicking).toBe(false);
    });

    it('setPickedElement updates state and syncs to storage', () => {
        useElementStore.getState().setPickedElement(mockElement);

        expect(useElementStore.getState().pickedElement).toEqual(mockElement);
        expect(useElementStore.getState().isPicking).toBe(false);
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
            [STORAGE_KEYS.PICKED_ELEMENT]: mockElement,
        });
    });

    it('clearPickedElement resets state and removes from storage', () => {
        useElementStore.getState().setPickedElement(mockElement);
        useElementStore.getState().clearPickedElement();

        expect(useElementStore.getState().pickedElement).toBeNull();
        expect(chrome.storage.local.remove).toHaveBeenCalledWith(STORAGE_KEYS.PICKED_ELEMENT);
    });

    it('setIsPicking updates picking state', () => {
        useElementStore.getState().setIsPicking(true);
        expect(useElementStore.getState().isPicking).toBe(true);

        useElementStore.getState().setIsPicking(false);
        expect(useElementStore.getState().isPicking).toBe(false);
    });

    it('loadFromStorage restores element from chrome.storage', async () => {
        setChromeStoreData({ [STORAGE_KEYS.PICKED_ELEMENT]: mockElement });

        await useElementStore.getState().loadFromStorage();

        expect(useElementStore.getState().pickedElement).toEqual(mockElement);
    });

    it('loadFromStorage does nothing when storage is empty', async () => {
        await useElementStore.getState().loadFromStorage();

        expect(useElementStore.getState().pickedElement).toBeNull();
    });
});
