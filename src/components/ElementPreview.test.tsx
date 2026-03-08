import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { ElementPreview } from './ElementPreview';
import { useElementStore } from '../stores/element-store';
import type { PickedElement } from '../lib/types';

const mockElement: PickedElement = {
    outerHTML: '<button class="btn-primary">Sign In</button>',
    tagName: 'button',
    textContent: 'Sign In',
    attributes: { class: 'btn-primary' },
    boundingRect: { x: 100, y: 200, width: 120, height: 40 },
    pageUrl: 'https://example.com/login',
    pageTitle: 'Login',
};

describe('ElementPreview', () => {
    beforeEach(() => {
        useElementStore.setState({ pickedElement: null, isPicking: false });
    });

    it('renders nothing when no element is picked', () => {
        const { container } = render(<ElementPreview />);
        expect(container.innerHTML).toBe('');
    });

    it('renders "Selected element" label when element is picked', () => {
        useElementStore.setState({ pickedElement: mockElement });
        render(<ElementPreview />);
        expect(screen.getByText('Selected element')).toBeInTheDocument();
    });

    it('renders screenshot when available', () => {
        useElementStore.setState({
            pickedElement: { ...mockElement, screenshot: 'data:image/png;base64,abc' },
        });
        render(<ElementPreview />);
        expect(screen.getByAltText('Element screenshot')).toHaveAttribute(
            'src',
            'data:image/png;base64,abc',
        );
    });

    it('does not render screenshot when not available', () => {
        useElementStore.setState({ pickedElement: mockElement });
        render(<ElementPreview />);
        expect(screen.queryByAltText('Element screenshot')).not.toBeInTheDocument();
    });

    it('clears element when Clear button is clicked', async () => {
        const user = userEvent.setup();
        useElementStore.setState({ pickedElement: mockElement });
        render(<ElementPreview />);

        await user.click(screen.getByLabelText('Clear selected element'));
        expect(useElementStore.getState().pickedElement).toBeNull();
    });

    it('shows truncated HTML in details', () => {
        useElementStore.setState({ pickedElement: mockElement });
        render(<ElementPreview />);
        expect(screen.getByText('HTML')).toBeInTheDocument();
    });
});
