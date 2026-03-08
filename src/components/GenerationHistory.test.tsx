import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { GenerationHistory } from './GenerationHistory';
import type { GenerationEntry } from '../lib/types';

function makeEntry(overrides: Partial<GenerationEntry> = {}): GenerationEntry {
    return {
        id: 'test-id',
        content: 'test content',
        elementLabel: 'Submit button',
        pageUrl: 'https://example.com/page',
        timestamp: Date.now(),
        ...overrides,
    };
}

describe('GenerationHistory', () => {
    const defaultProps = {
        entries: [makeEntry()],
        currentIndex: 0,
        onNavigate: vi.fn(),
        onUpdateLabel: vi.fn(),
        onRemove: vi.fn(),
    };

    it('renders nothing when entries is empty', () => {
        const { container } = render(
            <GenerationHistory {...defaultProps} entries={[]} currentIndex={-1} />,
        );
        expect(container.innerHTML).toBe('');
    });

    it('shows generation counter', () => {
        render(<GenerationHistory {...defaultProps} />);
        expect(screen.getByText('Gen 1 of 1')).toBeInTheDocument();
    });

    it('shows element label', () => {
        render(<GenerationHistory {...defaultProps} />);
        expect(screen.getByText('Submit button')).toBeInTheDocument();
    });

    it('disables previous button on first entry', () => {
        render(<GenerationHistory {...defaultProps} />);
        expect(screen.getByLabelText('Previous generation')).toBeDisabled();
    });

    it('disables next button on last entry', () => {
        render(<GenerationHistory {...defaultProps} />);
        expect(screen.getByLabelText('Next generation')).toBeDisabled();
    });

    it('enables navigation buttons when there are multiple entries', () => {
        const entries = [makeEntry({ id: '1' }), makeEntry({ id: '2' }), makeEntry({ id: '3' })];
        render(<GenerationHistory {...defaultProps} entries={entries} currentIndex={1} />);

        expect(screen.getByLabelText('Previous generation')).not.toBeDisabled();
        expect(screen.getByLabelText('Next generation')).not.toBeDisabled();
        expect(screen.getByText('Gen 2 of 3')).toBeInTheDocument();
    });

    it('calls onNavigate when arrow buttons are clicked', async () => {
        const user = userEvent.setup();
        const onNavigate = vi.fn();
        const entries = [makeEntry({ id: '1' }), makeEntry({ id: '2' })];
        render(<GenerationHistory {...defaultProps} entries={entries} currentIndex={0} onNavigate={onNavigate} />);

        await user.click(screen.getByLabelText('Next generation'));
        expect(onNavigate).toHaveBeenCalledWith(1);
    });

    it('calls onRemove when Remove button is clicked', async () => {
        const user = userEvent.setup();
        const onRemove = vi.fn();
        render(<GenerationHistory {...defaultProps} onRemove={onRemove} />);

        await user.click(screen.getByText('Remove'));
        expect(onRemove).toHaveBeenCalled();
    });

    it('shows edit input when pencil icon is clicked', async () => {
        const user = userEvent.setup();
        render(<GenerationHistory {...defaultProps} />);

        await user.click(screen.getByLabelText('Edit label'));
        expect(screen.getByDisplayValue('Submit button')).toBeInTheDocument();
    });
});
