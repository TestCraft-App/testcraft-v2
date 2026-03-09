import { API_V2_URL } from './constants';

export type AIProviderType = 'openai' | 'anthropic' | 'google';
export type Framework = 'playwright' | 'cypress' | 'selenium';
export type Language = 'javascript' | 'typescript' | 'java' | 'csharp' | 'python';

export interface AIProviderConfig {
    provider: AIProviderType;
    apiKey: string;
    model: string;
    useProxy?: boolean;
    authToken?: string;
}

export interface AIProvider {
    stream(prompt: string, systemMessage: string): AsyncIterable<string>;
}

export const PROVIDER_MODELS: Record<AIProviderType, string[]> = {
    openai: ['gpt-5.4', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4.1', 'gpt-4o', 'gpt-4o-mini', 'o4-mini'],
    anthropic: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
    google: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
};

export const DEFAULT_MODELS: Record<AIProviderType, string> = {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-haiku-4-5-20251001',
    google: 'gemini-2.5-flash',
};

export const FRAMEWORK_LANGUAGES: Record<Framework, Language[]> = {
    playwright: ['javascript', 'typescript', 'java', 'csharp', 'python'],
    cypress: ['javascript', 'typescript'],
    selenium: ['javascript', 'typescript', 'java', 'csharp', 'python'],
};

const PROVIDER_ENDPOINTS: Record<AIProviderType, string> = {
    openai: 'https://api.openai.com/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages',
    google: 'https://generativelanguage.googleapis.com/v1beta/models',
};

export async function validateApiKey(provider: AIProviderType, apiKey: string): Promise<boolean> {
    if (!apiKey) return false;

    try {
        let response: Response;
        switch (provider) {
            case 'openai':
                response = await fetch('https://api.openai.com/v1/models', {
                    headers: { Authorization: `Bearer ${apiKey}` },
                });
                break;
            case 'anthropic':
                response = await fetch('https://api.anthropic.com/v1/models', {
                    headers: {
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'anthropic-dangerous-direct-browser-access': 'true',
                    },
                });
                break;
            case 'google':
                response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
                );
                break;
        }
        return response.ok;
    } catch {
        return false;
    }
}

export function createAIProvider(config: AIProviderConfig): AIProvider {
    const { provider, apiKey, model, useProxy, authToken } = config;

    if (useProxy && authToken) {
        return createProxyProvider(model, authToken);
    }

    switch (provider) {
        case 'openai':
            return createOpenAIProvider(apiKey, model);
        case 'anthropic':
            return createAnthropicProvider(apiKey, model);
        case 'google':
            return createGoogleProvider(apiKey, model);
    }
}

function createOpenAIProvider(apiKey: string, model: string): AIProvider {
    return {
        async *stream(prompt: string, systemMessage: string) {
            const response = await fetch(PROVIDER_ENDPOINTS.openai, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    stream: true,
                    messages: [
                        { role: 'system', content: systemMessage },
                        { role: 'user', content: prompt },
                    ],
                }),
            });

            if (!response.ok) {
                throw new AIProviderError(response.status, await response.text());
            }

            yield* parseSSEStream(response, (data) => {
                if (data === '[DONE]') return null;
                const parsed = JSON.parse(data);
                return parsed.choices?.[0]?.delta?.content ?? null;
            });
        },
    };
}

function createAnthropicProvider(apiKey: string, model: string): AIProvider {
    return {
        async *stream(prompt: string, systemMessage: string) {
            const response = await fetch(PROVIDER_ENDPOINTS.anthropic, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true',
                },
                body: JSON.stringify({
                    model,
                    max_tokens: 4096,
                    stream: true,
                    system: systemMessage,
                    messages: [{ role: 'user', content: prompt }],
                }),
            });

            if (!response.ok) {
                throw new AIProviderError(response.status, await response.text());
            }

            yield* parseSSEStream(response, (data) => {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta') {
                    return parsed.delta?.text ?? null;
                }
                return null;
            });
        },
    };
}

function createGoogleProvider(apiKey: string, model: string): AIProvider {
    return {
        async *stream(prompt: string, systemMessage: string) {
            const url = `${PROVIDER_ENDPOINTS.google}/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemMessage }] },
                    contents: [{ parts: [{ text: prompt }] }],
                }),
            });

            if (!response.ok) {
                throw new AIProviderError(response.status, await response.text());
            }

            yield* parseSSEStream(response, (data) => {
                const parsed = JSON.parse(data);
                return parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
            });
        },
    };
}

function createProxyProvider(model: string, authToken: string): AIProvider {
    return {
        async *stream(prompt: string, systemMessage: string) {
            const response = await fetch(`${API_V2_URL}/api/v2/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    prompt,
                    systemMessage,
                    model,
                }),
            });

            if (!response.ok) {
                throw new AIProviderError(response.status, await response.text());
            }

            yield* parseSSEStream(response, (data) => {
                if (data === '[DONE]') return null;
                const parsed = JSON.parse(data);
                return parsed.choices?.[0]?.delta?.content ?? null;
            });
        },
    };
}

async function* parseSSEStream(
    response: Response,
    extractContent: (data: string) => string | null,
): AsyncIterable<string> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const data = trimmed.slice(6);
            try {
                const content = extractContent(data);
                if (content) yield content;
            } catch {
                // skip unparseable chunks
            }
        }
    }

    // Process remaining buffer
    if (buffer.trim().startsWith('data: ')) {
        const data = buffer.trim().slice(6);
        try {
            const content = extractContent(data);
            if (content) yield content;
        } catch {
            // skip
        }
    }
}

export class AIProviderError extends Error {
    constructor(
        public status: number,
        public body: string,
    ) {
        let message: string;
        if (status === 401) {
            message = 'Invalid API key or expired session. Please check your settings.';
        } else if (status === 429) {
            // Try to parse a custom message from the body (e.g. daily limit from proxy)
            let parsed: { error?: string } | null = null;
            try { parsed = JSON.parse(body); } catch { /* ignore */ }
            message = parsed?.error ?? 'Rate limit exceeded. Please wait and try again.';
        } else {
            message = `AI provider error (${status})`;
        }
        super(message);
        this.name = 'AIProviderError';
    }
}
