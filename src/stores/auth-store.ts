import { create } from 'zustand';
import { ACTIONS, STORAGE_KEYS, API_V2_URL, DAILY_LIMIT } from '../lib/constants';
import type { AuthUser } from '../lib/types';

interface AuthState {
    user: AuthUser | null;
    token: string | null;
    dailyUsage: number;
    isSigningIn: boolean;

    signIn: () => Promise<void>;
    signOut: () => void;
    fetchUsage: () => Promise<void>;
    refreshUsage: () => void;
    loadFromStorage: () => Promise<void>;
    clearToken: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    token: null,
    dailyUsage: 0,
    isSigningIn: false,

    signIn: async () => {
        set({ isSigningIn: true });
        try {
            const response = await chrome.runtime.sendMessage({ action: ACTIONS.GOOGLE_SIGN_IN });

            if (response?.error) {
                throw new Error(response.error);
            }

            if (response?.token && response?.user) {
                set({
                    token: response.token,
                    user: response.user,
                    isSigningIn: false,
                });

                // Persist to storage
                await chrome.storage.local.set({
                    [STORAGE_KEYS.AUTH]: {
                        token: response.token,
                        user: response.user,
                    },
                });

                // Fetch usage after sign in
                get().fetchUsage();
            }
        } catch {
            set({ isSigningIn: false });
        }
    },

    signOut: () => {
        set({ user: null, token: null, dailyUsage: 0 });
        chrome.storage.local.remove(STORAGE_KEYS.AUTH);
    },

    fetchUsage: async () => {
        const { token } = get();
        if (!token) return;

        try {
            const response = await fetch(`${API_V2_URL}/api/v2/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.status === 401) {
                get().clearToken();
                return;
            }

            if (response.ok) {
                const data = await response.json();
                set({ dailyUsage: data.usage?.count ?? 0 });
            }
        } catch {
            // Network error — silently ignore
        }
    },

    refreshUsage: () => {
        // Optimistically increment local usage count
        set((state) => ({ dailyUsage: state.dailyUsage + 1 }));
    },

    loadFromStorage: async () => {
        const result = await chrome.storage.local.get(STORAGE_KEYS.AUTH);
        const stored = result[STORAGE_KEYS.AUTH] as { token: string; user: AuthUser } | undefined;
        if (stored?.token && stored?.user) {
            set({ token: stored.token, user: stored.user });
            // Fetch fresh usage (also validates token)
            get().fetchUsage();
        }
    },

    clearToken: () => {
        set({ user: null, token: null, dailyUsage: 0 });
        chrome.storage.local.remove(STORAGE_KEYS.AUTH);
    },
}));

export function isFreeTier(apiKey: string, token: string | null): boolean {
    return !apiKey && !!token;
}

export function canGenerate(apiKey: string, token: string | null): boolean {
    return !!apiKey || !!token;
}

export function isUsageLimitReached(dailyUsage: number): boolean {
    return dailyUsage >= DAILY_LIMIT;
}
