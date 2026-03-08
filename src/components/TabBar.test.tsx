import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TabBar } from './TabBar';

describe('TabBar', () => {
    it('renders all four tabs', () => {
        render(<TabBar activeTab="ideas" onTabChange={() => {}} />);
        expect(screen.getAllByRole('tab')).toHaveLength(4);
    });

    it('renders correct tab labels', () => {
        render(<TabBar activeTab="ideas" onTabChange={() => {}} />);
        expect(screen.getByRole('tab', { name: 'Ideas' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Code' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'A11y' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Settings' })).toBeInTheDocument();
    });

    it('marks the active tab as selected', () => {
        render(<TabBar activeTab="code" onTabChange={() => {}} />);
        expect(screen.getByRole('tab', { name: 'Code' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tab', { name: 'Ideas' })).toHaveAttribute('aria-selected', 'false');
    });

    it('calls onTabChange when a tab is clicked', async () => {
        const user = userEvent.setup();
        const onTabChange = vi.fn();
        render(<TabBar activeTab="ideas" onTabChange={onTabChange} />);

        await user.click(screen.getByRole('tab', { name: 'Settings' }));
        expect(onTabChange).toHaveBeenCalledWith('settings');
    });

    it('calls onTabChange with accessibility when A11y tab is clicked', async () => {
        const user = userEvent.setup();
        const onTabChange = vi.fn();
        render(<TabBar activeTab="ideas" onTabChange={onTabChange} />);

        await user.click(screen.getByRole('tab', { name: 'A11y' }));
        expect(onTabChange).toHaveBeenCalledWith('accessibility');
    });
});
