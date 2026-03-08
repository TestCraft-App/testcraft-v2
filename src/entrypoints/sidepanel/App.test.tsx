import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { App } from './App';

describe('App', () => {
    it('renders the tab bar', () => {
        render(<App />);
        expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('renders four tabs: Ideas, Code, A11y, Settings', () => {
        render(<App />);
        expect(screen.getByRole('tab', { name: 'Ideas' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Code' })).toBeInTheDocument();
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
        expect(screen.getByText('Settings', { selector: 'h2' })).toBeInTheDocument();
    });

    it('switches back to Ideas tab from another tab', async () => {
        const user = userEvent.setup();
        render(<App />);

        await user.click(screen.getByRole('tab', { name: 'Settings' }));
        await user.click(screen.getByRole('tab', { name: 'Ideas' }));

        expect(screen.getByRole('tab', { name: 'Ideas' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByText('Pick Element')).toBeInTheDocument();
    });
});
