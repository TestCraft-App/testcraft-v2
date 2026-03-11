import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createStreamingProvider, createErrorProvider } from '../test/ai-mock';
import { useSettingsStore } from '../stores/settings-store';
import { useAuthStore } from '../stores/auth-store';
import { useTestDataStore } from '../stores/test-data-store';
import { TestDataTab } from './TestDataTab';
import type { DetectedFormField } from '../lib/form-data';

const mockCreateAIProvider = vi.hoisted(() => vi.fn());

vi.mock('../lib/ai-provider', async () => {
    const actual = await vi.importActual<typeof import('../lib/ai-provider')>('../lib/ai-provider');
    return { ...actual, createAIProvider: mockCreateAIProvider };
});

const mockFields: DetectedFormField[] = [
    { selector: '#name', name: 'name', label: 'Name', type: 'text', required: true },
    { selector: '#email', name: 'email', label: 'Email', type: 'email', required: true },
];

// Valid JSON response the AI would return
const validDatasetJson = JSON.stringify({
    datasets: [
        { id: 'valid-all', name: 'Valid - All Fields', values: { '#name': 'John', '#email': 'john@test.com' } },
        { id: 'empty-name', name: 'Empty Name', values: { '#name': '', '#email': 'a@b.com' } },
    ],
});

describe('TestDataTab', () => {
    beforeEach(() => {
        mockCreateAIProvider.mockReset();
        useTestDataStore.getState().reset();

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
        });
        useAuthStore.setState({
            user: null,
            token: null,
            dailyUsage: 0,
            isSigningIn: false,
        });

        // Default: auto-detect returns empty fields
        (chrome.tabs.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({ fields: [] });
    });

    it('renders Detect Fields and Generate Data buttons', () => {
        // Pre-populate fields to prevent auto-detect from showing "Detecting..."
        useTestDataStore.getState().setFields(mockFields);
        render(<TestDataTab />);
        expect(screen.getByText('Detect Fields')).toBeInTheDocument();
        expect(screen.getByText('Generate Data')).toBeInTheDocument();
    });

    it('disables Generate Data when no fields are selected', () => {
        // Pre-populate fields then deselect all
        useTestDataStore.getState().setFields(mockFields);
        useTestDataStore.getState().deselectAllFields();
        render(<TestDataTab />);
        expect(screen.getByText('Generate Data')).toBeDisabled();
    });

    it('auto-detects fields on mount', async () => {
        (chrome.tabs.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({ fields: mockFields });
        render(<TestDataTab />);

        await waitFor(() => {
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, { action: 'detect-form-fields' });
        });
    });

    it('shows detected fields after detection', async () => {
        (chrome.tabs.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({ fields: mockFields });
        render(<TestDataTab />);

        await waitFor(() => {
            expect(screen.getByText(/Name/)).toBeInTheDocument();
            expect(screen.getByText(/Email/)).toBeInTheDocument();
        });
    });

    it('Generate Data creates provider with proxy config when free tier', async () => {
        // Pre-populate fields so we can click Generate Data
        useTestDataStore.getState().setFields(mockFields);
        useAuthStore.setState({ token: 'google-tok', signOut: vi.fn(), refreshUsage: vi.fn() });
        mockCreateAIProvider.mockReturnValue(createStreamingProvider([validDatasetJson]));

        const user = userEvent.setup();
        render(<TestDataTab />);
        await user.click(screen.getByText('Generate Data'));

        await waitFor(() => {
            expect(mockCreateAIProvider).toHaveBeenCalledWith({
                provider: 'openai',
                apiKey: '',
                model: 'gpt-4o-mini',
                useProxy: true,
                authToken: 'google-tok',
            });
        });
    });

    it('Generate Data creates provider with direct config when API key is set', async () => {
        useTestDataStore.getState().setFields(mockFields);
        useSettingsStore.setState({ apiKey: 'sk-test', provider: 'google', model: 'gemini-2.5-flash' });
        mockCreateAIProvider.mockReturnValue(createStreamingProvider([validDatasetJson]));

        const user = userEvent.setup();
        render(<TestDataTab />);
        await user.click(screen.getByText('Generate Data'));

        await waitFor(() => {
            expect(mockCreateAIProvider).toHaveBeenCalledWith({
                provider: 'google',
                apiKey: 'sk-test',
                model: 'gemini-2.5-flash',
                useProxy: false,
                authToken: undefined,
            });
        });
    });

    it('Generate Data shows error when no key and no token', async () => {
        useTestDataStore.getState().setFields(mockFields);

        const user = userEvent.setup();
        render(<TestDataTab />);
        await user.click(screen.getByText('Generate Data'));

        await waitFor(() => {
            expect(screen.getByText(/Sign in with Google or add an API key/)).toBeInTheDocument();
        });
        expect(mockCreateAIProvider).not.toHaveBeenCalled();
    });

    it('Generate Data calls signOut on 401 in proxy mode', async () => {
        const mockSignOut = vi.fn();
        useTestDataStore.getState().setFields(mockFields);
        useSettingsStore.setState({ apiKey: '' });
        useAuthStore.setState({ token: 'tok', signOut: mockSignOut, refreshUsage: vi.fn() });
        mockCreateAIProvider.mockReturnValue(createErrorProvider(401, 'Unauthorized'));

        const user = userEvent.setup();
        render(<TestDataTab />);
        await user.click(screen.getByText('Generate Data'));

        await waitFor(() => {
            expect(mockSignOut).toHaveBeenCalled();
        });
    });

    it('Generate Data calls refreshUsage after proxy success', async () => {
        const mockRefreshUsage = vi.fn();
        useTestDataStore.getState().setFields(mockFields);
        useSettingsStore.setState({ apiKey: '' });
        useAuthStore.setState({ token: 'tok', signOut: vi.fn(), refreshUsage: mockRefreshUsage });
        mockCreateAIProvider.mockReturnValue(createStreamingProvider([validDatasetJson]));

        const user = userEvent.setup();
        render(<TestDataTab />);
        await user.click(screen.getByText('Generate Data'));

        await waitFor(() => {
            expect(mockRefreshUsage).toHaveBeenCalled();
        });
    });

    it('shows datasets after successful generation', async () => {
        useTestDataStore.getState().setFields(mockFields);
        useSettingsStore.setState({ apiKey: 'sk-test' });
        mockCreateAIProvider.mockReturnValue(createStreamingProvider([validDatasetJson]));

        const user = userEvent.setup();
        render(<TestDataTab />);
        await user.click(screen.getByText('Generate Data'));

        await waitFor(() => {
            expect(screen.getByText('Valid - All Fields')).toBeInTheDocument();
            expect(screen.getByText('Empty Name')).toBeInTheDocument();
        });
    });
});
