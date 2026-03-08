import { create } from 'zustand';
import type { PickedElement } from '../lib/types';
import { STORAGE_KEYS } from '../lib/constants';

interface ElementState {
    pickedElement: PickedElement | null;
    isPicking: boolean;
    setPickedElement: (element: PickedElement) => void;
    clearPickedElement: () => void;
    setIsPicking: (picking: boolean) => void;
    loadFromStorage: () => Promise<void>;
}

export const useElementStore = create<ElementState>((set) => ({
    pickedElement: null,
    isPicking: false,

    setPickedElement: (element) => {
        set({ pickedElement: element, isPicking: false });
        chrome.storage.local.set({ [STORAGE_KEYS.PICKED_ELEMENT]: element });
    },

    clearPickedElement: () => {
        set({ pickedElement: null });
        chrome.storage.local.remove(STORAGE_KEYS.PICKED_ELEMENT);
    },

    setIsPicking: (picking) => {
        set({ isPicking: picking });
    },

    loadFromStorage: async () => {
        const result = await chrome.storage.local.get(STORAGE_KEYS.PICKED_ELEMENT);
        const element = result[STORAGE_KEYS.PICKED_ELEMENT] as PickedElement | undefined;
        if (element) {
            set({ pickedElement: element });
        }
    },
}));
