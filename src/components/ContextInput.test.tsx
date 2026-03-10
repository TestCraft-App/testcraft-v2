import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextInput } from './ContextInput';
import { useSettingsStore } from '../stores/settings-store';

describe('ContextInput', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        useSettingsStore.setState({ promptContext: '' });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders the Additional Context header', () => {
        render(<ContextInput />);
        expect(screen.getByText('Additional Context')).toBeInTheDocument();
    });

    it('starts collapsed when promptContext is empty', () => {
        render(<ContextInput />);
        expect(screen.queryByPlaceholderText(/banking login/)).not.toBeInTheDocument();
    });

    it('starts expanded when promptContext has content', () => {
        useSettingsStore.setState({ promptContext: 'some context' });
        render(<ContextInput />);
        expect(screen.getByPlaceholderText(/banking login/)).toBeInTheDocument();
    });

    it('expands when header is clicked', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        render(<ContextInput />);

        await user.click(screen.getByText('Additional Context'));
        expect(screen.getByPlaceholderText(/banking login/)).toBeInTheDocument();
    });

    it('collapses when header is clicked again', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        render(<ContextInput />);

        await user.click(screen.getByText('Additional Context'));
        expect(screen.getByPlaceholderText(/banking login/)).toBeInTheDocument();

        await user.click(screen.getByText('Additional Context'));
        expect(screen.queryByPlaceholderText(/banking login/)).not.toBeInTheDocument();
    });

    it('persists value to settings store after debounce', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        render(<ContextInput />);

        await user.click(screen.getByText('Additional Context'));
        await user.type(screen.getByPlaceholderText(/banking login/), 'test context');

        // Before debounce, store should still be empty
        expect(useSettingsStore.getState().promptContext).toBe('');

        // Advance past debounce
        act(() => vi.advanceTimersByTime(500));
        expect(useSettingsStore.getState().promptContext).toBe('test context');
    });

    it('enforces 500 character limit', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        render(<ContextInput />);

        await user.click(screen.getByText('Additional Context'));
        const textarea = screen.getByPlaceholderText(/banking login/);

        const longText = 'a'.repeat(600);
        await user.click(textarea);
        await user.paste(longText);

        expect(textarea).toHaveAttribute('maxLength', '500');
        expect((textarea as HTMLTextAreaElement).value.length).toBeLessThanOrEqual(500);
    });

    it('shows character counter when expanded', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        render(<ContextInput />);

        await user.click(screen.getByText('Additional Context'));
        expect(screen.getByText('0/500')).toBeInTheDocument();
    });

    it('clears context when clear button is clicked', async () => {
        useSettingsStore.setState({ promptContext: 'existing context' });
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        render(<ContextInput />);

        const clearButton = screen.getByLabelText('Clear context');
        await user.click(clearButton);

        expect((screen.getByPlaceholderText(/banking login/) as HTMLTextAreaElement).value).toBe('');
        expect(useSettingsStore.getState().promptContext).toBe('');
    });

    it('shows active badge when context has content', () => {
        useSettingsStore.setState({ promptContext: 'some context' });
        render(<ContextInput />);
        expect(screen.getByText('active')).toBeInTheDocument();
    });

    it('does not show active badge when context is empty', () => {
        render(<ContextInput />);
        expect(screen.queryByText('active')).not.toBeInTheDocument();
    });

    it('does not show clear button when context is empty', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
        render(<ContextInput />);
        await user.click(screen.getByText('Additional Context'));
        expect(screen.queryByLabelText('Clear context')).not.toBeInTheDocument();
    });
});
