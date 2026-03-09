import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore, isFreeTier, canGenerate, isUsageLimitReached } from './auth-store';

describe('auth-store', () => {
    beforeEach(() => {
        useAuthStore.setState({
            user: null,
            token: null,
            dailyUsage: 0,
            isSigningIn: false,
        });
        vi.restoreAllMocks();
    });

    describe('signIn', () => {
        it('sets user and token on successful sign-in', async () => {
            const mockUser = { email: 'test@gmail.com', name: 'Test User', picture: 'https://example.com/pic.jpg' };
            const mockToken = 'mock-id-token';

            (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
                token: mockToken,
                user: mockUser,
            });

            // Mock fetch for usage
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ usage: { count: 3 } }),
            }));

            await useAuthStore.getState().signIn();

            const state = useAuthStore.getState();
            expect(state.user).toEqual(mockUser);
            expect(state.token).toBe(mockToken);
            expect(state.isSigningIn).toBe(false);
        });

        it('handles sign-in error gracefully', async () => {
            (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
                error: 'Sign-in was cancelled.',
            });

            await useAuthStore.getState().signIn();

            const state = useAuthStore.getState();
            expect(state.user).toBeNull();
            expect(state.token).toBeNull();
            expect(state.isSigningIn).toBe(false);
        });

        it('sets isSigningIn to true during sign-in', async () => {
            let resolvePromise: (value: unknown) => void;
            const promise = new Promise((resolve) => { resolvePromise = resolve; });
            (chrome.runtime.sendMessage as ReturnType<typeof vi.fn>).mockReturnValue(promise);

            const signInPromise = useAuthStore.getState().signIn();
            expect(useAuthStore.getState().isSigningIn).toBe(true);

            resolvePromise!({ error: 'cancelled' });
            await signInPromise;
            expect(useAuthStore.getState().isSigningIn).toBe(false);
        });
    });

    describe('signOut', () => {
        it('clears user, token, and usage', () => {
            useAuthStore.setState({
                user: { email: 'test@gmail.com', name: 'Test', picture: '' },
                token: 'some-token',
                dailyUsage: 5,
            });

            useAuthStore.getState().signOut();

            const state = useAuthStore.getState();
            expect(state.user).toBeNull();
            expect(state.token).toBeNull();
            expect(state.dailyUsage).toBe(0);
        });
    });

    describe('refreshUsage', () => {
        it('increments local usage count', () => {
            useAuthStore.setState({ dailyUsage: 3 });
            useAuthStore.getState().refreshUsage();
            expect(useAuthStore.getState().dailyUsage).toBe(4);
        });
    });

    describe('clearToken', () => {
        it('clears auth state', () => {
            useAuthStore.setState({
                user: { email: 'test@gmail.com', name: 'Test', picture: '' },
                token: 'some-token',
                dailyUsage: 5,
            });

            useAuthStore.getState().clearToken();

            const state = useAuthStore.getState();
            expect(state.user).toBeNull();
            expect(state.token).toBeNull();
            expect(state.dailyUsage).toBe(0);
        });
    });

    describe('loadFromStorage', () => {
        it('restores auth state from storage', async () => {
            const mockAuth = {
                token: 'stored-token',
                user: { email: 'stored@gmail.com', name: 'Stored User', picture: '' },
            };

            (chrome.storage.local.set as ReturnType<typeof vi.fn>)({ auth: mockAuth });

            // Mock fetch for usage validation
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ usage: { count: 2 } }),
            }));

            await useAuthStore.getState().loadFromStorage();

            const state = useAuthStore.getState();
            expect(state.token).toBe('stored-token');
            expect(state.user).toEqual(mockAuth.user);
        });

        it('does nothing when no stored auth', async () => {
            await useAuthStore.getState().loadFromStorage();

            const state = useAuthStore.getState();
            expect(state.user).toBeNull();
            expect(state.token).toBeNull();
        });
    });
});

describe('isFreeTier', () => {
    it('returns true when no API key but has token', () => {
        expect(isFreeTier('', 'some-token')).toBe(true);
    });

    it('returns false when API key is present', () => {
        expect(isFreeTier('sk-123', 'some-token')).toBe(false);
    });

    it('returns false when no token', () => {
        expect(isFreeTier('', null)).toBe(false);
    });
});

describe('canGenerate', () => {
    it('returns true when has API key', () => {
        expect(canGenerate('sk-123', null)).toBe(true);
    });

    it('returns true when has token', () => {
        expect(canGenerate('', 'some-token')).toBe(true);
    });

    it('returns false when neither', () => {
        expect(canGenerate('', null)).toBe(false);
    });
});

describe('isUsageLimitReached', () => {
    it('returns false when under limit', () => {
        expect(isUsageLimitReached(5)).toBe(false);
    });

    it('returns true when at limit', () => {
        expect(isUsageLimitReached(10)).toBe(true);
    });

    it('returns true when over limit', () => {
        expect(isUsageLimitReached(15)).toBe(true);
    });
});
