import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { PageOverview } from './PageOverview';
import { usePageStore } from '../stores/page-store';
import type { PageInventory } from '../lib/page-scanner';

const mockInventory: PageInventory = {
    url: 'https://example.com',
    title: 'Example',
    elements: [
        { category: 'form', tagName: 'form', text: 'Login Form', selector: '#login', attributes: {} },
        { category: 'button', tagName: 'button', text: 'Submit', selector: 'button', attributes: {} },
        { category: 'button', tagName: 'button', text: 'Cancel', selector: 'button', attributes: {} },
        { category: 'link', tagName: 'a', text: 'Home', selector: 'a', attributes: { href: '/' } },
        { category: 'input', tagName: 'input', text: '', selector: 'input[name="email"]', attributes: { type: 'email', name: 'email' } },
    ],
    counts: { form: 1, button: 2, link: 1, input: 1, select: 0, media: 0, other: 0 },
};

describe('PageOverview', () => {
    beforeEach(() => {
        usePageStore.setState({ inventory: null });
    });

    it('renders nothing when no inventory', () => {
        const { container } = render(<PageOverview />);
        expect(container.innerHTML).toBe('');
    });

    it('renders total element count', () => {
        usePageStore.setState({ inventory: mockInventory });
        render(<PageOverview />);
        expect(screen.getByText('5 interactive elements')).toBeInTheDocument();
    });

    it('renders grouped elements by category', () => {
        usePageStore.setState({ inventory: mockInventory });
        render(<PageOverview />);
        expect(screen.getByText('Forms (1)')).toBeInTheDocument();
        expect(screen.getByText('Buttons (2)')).toBeInTheDocument();
        expect(screen.getByText('Links (1)')).toBeInTheDocument();
        expect(screen.getByText('Inputs (1)')).toBeInTheDocument();
    });

    it('does not render empty categories', () => {
        usePageStore.setState({ inventory: mockInventory });
        render(<PageOverview />);
        expect(screen.queryByText(/Selects/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Media/)).not.toBeInTheDocument();
    });

    it('sends highlight message when element is clicked', async () => {
        const user = userEvent.setup();
        usePageStore.setState({ inventory: mockInventory });
        render(<PageOverview />);

        await user.click(screen.getByText('Submit'));

        expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
            action: 'highlight-element',
            payload: { selector: 'button' },
        });
    });
});
