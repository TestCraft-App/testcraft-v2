import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { AccessibilityTab } from './AccessibilityTab';
import { useAccessibilityStore } from '../stores/accessibility-store';

describe('AccessibilityTab', () => {
    beforeEach(() => {
        useAccessibilityStore.getState().reset();
    });

    it('renders the Run Accessibility Check button', () => {
        render(<AccessibilityTab />);
        expect(screen.getByText('Run Accessibility Check')).toBeInTheDocument();
    });

    it('shows placeholder text when no scan has been run', () => {
        render(<AccessibilityTab />);
        expect(screen.getByText(/click the button above/i)).toBeInTheDocument();
    });

    it('shows scanning state when scan is in progress', () => {
        useAccessibilityStore.setState({ isScanning: true });
        render(<AccessibilityTab />);
        expect(screen.getByText('Scanning...')).toBeInTheDocument();
        expect(screen.getByText('Scanning...')).toBeDisabled();
    });

    it('shows error message on failure', () => {
        useAccessibilityStore.setState({ error: 'Failed to run accessibility check.' });
        render(<AccessibilityTab />);
        expect(screen.getByText('Failed to run accessibility check.')).toBeInTheDocument();
    });

    it('shows violations after scan completes', () => {
        useAccessibilityStore.setState({
            violations: [
                {
                    id: 'image-alt',
                    impact: 'critical',
                    description: 'Images must have alternate text',
                    help: 'Missing alt text',
                    helpUrl: '',
                    wcagTags: ['wcag2a'],
                    nodes: [{ html: '<img src="x">', failureSummary: 'No alt' }],
                },
            ],
        });
        render(<AccessibilityTab />);
        expect(screen.getByText('1 accessibility violation')).toBeInTheDocument();
        expect(screen.getByText('Missing alt text')).toBeInTheDocument();
    });
});
