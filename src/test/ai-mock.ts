import type { AIProvider } from '../lib/ai-provider';

export function createStreamingProvider(chunks: string[]): AIProvider {
    return {
        async *stream() {
            for (const chunk of chunks) {
                yield chunk;
            }
        },
    };
}

export function createErrorProvider(status: number, body: string): AIProvider {
    // Import AIProviderError dynamically to avoid circular issues when the
    // module is mocked in tests.  We inline a minimal throw instead.
    return {
        async *stream() {
            const { AIProviderError } = await import('../lib/ai-provider');
            throw new AIProviderError(status, body);
        },
    };
}
