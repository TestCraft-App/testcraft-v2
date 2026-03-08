import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CodeResult } from './CodeResult';

describe('CodeResult', () => {
    it('renders code content', () => {
        render(<CodeResult content="const x = 1;" isStreaming={false} />);
        expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    });

    it('strips code fences from content', () => {
        render(<CodeResult content={'```typescript\nconst x = 1;\n```'} isStreaming={false} />);
        expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    });

    it('renders Generated Code heading', () => {
        render(<CodeResult content="code" isStreaming={false} />);
        expect(screen.getByText('Generated Code')).toBeInTheDocument();
    });

    it('copies code to clipboard', async () => {
        const user = userEvent.setup();
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            writable: true,
            configurable: true,
        });

        render(<CodeResult content="const x = 1;" isStreaming={false} />);
        await user.click(screen.getByText('Copy'));
        expect(writeText).toHaveBeenCalledWith('const x = 1;');
    });

    it('shows streaming indicator', () => {
        render(<CodeResult content="partial" isStreaming={true} />);
        expect(screen.getByText('Streaming...')).toBeInTheDocument();
    });
});
