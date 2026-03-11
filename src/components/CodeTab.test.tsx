import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CodeTab } from './CodeTab';
import { useElementStore } from '../stores/element-store';
import { useCodeStore } from '../stores/code-store';
import type { PickedElement } from '../lib/types';

const mockGenerate = vi.hoisted(() => vi.fn());

vi.mock('../hooks/useAIGenerate', () => ({
    useAIGenerate: () => ({ generate: mockGenerate }),
}));

const mockElement: PickedElement = {
    outerHTML: '<button>Sign In</button>',
    tagName: 'button',
    textContent: 'Sign In',
    attributes: {},
    boundingRect: { x: 100, y: 200, width: 120, height: 40 },
    pageUrl: 'https://example.com/login',
    pageTitle: 'Login',
};

describe('CodeTab', () => {
    beforeEach(() => {
        mockGenerate.mockReset().mockResolvedValue(undefined);
        useElementStore.setState({ pickedElement: null, isPicking: false });
        useCodeStore.setState({ entries: [], currentIndex: -1, isStreaming: false, error: null, streamingIndex: -1 });
    });

    it('renders Pick Element and Automate Tests buttons', () => {
        render(<CodeTab pendingAutomation={null} onClearPending={() => {}} />);
        expect(screen.getByText('Pick Element')).toBeInTheDocument();
        expect(screen.getByText('Automate Tests')).toBeInTheDocument();
    });

    it('disables Automate Tests when no element is picked', () => {
        render(<CodeTab pendingAutomation={null} onClearPending={() => {}} />);
        expect(screen.getByText('Automate Tests')).toBeDisabled();
    });

    it('enables Automate Tests when an element is picked', () => {
        useElementStore.setState({ pickedElement: mockElement });
        render(<CodeTab pendingAutomation={null} onClearPending={() => {}} />);
        expect(screen.getByText('Automate Tests')).not.toBeDisabled();
    });

    it('shows element preview when an element is picked', () => {
        useElementStore.setState({ pickedElement: mockElement });
        render(<CodeTab pendingAutomation={null} onClearPending={() => {}} />);
        expect(screen.getByText('Selected element')).toBeInTheDocument();
    });

    it('shows error when error is set', () => {
        useCodeStore.setState({ error: 'Rate limit exceeded' });
        render(<CodeTab pendingAutomation={null} onClearPending={() => {}} />);
        expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
    });

    it('sends start-picking message when Pick Element is clicked', async () => {
        const user = userEvent.setup();
        render(<CodeTab pendingAutomation={null} onClearPending={() => {}} />);

        await user.click(screen.getByText('Pick Element'));

        expect(chrome.tabs.query).toHaveBeenCalled();
        expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, { action: 'start-picking' });
    });

    it('shows Cancel Picking when picking is active', async () => {
        const user = userEvent.setup();
        render(<CodeTab pendingAutomation={null} onClearPending={() => {}} />);

        await user.click(screen.getByText('Pick Element'));
        expect(screen.getByText('Cancel Picking')).toBeInTheDocument();
    });

    // --- Generation flow tests ---

    it('Automate Tests calls generate with correct prompt', async () => {
        useElementStore.setState({ pickedElement: mockElement });

        const user = userEvent.setup();
        render(<CodeTab pendingAutomation={null} onClearPending={() => {}} />);
        await user.click(screen.getByText('Automate Tests'));

        expect(mockGenerate).toHaveBeenCalledTimes(1);
        const [prompt, systemMsg, label, pageUrl] = mockGenerate.mock.calls[0];
        expect(prompt).toContain('Playwright');
        expect(prompt).toContain('<button>Sign In</button>');
        expect(systemMsg).toContain('test automation engineer');
        expect(label).toBe('Sign In');
        expect(pageUrl).toBe('https://example.com/login');
    });

    it('Automate Tests is disabled during streaming', () => {
        useElementStore.setState({ pickedElement: mockElement });
        useCodeStore.setState({ isStreaming: true });
        render(<CodeTab pendingAutomation={null} onClearPending={() => {}} />);

        expect(screen.getByText('Automate Tests')).toBeDisabled();
    });

    it('pendingAutomation triggers auto-generation on mount', async () => {
        const pending = { ideas: ['Click button', 'Verify text'], element: mockElement };
        render(<CodeTab pendingAutomation={pending} onClearPending={() => {}} />);

        await waitFor(() => {
            expect(mockGenerate).toHaveBeenCalledTimes(1);
        });
        const [prompt] = mockGenerate.mock.calls[0];
        expect(prompt).toContain('Click button');
        expect(prompt).toContain('Verify text');
    });

    it('pendingAutomation calls onClearPending after generation', async () => {
        const onClearPending = vi.fn();
        const pending = { ideas: ['Test idea'], element: mockElement };
        render(<CodeTab pendingAutomation={pending} onClearPending={onClearPending} />);

        await waitFor(() => {
            expect(onClearPending).toHaveBeenCalled();
        });
    });
});
