import { create } from 'zustand';
import type { PageInventory } from '../lib/page-scanner';

interface PageState {
    inventory: PageInventory | null;
    setInventory: (inventory: PageInventory) => void;
    clearInventory: () => void;
}

export const usePageStore = create<PageState>((set) => ({
    inventory: null,

    setInventory: (inventory) => {
        set({ inventory });
    },

    clearInventory: () => {
        set({ inventory: null });
    },
}));
