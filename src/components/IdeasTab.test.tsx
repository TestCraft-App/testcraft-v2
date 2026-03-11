import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IdeasTab } from './IdeasTab';
import { useElementStore } from '../stores/element-store';
import { useIdeasStore } from '../stores/ideas-store';
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

describe('IdeasTab', () => {
    beforeEach(() => {
        mockGenerate.mockReset();
        useElementStore.setState({ pickedElement: null, isPicking: false });
        useIdeasStore.setState({ entries: [], currentIndex: -1, isStreaming: false, error: null, streamingIndex: -1 });
    });

    it('renders Pick Element and Generate Ideas buttons', () => {
        render(<IdeasTab onAutomateSelected={() => {}} />);
        expect(screen.getByText('Pick Element')).toBeInTheDocument();
        expect(screen.getByText('Generate Ideas')).toBeInTheDocument();
    });

    it('disables Generate Ideas when no element is picked', () => {
        render(<IdeasTab onAutomateSelected={() => {}} />);
        expect(screen.getByText('Generate Ideas')).toBeDisabled();
    });

    it('enables Generate Ideas when an element is picked', () => {
        useElementStore.setState({ pickedElement: mockElement });
        render(<IdeasTab onAutomateSelected={() => {}} />);
        expect(screen.getByText('Generate Ideas')).not.toBeDisabled();
    });

    it('shows element preview when an element is picked', () => {
        useElementStore.setState({ pickedElement: mockElement });
        render(<IdeasTab onAutomateSelected={() => {}} />);
        expect(screen.getByText('Selected element')).toBeInTheDocument();
    });

    it('shows error when error is set', () => {
        useIdeasStore.setState({ error: 'API key invalid' });
        render(<IdeasTab onAutomateSelected={() => {}} />);
        expect(screen.getByText('API key invalid')).toBeInTheDocument();
    });

    it('does not show Automate Selected when no ideas are selected', () => {
        useElementStore.setState({ pickedElement: mockElement });
        render(<IdeasTab onAutomateSelected={() => {}} />);
        expect(screen.queryByText(/Automate Selected/)).not.toBeInTheDocument();
    });

    it('sends start-picking message when Pick Element is clicked', async () => {
        const user = userEvent.setup();
        render(<IdeasTab onAutomateSelected={() => {}} />);

        await user.click(screen.getByText('Pick Element'));

        expect(chrome.tabs.query).toHaveBeenCalled();
        expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, { action: 'start-picking' });
    });

    it('shows Cancel Picking when picking is active', async () => {
        const user = userEvent.setup();
        render(<IdeasTab onAutomateSelected={() => {}} />);

        await user.click(screen.getByText('Pick Element'));
        expect(screen.getByText('Cancel Picking')).toBeInTheDocument();
    });

    // --- Generation flow tests ---

    it('Generate Ideas calls generate with correct prompt and system message', async () => {
        useElementStore.setState({ pickedElement: mockElement });

        const user = userEvent.setup();
        render(<IdeasTab onAutomateSelected={() => {}} />);
        await user.click(screen.getByText('Generate Ideas'));

        expect(mockGenerate).toHaveBeenCalledTimes(1);
        const [prompt, systemMsg, label, pageUrl] = mockGenerate.mock.calls[0];
        expect(prompt).toContain('Sign In');
        expect(prompt).toContain('<button>Sign In</button>');
        expect(systemMsg).toContain('expert software tester');
        expect(label).toBe('Sign In');
        expect(pageUrl).toBe('https://example.com/login');
    });

    it('Generate Ideas is disabled during streaming', () => {
        useElementStore.setState({ pickedElement: mockElement });
        useIdeasStore.setState({ isStreaming: true });
        render(<IdeasTab onAutomateSelected={() => {}} />);

        expect(screen.getByText('Generate Ideas')).toBeDisabled();
    });

    it('Automate Selected calls callback with selected ideas and element', async () => {
        const onAutomate = vi.fn();
        useElementStore.setState({ pickedElement: mockElement });
        useIdeasStore.setState({
            entries: [{
                id: '1',
                content: 'Positive Tests:\n1. Click Sign In\n2. Verify redirect',
                elementLabel: 'Sign In',
                pageUrl: 'https://example.com/login',
                timestamp: Date.now(),
                selectedIdeas: new Set([0, 1]),
            }],
            currentIndex: 0,
            isStreaming: false,
            streamingIndex: -1,
        });

        const user = userEvent.setup();
        render(<IdeasTab onAutomateSelected={onAutomate} />);
        await user.click(screen.getByText(/Automate Selected/));

        expect(onAutomate).toHaveBeenCalledTimes(1);
        expect(onAutomate).toHaveBeenCalledWith(
            ['Click Sign In', 'Verify redirect'],
            mockElement,
        );
    });

    it('shows streaming spinner while generating', () => {
        useElementStore.setState({ pickedElement: mockElement });
        useIdeasStore.setState({
            entries: [{
                id: '1',
                content: '',
                elementLabel: 'Sign In',
                pageUrl: 'https://example.com/login',
                timestamp: Date.now(),
            }],
            currentIndex: 0,
            streamingIndex: 0,
            isStreaming: true,
        });

        render(<IdeasTab onAutomateSelected={() => {}} />);
        expect(screen.getByText('Generating...')).toBeInTheDocument();
    });
});
