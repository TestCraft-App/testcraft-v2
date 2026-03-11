import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App } from './App';
import { useElementStore } from '../../stores/element-store';
import { useIdeasStore } from '../../stores/ideas-store';
import { useTestDataStore } from '../../stores/test-data-store';

const mockGenerate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../../hooks/useAIGenerate', () => ({
    useAIGenerate: () => ({ generate: mockGenerate }),
}));

describe('App', () => {
    beforeEach(() => {
        mockGenerate.mockReset().mockResolvedValue(undefined);
        useElementStore.setState({ pickedElement: null, isPicking: false });
        useIdeasStore.setState({ entries: [], currentIndex: -1, isStreaming: false, error: null, streamingIndex: -1 });
        useTestDataStore.getState().reset();
    });

    it('renders the tab bar', () => {
        render(<App />);
        expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('renders five tabs: Ideas, Code, Data, A11y, Settings', () => {
        render(<App />);
        expect(screen.getByRole('tab', { name: 'Ideas' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Code' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Data' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'A11y' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Settings' })).toBeInTheDocument();
    });

    it('shows Ideas tab content by default', () => {
        render(<App />);
        expect(screen.getByText('Pick Element')).toBeInTheDocument();
        expect(screen.getByText('Generate Ideas')).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Ideas' })).toHaveAttribute('aria-selected', 'true');
    });

    it('switches to Code tab on click', async () => {
        const user = userEvent.setup();
        render(<App />);

        await user.click(screen.getByRole('tab', { name: 'Code' }));

        expect(screen.getByRole('tab', { name: 'Code' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tab', { name: 'Ideas' })).toHaveAttribute('aria-selected', 'false');
        expect(screen.getByText('Automate Tests')).toBeInTheDocument();
    });

    it('switches to Data tab on click', async () => {
        const user = userEvent.setup();
        render(<App />);

        await user.click(screen.getByRole('tab', { name: 'Data' }));

        expect(screen.getByRole('tab', { name: 'Data' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByText('Detect Fields')).toBeInTheDocument();
    });

    it('switches to A11y tab on click', async () => {
        const user = userEvent.setup();
        render(<App />);

        await user.click(screen.getByRole('tab', { name: 'A11y' }));

        expect(screen.getByRole('tab', { name: 'A11y' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByText('Run Accessibility Check')).toBeInTheDocument();
    });

    it('switches to Settings tab on click', async () => {
        const user = userEvent.setup();
        render(<App />);

        await user.click(screen.getByRole('tab', { name: 'Settings' }));

        expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByText('AI Configuration')).toBeInTheDocument();
    });

    it('switches back to Ideas tab from another tab', async () => {
        const user = userEvent.setup();
        render(<App />);

        await user.click(screen.getByRole('tab', { name: 'Settings' }));
        await user.click(screen.getByRole('tab', { name: 'Ideas' }));

        expect(screen.getByRole('tab', { name: 'Ideas' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByText('Pick Element')).toBeInTheDocument();
    });

    // --- Cross-tab flow tests ---

    it('Automate Selected on Ideas tab switches to Code tab', async () => {
        useElementStore.setState({
            pickedElement: {
                outerHTML: '<button>Submit</button>',
                tagName: 'button',
                textContent: 'Submit',
                attributes: {},
                boundingRect: { x: 0, y: 0, width: 100, height: 40 },
                pageUrl: 'https://example.com',
                pageTitle: 'Test',
            },
        });
        useIdeasStore.setState({
            entries: [{
                id: '1',
                content: 'Positive Tests:\n1. Click submit\n2. Verify form sends',
                elementLabel: 'Submit',
                pageUrl: 'https://example.com',
                timestamp: Date.now(),
                selectedIdeas: new Set([0]),
            }],
            currentIndex: 0,
            isStreaming: false,
            streamingIndex: -1,
        });

        const user = userEvent.setup();
        render(<App />);

        await user.click(screen.getByText(/Automate Selected/));

        await waitFor(() => {
            expect(screen.getByRole('tab', { name: 'Code' })).toHaveAttribute('aria-selected', 'true');
        });
        expect(screen.getByText('Automate Tests')).toBeInTheDocument();
    });

    it('Data tab state persists across tab switches', async () => {
        // Pre-populate fields in store
        useTestDataStore.getState().setFields([
            { selector: '#name', name: 'name', label: 'Full Name', type: 'text', required: true },
        ]);

        const user = userEvent.setup();
        render(<App />);

        // Switch to Data tab — fields should be visible
        await user.click(screen.getByRole('tab', { name: 'Data' }));
        expect(screen.getByText(/Full Name/)).toBeInTheDocument();

        // Switch away to Ideas
        await user.click(screen.getByRole('tab', { name: 'Ideas' }));

        // Switch back to Data — fields should still be there
        await user.click(screen.getByRole('tab', { name: 'Data' }));
        expect(screen.getByText(/Full Name/)).toBeInTheDocument();
    });
});
