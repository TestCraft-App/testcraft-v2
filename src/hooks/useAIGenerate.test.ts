import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createStreamingProvider, createErrorProvider } from '../test/ai-mock';
import { useSettingsStore } from '../stores/settings-store';
import { useAuthStore } from '../stores/auth-store';
import { useAIGenerate, type GenerationStoreActions } from './useAIGenerate';

const mockCreateAIProvider = vi.hoisted(() => vi.fn());

vi.mock('../lib/ai-provider', async () => {
    const actual = await vi.importActual<typeof import('../lib/ai-provider')>('../lib/ai-provider');
    return { ...actual, createAIProvider: mockCreateAIProvider };
});

function createMockActions(): GenerationStoreActions {
    return {
        startGeneration: vi.fn(),
        appendContent: vi.fn(),
        setStreaming: vi.fn(),
        setError: vi.fn(),
    };
}

describe('useAIGenerate', () => {
    let actions: GenerationStoreActions;
    let mockSignOut: ReturnType<typeof vi.fn>;
    let mockRefreshUsage: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        actions = createMockActions();
        mockSignOut = vi.fn();
        mockRefreshUsage = vi.fn();
        mockCreateAIProvider.mockReset();

        useSettingsStore.setState({
            provider: 'openai',
            apiKey: '',
            apiKeys: { openai: '', anthropic: '', google: '' },
            model: 'gpt-4o',
            framework: 'playwright',
            language: 'typescript',
            usePOM: false,
            useProxy: false,
            theme: 'light',
            promptContext: '',
            promptContexts: { ideas: '', code: '', a11y: '', data: '' },
        });
        useAuthStore.setState({
            user: null,
            token: null,
            dailyUsage: 0,
            isSigningIn: false,
            signOut: mockSignOut,
            refreshUsage: mockRefreshUsage,
        });
    });

    it('creates provider with direct config when API key is set', async () => {
        useSettingsStore.setState({ apiKey: 'sk-test', provider: 'openai', model: 'gpt-4o' });
        mockCreateAIProvider.mockReturnValue(createStreamingProvider([]));

        const { result } = renderHook(() => useAIGenerate(actions));
        await act(() => result.current.generate('prompt', 'system', 'Button', 'https://x.com'));

        expect(mockCreateAIProvider).toHaveBeenCalledWith({
            provider: 'openai',
            apiKey: 'sk-test',
            model: 'gpt-4o',
            useProxy: false,
            authToken: undefined,
        });
    });

    it('creates provider with proxy config when free tier', async () => {
        useAuthStore.setState({ token: 'google-id-token', signOut: mockSignOut, refreshUsage: mockRefreshUsage });
        mockCreateAIProvider.mockReturnValue(createStreamingProvider([]));

        const { result } = renderHook(() => useAIGenerate(actions));
        await act(() => result.current.generate('prompt', 'system', 'Button', 'https://x.com'));

        expect(mockCreateAIProvider).toHaveBeenCalledWith({
            provider: 'openai',
            apiKey: '',
            model: 'gpt-4o-mini',
            useProxy: true,
            authToken: 'google-id-token',
        });
    });

    it('sets error when neither API key nor token is available', async () => {
        const { result } = renderHook(() => useAIGenerate(actions));
        await act(() => result.current.generate('prompt', 'system', 'Button', 'https://x.com'));

        expect(mockCreateAIProvider).not.toHaveBeenCalled();
        expect(actions.setError).toHaveBeenCalledWith(
            'Sign in with Google or add an API key in Settings to generate.',
        );
    });

    it('calls startGeneration before streaming', async () => {
        useSettingsStore.setState({ apiKey: 'sk-test' });
        mockCreateAIProvider.mockReturnValue(createStreamingProvider(['chunk']));

        const { result } = renderHook(() => useAIGenerate(actions));
        await act(() => result.current.generate('prompt', 'system', 'MyBtn', 'https://x.com'));

        expect(actions.startGeneration).toHaveBeenCalledWith('MyBtn', 'https://x.com');
        const startOrder = (actions.startGeneration as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
        const appendOrder = (actions.appendContent as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0];
        expect(startOrder).toBeLessThan(appendOrder);
    });

    it('streams content chunks to appendContent', async () => {
        useSettingsStore.setState({ apiKey: 'sk-test' });
        mockCreateAIProvider.mockReturnValue(createStreamingProvider(['Hello', ' world']));

        const { result } = renderHook(() => useAIGenerate(actions));
        await act(() => result.current.generate('prompt', 'system', 'Btn', 'https://x.com'));

        expect(actions.appendContent).toHaveBeenCalledTimes(2);
        expect(actions.appendContent).toHaveBeenNthCalledWith(1, 'Hello');
        expect(actions.appendContent).toHaveBeenNthCalledWith(2, ' world');
    });

    it('calls setStreaming(false) after success', async () => {
        useSettingsStore.setState({ apiKey: 'sk-test' });
        mockCreateAIProvider.mockReturnValue(createStreamingProvider(['ok']));

        const { result } = renderHook(() => useAIGenerate(actions));
        await act(() => result.current.generate('prompt', 'system', 'Btn', 'https://x.com'));

        expect(actions.setStreaming).toHaveBeenCalledWith(false);
    });

    it('calls refreshUsage after proxy generation', async () => {
        useAuthStore.setState({ token: 'tok', signOut: mockSignOut, refreshUsage: mockRefreshUsage });
        mockCreateAIProvider.mockReturnValue(createStreamingProvider(['ok']));

        const { result } = renderHook(() => useAIGenerate(actions));
        await act(() => result.current.generate('prompt', 'system', 'Btn', 'https://x.com'));

        expect(mockRefreshUsage).toHaveBeenCalled();
    });

    it('does NOT call refreshUsage for direct API', async () => {
        useSettingsStore.setState({ apiKey: 'sk-test' });
        mockCreateAIProvider.mockReturnValue(createStreamingProvider(['ok']));

        const { result } = renderHook(() => useAIGenerate(actions));
        await act(() => result.current.generate('prompt', 'system', 'Btn', 'https://x.com'));

        expect(mockRefreshUsage).not.toHaveBeenCalled();
    });

    it('calls signOut on 401 in proxy mode', async () => {
        useAuthStore.setState({ token: 'tok', signOut: mockSignOut, refreshUsage: mockRefreshUsage });
        mockCreateAIProvider.mockReturnValue(createErrorProvider(401, 'Unauthorized'));

        const { result } = renderHook(() => useAIGenerate(actions));
        await act(() => result.current.generate('prompt', 'system', 'Btn', 'https://x.com'));

        expect(mockSignOut).toHaveBeenCalled();
        expect(actions.setError).toHaveBeenCalled();
    });

    it('does NOT call signOut on 401 in direct mode', async () => {
        useSettingsStore.setState({ apiKey: 'sk-test' });
        mockCreateAIProvider.mockReturnValue(createErrorProvider(401, 'Unauthorized'));

        const { result } = renderHook(() => useAIGenerate(actions));
        await act(() => result.current.generate('prompt', 'system', 'Btn', 'https://x.com'));

        expect(mockSignOut).not.toHaveBeenCalled();
        expect(actions.setError).toHaveBeenCalled();
    });

    it('sets error message on provider failure', async () => {
        useSettingsStore.setState({ apiKey: 'sk-test' });
        mockCreateAIProvider.mockReturnValue(createErrorProvider(500, 'Server error'));

        const { result } = renderHook(() => useAIGenerate(actions));
        await act(() => result.current.generate('prompt', 'system', 'Btn', 'https://x.com'));

        expect(actions.setError).toHaveBeenCalledWith('AI provider error (500)');
    });

    it('uses gpt-4o-mini model for free tier', async () => {
        useSettingsStore.setState({ model: 'gpt-4o' });
        useAuthStore.setState({ token: 'tok', signOut: mockSignOut, refreshUsage: mockRefreshUsage });
        mockCreateAIProvider.mockReturnValue(createStreamingProvider([]));

        const { result } = renderHook(() => useAIGenerate(actions));
        await act(() => result.current.generate('prompt', 'system', 'Btn', 'https://x.com'));

        expect(mockCreateAIProvider).toHaveBeenCalledWith(
            expect.objectContaining({ model: 'gpt-4o-mini' }),
        );
    });
});
