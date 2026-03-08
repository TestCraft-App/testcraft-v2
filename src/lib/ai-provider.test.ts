import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAIProvider, AIProviderError, PROVIDER_MODELS, DEFAULT_MODELS } from './ai-provider';

function createMockSSEResponse(chunks: string[], status = 200): Response {
    const encoder = new TextEncoder();
    const data = chunks.map((c) => `data: ${c}\n\n`).join('');
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode(data));
            controller.close();
        },
    });

    return {
        ok: status >= 200 && status < 300,
        status,
        body: stream,
        text: () => Promise.resolve(data),
    } as unknown as Response;
}

describe('createAIProvider', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('returns a provider with stream method for openai', () => {
        const provider = createAIProvider({ provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o' });
        expect(provider).toHaveProperty('stream');
        expect(typeof provider.stream).toBe('function');
    });

    it('returns a provider with stream method for anthropic', () => {
        const provider = createAIProvider({
            provider: 'anthropic',
            apiKey: 'sk-ant-test',
            model: 'claude-sonnet-4-20250514',
        });
        expect(provider).toHaveProperty('stream');
    });

    it('returns a provider with stream method for google', () => {
        const provider = createAIProvider({
            provider: 'google',
            apiKey: 'ai-test',
            model: 'gemini-2.5-flash',
        });
        expect(provider).toHaveProperty('stream');
    });

    describe('OpenAI provider', () => {
        it('builds correct request headers and body', async () => {
            const mockFetch = vi.fn().mockResolvedValue(
                createMockSSEResponse([
                    JSON.stringify({ choices: [{ delta: { content: 'Hello' } }] }),
                    '[DONE]',
                ]),
            );
            vi.stubGlobal('fetch', mockFetch);

            const provider = createAIProvider({ provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o' });
            const chunks: string[] = [];
            for await (const chunk of provider.stream('test prompt', 'system msg')) {
                chunks.push(chunk);
            }

            expect(mockFetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer sk-test',
                },
                body: expect.stringContaining('"model":"gpt-4o"'),
            });
            expect(chunks).toEqual(['Hello']);
        });

        it('throws AIProviderError on 401', async () => {
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: false,
                    status: 401,
                    text: () => Promise.resolve('Unauthorized'),
                }),
            );

            const provider = createAIProvider({ provider: 'openai', apiKey: 'bad-key', model: 'gpt-4o' });
            await expect(async () => {
                for await (const _ of provider.stream('test', 'sys')) {
                    // consume
                }
            }).rejects.toThrow(AIProviderError);
        });

        it('throws with rate limit message on 429', async () => {
            vi.stubGlobal(
                'fetch',
                vi.fn().mockResolvedValue({
                    ok: false,
                    status: 429,
                    text: () => Promise.resolve('Too many requests'),
                }),
            );

            const provider = createAIProvider({ provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o' });
            await expect(async () => {
                for await (const _ of provider.stream('test', 'sys')) {
                    // consume
                }
            }).rejects.toThrow('Rate limit exceeded');
        });
    });

    describe('Anthropic provider', () => {
        it('builds correct request headers', async () => {
            const mockFetch = vi.fn().mockResolvedValue(
                createMockSSEResponse([
                    JSON.stringify({ type: 'content_block_delta', delta: { text: 'Hi' } }),
                    JSON.stringify({ type: 'message_stop' }),
                ]),
            );
            vi.stubGlobal('fetch', mockFetch);

            const provider = createAIProvider({
                provider: 'anthropic',
                apiKey: 'sk-ant-test',
                model: 'claude-sonnet-4-20250514',
            });
            const chunks: string[] = [];
            for await (const chunk of provider.stream('test', 'sys')) {
                chunks.push(chunk);
            }

            expect(mockFetch).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: expect.objectContaining({
                    'x-api-key': 'sk-ant-test',
                    'anthropic-version': '2023-06-01',
                }),
                body: expect.any(String),
            });
            expect(chunks).toEqual(['Hi']);
        });
    });

    describe('Google provider', () => {
        it('builds correct URL with API key', async () => {
            const mockFetch = vi.fn().mockResolvedValue(
                createMockSSEResponse([
                    JSON.stringify({
                        candidates: [{ content: { parts: [{ text: 'Hey' }] } }],
                    }),
                ]),
            );
            vi.stubGlobal('fetch', mockFetch);

            const provider = createAIProvider({
                provider: 'google',
                apiKey: 'ai-test',
                model: 'gemini-2.5-flash',
            });
            const chunks: string[] = [];
            for await (const chunk of provider.stream('test', 'sys')) {
                chunks.push(chunk);
            }

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('gemini-2.5-flash:streamGenerateContent?alt=sse&key=ai-test'),
                expect.any(Object),
            );
            expect(chunks).toEqual(['Hey']);
        });
    });

    describe('SSE streaming', () => {
        it('handles multiple chunks in a single SSE stream', async () => {
            const mockFetch = vi.fn().mockResolvedValue(
                createMockSSEResponse([
                    JSON.stringify({ choices: [{ delta: { content: 'Hello' } }] }),
                    JSON.stringify({ choices: [{ delta: { content: ' world' } }] }),
                    '[DONE]',
                ]),
            );
            vi.stubGlobal('fetch', mockFetch);

            const provider = createAIProvider({ provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o' });
            const chunks: string[] = [];
            for await (const chunk of provider.stream('test', 'sys')) {
                chunks.push(chunk);
            }

            expect(chunks).toEqual(['Hello', ' world']);
        });

        it('skips empty delta content', async () => {
            const mockFetch = vi.fn().mockResolvedValue(
                createMockSSEResponse([
                    JSON.stringify({ choices: [{ delta: {} }] }),
                    JSON.stringify({ choices: [{ delta: { content: 'text' } }] }),
                    '[DONE]',
                ]),
            );
            vi.stubGlobal('fetch', mockFetch);

            const provider = createAIProvider({ provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o' });
            const chunks: string[] = [];
            for await (const chunk of provider.stream('test', 'sys')) {
                chunks.push(chunk);
            }

            expect(chunks).toEqual(['text']);
        });
    });
});

describe('PROVIDER_MODELS', () => {
    it('has models for all providers', () => {
        expect(PROVIDER_MODELS.openai.length).toBeGreaterThan(0);
        expect(PROVIDER_MODELS.anthropic.length).toBeGreaterThan(0);
        expect(PROVIDER_MODELS.google.length).toBeGreaterThan(0);
    });
});

describe('DEFAULT_MODELS', () => {
    it('has a default model for each provider', () => {
        expect(DEFAULT_MODELS.openai).toBe('gpt-4.1');
        expect(DEFAULT_MODELS.anthropic).toBe('claude-sonnet-4-6');
        expect(DEFAULT_MODELS.google).toBe('gemini-2.5-flash');
    });
});
