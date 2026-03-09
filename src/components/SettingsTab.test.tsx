import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsTab } from './SettingsTab';
import { useSettingsStore } from '../stores/settings-store';
import { useAuthStore } from '../stores/auth-store';

vi.mock('../lib/ai-provider', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../lib/ai-provider')>();
    return {
        ...actual,
        validateApiKey: vi.fn((_provider: string, key: string) => Promise.resolve(key === 'sk-valid-key')),
    };
});

describe('SettingsTab', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
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
        });
        useAuthStore.setState({
            user: null,
            token: null,
            dailyUsage: 0,
            isSigningIn: false,
        });
    });

    it('renders section headings', () => {
        render(<SettingsTab />);
        expect(screen.getByText('Account')).toBeInTheDocument();
        expect(screen.getByText('AI Configuration')).toBeInTheDocument();
        expect(screen.getByText('Test Configuration')).toBeInTheDocument();
        expect(screen.getByText('Preferences')).toBeInTheDocument();
    });

    it('renders provider dropdown with OpenAI selected', () => {
        render(<SettingsTab />);
        const providerSelect = screen.getByLabelText('AI Provider') as HTMLSelectElement;
        expect(providerSelect.value).toBe('openai');
    });

    it('changes model options when provider changes and key is valid', async () => {
        useSettingsStore.setState({ apiKey: 'sk-valid-key', apiKeys: { openai: 'sk-valid-key', anthropic: 'sk-valid-key', google: '' } });
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        render(<SettingsTab />);

        // Wait for validation to complete
        await vi.advanceTimersByTimeAsync(700);
        await waitFor(() => {
            expect((screen.getByLabelText('Model') as HTMLSelectElement).disabled).toBe(false);
        });

        await user.selectOptions(screen.getByLabelText('AI Provider'), 'anthropic');

        await vi.advanceTimersByTimeAsync(700);
        await waitFor(() => {
            const modelSelect = screen.getByLabelText('Model') as HTMLSelectElement;
            expect(modelSelect.value).toBe('claude-haiku-4-5-20251001');
        });
    });

    it('renders framework dropdown', () => {
        render(<SettingsTab />);
        const fwSelect = screen.getByLabelText('Test Framework') as HTMLSelectElement;
        expect(fwSelect.value).toBe('playwright');
    });

    it('gates language options when switching to cypress', async () => {
        const user = userEvent.setup();
        render(<SettingsTab />);

        await user.selectOptions(screen.getByLabelText('Test Framework'), 'cypress');

        const langSelect = screen.getByLabelText('Language') as HTMLSelectElement;
        const options = Array.from(langSelect.options).map((o) => o.value);
        expect(options).toEqual(['javascript', 'typescript']);
        expect(options).not.toContain('python');
    });

    it('shows all languages for playwright', () => {
        render(<SettingsTab />);
        const langSelect = screen.getByLabelText('Language') as HTMLSelectElement;
        const options = Array.from(langSelect.options).map((o) => o.value);
        expect(options).toEqual(['javascript', 'typescript', 'java', 'csharp', 'python']);
    });

    it('toggles POM switch', async () => {
        const user = userEvent.setup();
        render(<SettingsTab />);

        const toggle = screen.getByRole('switch');
        expect(toggle).toHaveAttribute('aria-checked', 'false');

        await user.click(toggle);
        expect(useSettingsStore.getState().usePOM).toBe(true);
    });

    it('updates API key', async () => {
        const user = userEvent.setup();
        render(<SettingsTab />);

        await user.type(screen.getByLabelText('API Key'), 'sk-test-123');
        expect(useSettingsStore.getState().apiKey).toBe('sk-test-123');
    });

    it('renders theme selector with Light active by default', () => {
        render(<SettingsTab />);
        const lightBtn = screen.getByText('Light');
        const darkBtn = screen.getByText('Dark');
        const systemBtn = screen.getByText('System');
        expect(lightBtn).toBeInTheDocument();
        expect(darkBtn).toBeInTheDocument();
        expect(systemBtn).toBeInTheDocument();
    });

    it('changes theme to dark', async () => {
        const user = userEvent.setup();
        render(<SettingsTab />);

        await user.click(screen.getByText('Dark'));
        expect(useSettingsStore.getState().theme).toBe('dark');
    });

    describe('Account section', () => {
        it('shows sign-in button when not signed in', () => {
            render(<SettingsTab />);
            expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
            expect(screen.getByText(/Sign in for free AI features/)).toBeInTheDocument();
        });

        it('shows user info when signed in', () => {
            useAuthStore.setState({
                user: { email: 'test@gmail.com', name: 'Test User', picture: '' },
                token: 'some-token',
                dailyUsage: 3,
            });

            render(<SettingsTab />);
            expect(screen.getByText('Test User')).toBeInTheDocument();
            expect(screen.getByText('test@gmail.com')).toBeInTheDocument();
            expect(screen.getByText('Sign Out')).toBeInTheDocument();
        });

        it('shows usage bar for free tier (signed in, no API key)', () => {
            useAuthStore.setState({
                user: { email: 'test@gmail.com', name: 'Test', picture: '' },
                token: 'some-token',
                dailyUsage: 5,
            });

            render(<SettingsTab />);
            expect(screen.getByText('5 / 10 used today')).toBeInTheDocument();
        });

        it('does not show usage bar when user has valid API key', async () => {
            useAuthStore.setState({
                user: { email: 'test@gmail.com', name: 'Test', picture: '' },
                token: 'some-token',
                dailyUsage: 5,
            });
            useSettingsStore.setState({ apiKey: 'sk-valid-key', apiKeys: { openai: 'sk-valid-key', anthropic: '', google: '' } });

            render(<SettingsTab />);
            await vi.advanceTimersByTimeAsync(700);
            await waitFor(() => {
                expect(screen.queryByText(/used today/)).not.toBeInTheDocument();
            });
        });

        it('locks model dropdown to gpt-4o-mini when no valid key', () => {
            useAuthStore.setState({
                user: { email: 'test@gmail.com', name: 'Test', picture: '' },
                token: 'some-token',
            });

            render(<SettingsTab />);
            const modelSelect = screen.getByLabelText('Model') as HTMLSelectElement;
            expect(modelSelect.disabled).toBe(true);
            expect(modelSelect.value).toBe('gpt-4o-mini');
        });

        it('unlocks model dropdown when user has valid API key', async () => {
            useAuthStore.setState({
                user: { email: 'test@gmail.com', name: 'Test', picture: '' },
                token: 'some-token',
            });
            useSettingsStore.setState({ apiKey: 'sk-valid-key', apiKeys: { openai: 'sk-valid-key', anthropic: '', google: '' } });

            render(<SettingsTab />);
            await vi.advanceTimersByTimeAsync(700);
            await waitFor(() => {
                const modelSelect = screen.getByLabelText('Model') as HTMLSelectElement;
                expect(modelSelect.disabled).toBe(false);
            });
        });

        it('provider dropdown is always enabled when signed in', () => {
            useAuthStore.setState({
                user: { email: 'test@gmail.com', name: 'Test', picture: '' },
                token: 'some-token',
            });

            render(<SettingsTab />);
            const providerSelect = screen.getByLabelText('AI Provider') as HTMLSelectElement;
            expect(providerSelect.disabled).toBe(false);
        });
    });
});
