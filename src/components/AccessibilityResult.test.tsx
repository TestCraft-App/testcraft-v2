import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AccessibilityResult } from './AccessibilityResult';
import type { A11yViolation } from '../lib/accessibility';

const mockViolations: A11yViolation[] = [
    {
        id: 'image-alt',
        impact: 'critical',
        description: 'Images must have alternate text',
        help: 'Missing alt text',
        helpUrl: 'https://example.com/help',
        wcagTags: ['wcag2a', 'wcag111'],
        nodes: [{ html: '<img src="photo.jpg">', failureSummary: 'No alt' }],
    },
    {
        id: 'color-contrast',
        impact: 'serious',
        description: 'Color contrast must meet minimum ratio',
        help: 'Low contrast text',
        helpUrl: '',
        wcagTags: ['wcag2aa'],
        nodes: [{ html: '<p>text</p>', failureSummary: 'Low contrast' }],
    },
];

describe('AccessibilityResult', () => {
    it('shows success message when no violations', () => {
        render(<AccessibilityResult violations={[]} />);
        expect(screen.getByText(/no accessibility violations found/i)).toBeInTheDocument();
    });

    it('shows violation count', () => {
        render(<AccessibilityResult violations={mockViolations} />);
        expect(screen.getByText('2 accessibility violations')).toBeInTheDocument();
    });

    it('renders violations grouped by impact', () => {
        render(<AccessibilityResult violations={mockViolations} />);
        expect(screen.getByText(/Critical \(1\)/)).toBeInTheDocument();
        expect(screen.getByText(/Serious \(1\)/)).toBeInTheDocument();
    });

    it('renders violation details', () => {
        render(<AccessibilityResult violations={mockViolations} />);
        expect(screen.getByText('Missing alt text')).toBeInTheDocument();
        expect(screen.getByText('Low contrast text')).toBeInTheDocument();
    });

    it('shows WCAG tags', () => {
        render(<AccessibilityResult violations={mockViolations} />);
        expect(screen.getByText('wcag2a')).toBeInTheDocument();
        expect(screen.getByText('wcag111')).toBeInTheDocument();
    });

    it('renders Analyze button for each violation', () => {
        render(<AccessibilityResult violations={mockViolations} />);
        const buttons = screen.getAllByText('Analyze');
        expect(buttons).toHaveLength(2);
    });
});
