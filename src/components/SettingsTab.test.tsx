import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsTab } from './SettingsTab';
import { useSettingsStore } from '../stores/settings-store';

describe('SettingsTab', () => {
    beforeEach(() => {
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
    });

    it('renders section headings', () => {
        render(<SettingsTab />);
        expect(screen.getByText('AI Configuration')).toBeInTheDocument();
        expect(screen.getByText('Test Configuration')).toBeInTheDocument();
        expect(screen.getByText('Preferences')).toBeInTheDocument();
    });

    it('renders provider dropdown with OpenAI selected', () => {
        render(<SettingsTab />);
        const providerSelect = screen.getByLabelText('AI Provider') as HTMLSelectElement;
        expect(providerSelect.value).toBe('openai');
    });

    it('changes model options when provider changes', async () => {
        const user = userEvent.setup();
        render(<SettingsTab />);

        await user.selectOptions(screen.getByLabelText('AI Provider'), 'anthropic');

        const modelSelect = screen.getByLabelText('Model') as HTMLSelectElement;
        expect(modelSelect.value).toBe('claude-sonnet-4-6');
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
});
