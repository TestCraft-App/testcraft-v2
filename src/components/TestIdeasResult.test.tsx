import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TestIdeasResult } from './TestIdeasResult';

const ideasContent = `**Positive Tests**
1. Verify the button is clickable
2. Verify successful form submission

**Negative Tests**
1. Verify error on empty input
`;

describe('TestIdeasResult', () => {
    const defaultProps = {
        content: ideasContent,
        isStreaming: false,
        selectedIdeas: new Set<number>(),
        onToggleIdea: vi.fn(),
    };

    it('renders test ideas heading', () => {
        render(<TestIdeasResult {...defaultProps} />);
        expect(screen.getByText('Test Ideas')).toBeInTheDocument();
    });

    it('renders categorized sections', () => {
        render(<TestIdeasResult {...defaultProps} />);
        expect(screen.getByText('Positive Tests')).toBeInTheDocument();
        expect(screen.getByText('Negative Tests')).toBeInTheDocument();
    });

    it('renders individual ideas with checkboxes', () => {
        render(<TestIdeasResult {...defaultProps} />);
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBe(3);
        expect(screen.getByText('Verify the button is clickable')).toBeInTheDocument();
    });

    it('calls onToggleIdea when checkbox is clicked', async () => {
        const onToggleIdea = vi.fn();
        const user = userEvent.setup();
        render(<TestIdeasResult {...defaultProps} onToggleIdea={onToggleIdea} />);

        const checkboxes = screen.getAllByRole('checkbox');
        await user.click(checkboxes[0]);

        expect(onToggleIdea).toHaveBeenCalledWith(0);
    });

    it('shows selected count when ideas are selected', () => {
        render(<TestIdeasResult {...defaultProps} selectedIdeas={new Set([0])} />);
        expect(screen.getByText('1 selected')).toBeInTheDocument();
    });

    it('copies selected ideas to clipboard', async () => {
        const user = userEvent.setup();
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            writable: true,
            configurable: true,
        });

        render(<TestIdeasResult {...defaultProps} selectedIdeas={new Set([0])} />);
        await user.click(screen.getByText('Copy'));

        expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Verify the button is clickable'));
    });

    it('shows streaming indicator when still streaming', () => {
        render(<TestIdeasResult {...defaultProps} isStreaming={true} />);
        expect(screen.getByText('Streaming...')).toBeInTheDocument();
    });
});
