import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CodeTab } from './CodeTab';
import { useElementStore } from '../stores/element-store';
import { useCodeStore } from '../stores/code-store';
import type { PickedElement } from '../lib/types';

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
        useElementStore.setState({ pickedElement: null, isPicking: false });
        useCodeStore.setState({ entries: [], currentIndex: -1, isStreaming: false, error: null });
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
});
