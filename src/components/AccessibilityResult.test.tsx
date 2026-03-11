import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createStreamingProvider, createErrorProvider } from '../test/ai-mock';
import { useSettingsStore } from '../stores/settings-store';
import { useAuthStore } from '../stores/auth-store';
import { useAccessibilityStore } from '../stores/accessibility-store';
import { AccessibilityResult } from './AccessibilityResult';
import type { A11yViolation } from '../lib/accessibility';

const mockCreateAIProvider = vi.hoisted(() => vi.fn());

vi.mock('../lib/ai-provider', async () => {
    const actual = await vi.importActual<typeof import('../lib/ai-provider')>('../lib/ai-provider');
    return { ...actual, createAIProvider: mockCreateAIProvider };
});

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
    beforeEach(() => {
        mockCreateAIProvider.mockReset();
        useAccessibilityStore.getState().reset();
    });

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

    // --- Generation flow tests ---

    it('Analyze creates provider with authToken when free tier', async () => {
        const mockSignOut = vi.fn();
        const mockRefreshUsage = vi.fn();
        useSettingsStore.setState({ apiKey: '', provider: 'openai', model: 'gpt-4o' });
        useAuthStore.setState({ token: 'google-tok', signOut: mockSignOut, refreshUsage: mockRefreshUsage });
        mockCreateAIProvider.mockReturnValue(createStreamingProvider(['analysis result']));

        const user = userEvent.setup();
        render(<AccessibilityResult violations={[mockViolations[0]]} />);
        await user.click(screen.getByText('Analyze'));

        await waitFor(() => {
            expect(mockCreateAIProvider).toHaveBeenCalledWith({
                provider: 'openai',
                apiKey: '',
                model: 'gpt-4o-mini',
                useProxy: true,
                authToken: 'google-tok',
            });
        });
    });

    it('Analyze creates provider with direct config when API key is set', async () => {
        useSettingsStore.setState({ apiKey: 'sk-test', provider: 'anthropic', model: 'claude-sonnet-4-6' });
        mockCreateAIProvider.mockReturnValue(createStreamingProvider(['done']));

        const user = userEvent.setup();
        render(<AccessibilityResult violations={[mockViolations[0]]} />);
        await user.click(screen.getByText('Analyze'));

        await waitFor(() => {
            expect(mockCreateAIProvider).toHaveBeenCalledWith({
                provider: 'anthropic',
                apiKey: 'sk-test',
                model: 'claude-sonnet-4-6',
                useProxy: false,
                authToken: undefined,
            });
        });
    });

    it('Analyze shows error when no key and no token', async () => {
        useSettingsStore.setState({ apiKey: '' });
        useAuthStore.setState({ token: null });

        const user = userEvent.setup();
        render(<AccessibilityResult violations={[mockViolations[0]]} />);
        await user.click(screen.getByText('Analyze'));

        await waitFor(() => {
            expect(screen.getByText(/Sign in with Google or add an API key/)).toBeInTheDocument();
        });
        expect(mockCreateAIProvider).not.toHaveBeenCalled();
    });

    it('Analyze sets explanation in store after streaming', async () => {
        useSettingsStore.setState({ apiKey: 'sk-test' });
        mockCreateAIProvider.mockReturnValue(createStreamingProvider(['Fix the', ' alt text']));

        const user = userEvent.setup();
        render(<AccessibilityResult violations={[mockViolations[0]]} />);
        await user.click(screen.getByText('Analyze'));

        await waitFor(() => {
            expect(useAccessibilityStore.getState().explanations['image-alt']).toBe('Fix the alt text');
        });
    });

    it('Analyze shows "Analyzing..." during streaming', async () => {
        useSettingsStore.setState({ apiKey: 'sk-test' });
        // Use a provider that never resolves to keep the loading state
        let resolveStream!: () => void;
        const hangingProvider = {
            async *stream() {
                yield 'partial';
                await new Promise<void>((r) => { resolveStream = r; });
            },
        };
        mockCreateAIProvider.mockReturnValue(hangingProvider);

        const user = userEvent.setup();
        render(<AccessibilityResult violations={[mockViolations[0]]} />);
        await user.click(screen.getByText('Analyze'));

        await waitFor(() => {
            expect(screen.getByText('Analyzing...')).toBeInTheDocument();
        });

        // Resolve to clean up
        resolveStream();
    });

    it('Analyze calls signOut on 401 in proxy mode', async () => {
        const mockSignOut = vi.fn();
        useSettingsStore.setState({ apiKey: '' });
        useAuthStore.setState({ token: 'tok', signOut: mockSignOut, refreshUsage: vi.fn() });
        mockCreateAIProvider.mockReturnValue(createErrorProvider(401, 'Unauthorized'));

        const user = userEvent.setup();
        render(<AccessibilityResult violations={[mockViolations[0]]} />);
        await user.click(screen.getByText('Analyze'));

        await waitFor(() => {
            expect(mockSignOut).toHaveBeenCalled();
        });
    });

    it('Analyze calls refreshUsage after proxy success', async () => {
        const mockRefreshUsage = vi.fn();
        useSettingsStore.setState({ apiKey: '' });
        useAuthStore.setState({ token: 'tok', signOut: vi.fn(), refreshUsage: mockRefreshUsage });
        mockCreateAIProvider.mockReturnValue(createStreamingProvider(['done']));

        const user = userEvent.setup();
        render(<AccessibilityResult violations={[mockViolations[0]]} />);
        await user.click(screen.getByText('Analyze'));

        await waitFor(() => {
            expect(mockRefreshUsage).toHaveBeenCalled();
        });
    });

    it('Analyze shows error on provider failure', async () => {
        useSettingsStore.setState({ apiKey: 'sk-test' });
        mockCreateAIProvider.mockReturnValue(createErrorProvider(500, 'Server error'));

        const user = userEvent.setup();
        render(<AccessibilityResult violations={[mockViolations[0]]} />);
        await user.click(screen.getByText('Analyze'));

        await waitFor(() => {
            expect(screen.getByText('AI provider error (500)')).toBeInTheDocument();
        });
    });
});
