import { groupByImpact, impactLabels, type A11yViolation } from '../lib/accessibility';
import { buildAccessibilityPrompt, ACCESSIBILITY_SYSTEM_MESSAGE } from '../lib/prompt-builder';
import { createAIProvider, AIProviderError } from '../lib/ai-provider';
import { FREE_TIER_MODEL } from '../lib/constants';
import { useSettingsStore } from '../stores/settings-store';
import { useAuthStore, canGenerate, isFreeTier } from '../stores/auth-store';
import { useAccessibilityStore } from '../stores/accessibility-store';

interface AccessibilityResultProps {
    violations: A11yViolation[];
}

export function AccessibilityResult({ violations }: AccessibilityResultProps) {
    const grouped = groupByImpact(violations);
    const impactOrder = ['critical', 'serious', 'moderate', 'minor'] as const;

    if (violations.length === 0) {
        return (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
                No accessibility violations found. Page passes all axe-core checks.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {violations.length} accessibility violation{violations.length !== 1 ? 's' : ''}
            </h3>

            {impactOrder.map((impact) => {
                const items = grouped[impact];
                if (items.length === 0) return null;
                const { label, color } = impactLabels[impact];

                return (
                    <div key={impact}>
                        <h4 className={`mb-1 rounded border px-2 py-0.5 text-xs font-semibold ${color}`}>
                            {label} ({items.length})
                        </h4>
                        <ul className="space-y-2">
                            {items.map((v) => (
                                <ViolationItem key={v.id} violation={v} />
                            ))}
                        </ul>
                    </div>
                );
            })}
        </div>
    );
}

function ViolationItem({ violation }: { violation: A11yViolation }) {
    const settings = useSettingsStore();
    const token = useAuthStore((s) => s.token);
    const signOut = useAuthStore((s) => s.signOut);
    const refreshUsage = useAuthStore((s) => s.refreshUsage);
    const {
        explanations, analyzing, analyzeErrors, collapsed,
        setExplanation, setAnalyzing, setAnalyzeError, setCollapsed,
    } = useAccessibilityStore();

    const explanation = explanations[violation.id] ?? null;
    const isLoading = analyzing[violation.id] ?? false;
    const error = analyzeErrors[violation.id] ?? null;
    const isCollapsed = collapsed[violation.id] ?? true;

    const elementHtml = violation.nodes[0]?.html ?? '';

    const handleAnalyze = async () => {
        if (!canGenerate(settings.apiKey, token)) {
            setAnalyzeError(violation.id, 'Sign in with Google or add an API key in Settings to generate.');
            return;
        }

        setAnalyzing(violation.id, true);
        setAnalyzeError(violation.id, null);
        setCollapsed(violation.id, false);

        const prompt = buildAccessibilityPrompt(
            `${violation.help}: ${violation.description}`,
            elementHtml,
            settings.promptContexts.a11y,
        );

        const useProxy = isFreeTier(settings.apiKey, token);

        try {
            const provider = createAIProvider({
                provider: settings.apiKey ? settings.provider : 'openai',
                apiKey: settings.apiKey,
                model: useProxy ? FREE_TIER_MODEL : settings.model,
                useProxy,
                authToken: useProxy ? (token ?? undefined) : undefined,
            });

            let result = '';
            for await (const chunk of provider.stream(prompt, ACCESSIBILITY_SYSTEM_MESSAGE)) {
                result += chunk;
            }
            setExplanation(violation.id, result);

            if (useProxy) {
                refreshUsage();
            }
        } catch (err) {
            if (err instanceof AIProviderError && err.status === 401 && useProxy) {
                signOut();
            }
            const message = err instanceof Error ? err.message : 'Failed to generate analysis.';
            setAnalyzeError(violation.id, message);
        } finally {
            setAnalyzing(violation.id, false);
        }
    };

    return (
        <li className="rounded border border-gray-200 p-2 text-sm dark:border-gray-600">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="font-medium text-gray-800 dark:text-gray-200">{violation.help}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{violation.description}</p>
                    {violation.wcagTags.length > 0 && (
                        <div className="mt-1 flex gap-1">
                            {violation.wcagTags.map((tag) => (
                                <span key={tag} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                {!explanation && (
                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading}
                        className="shrink-0 rounded bg-indigo-50 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 dark:bg-indigo-950 dark:text-indigo-400 dark:hover:bg-indigo-900"
                    >
                        {isLoading ? 'Analyzing...' : 'Analyze'}
                    </button>
                )}
            </div>

            {error && !explanation && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
            )}

            {explanation && (
                <div className="mt-2">
                    <button
                        onClick={() => setCollapsed(violation.id, !isCollapsed)}
                        className="flex w-full items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                        <span className={`transition-transform ${isCollapsed ? '' : 'rotate-90'}`}>&#9654;</span>
                        {isCollapsed ? 'Show analysis' : 'Hide analysis'}
                    </button>
                    {!isCollapsed && (
                        <div className="mt-1 rounded bg-gray-50 p-2 text-xs text-gray-700 whitespace-pre-wrap dark:bg-gray-800 dark:text-gray-300">
                            {explanation}
                        </div>
                    )}
                </div>
            )}
        </li>
    );
}
