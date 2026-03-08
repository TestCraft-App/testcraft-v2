import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CodeResult } from './CodeResult';

vi.mock('highlight.js/lib/core', () => {
    const highlightElement = vi.fn();
    return {
        default: {
            registerLanguage: vi.fn(),
            highlightElement,
        },
        highlightElement,
    };
});
vi.mock('highlight.js/lib/languages/javascript', () => ({ default: vi.fn() }));
vi.mock('highlight.js/lib/languages/typescript', () => ({ default: vi.fn() }));
vi.mock('highlight.js/lib/languages/java', () => ({ default: vi.fn() }));
vi.mock('highlight.js/lib/languages/csharp', () => ({ default: vi.fn() }));
vi.mock('highlight.js/lib/languages/python', () => ({ default: vi.fn() }));
vi.mock('highlight.js/styles/atom-one-dark.css', () => ({}));

describe('CodeResult', () => {
    it('renders code content', () => {
        render(<CodeResult content="const x = 1;" isStreaming={false} language="typescript" />);
        expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    });

    it('strips code fences from content', () => {
        render(
            <CodeResult
                content={'```typescript\nconst x = 1;\n```'}
                isStreaming={false}
                language="typescript"
            />,
        );
        expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    });

    it('renders Generated Code heading', () => {
        render(<CodeResult content="code" isStreaming={false} language="typescript" />);
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

        render(<CodeResult content="const x = 1;" isStreaming={false} language="typescript" />);
        await user.click(screen.getByText('Copy'));
        expect(writeText).toHaveBeenCalledWith('const x = 1;');
    });

    it('shows streaming indicator', () => {
        render(<CodeResult content="partial" isStreaming={true} language="typescript" />);
        expect(screen.getByText('Streaming...')).toBeInTheDocument();
    });

    it('sets language class on code element', () => {
        render(<CodeResult content="print('hi')" isStreaming={false} language="python" />);
        const codeEl = screen.getByText("print('hi')");
        expect(codeEl).toHaveClass('language-python');
    });

    it('calls highlightElement after render', async () => {
        const hljs = await import('highlight.js/lib/core');
        render(<CodeResult content="const x = 1;" isStreaming={false} language="javascript" />);
        expect(hljs.default.highlightElement).toHaveBeenCalled();
    });
});
