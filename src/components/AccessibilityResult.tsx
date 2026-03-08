import { groupByImpact, impactLabels, type A11yViolation } from '../lib/accessibility';
import { buildAccessibilityPrompt, ACCESSIBILITY_SYSTEM_MESSAGE } from '../lib/prompt-builder';
import { createAIProvider } from '../lib/ai-provider';
import { useSettingsStore } from '../stores/settings-store';
import { useAccessibilityStore } from '../stores/accessibility-store';

interface AccessibilityResultProps {
    violations: A11yViolation[];
}

export function AccessibilityResult({ violations }: AccessibilityResultProps) {
    const grouped = groupByImpact(violations);
    const impactOrder = ['critical', 'serious', 'moderate', 'minor'] as const;

    if (violations.length === 0) {
        return (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                No accessibility violations found. Page passes all axe-core checks.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">
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
        setAnalyzing(violation.id, true);
        setAnalyzeError(violation.id, null);
        setCollapsed(violation.id, false);

        const prompt = buildAccessibilityPrompt(
            `${violation.help}: ${violation.description}`,
            elementHtml,
        );

        try {
            const provider = createAIProvider({
                provider: settings.provider,
                apiKey: settings.apiKey,
                model: settings.model,
                useProxy: settings.useProxy,
            });

            let result = '';
            for await (const chunk of provider.stream(prompt, ACCESSIBILITY_SYSTEM_MESSAGE)) {
                result += chunk;
            }
            setExplanation(violation.id, result);
        } catch {
            setAnalyzeError(violation.id, 'Failed to generate analysis. Check your AI provider settings.');
        } finally {
            setAnalyzing(violation.id, false);
        }
    };

    return (
        <li className="rounded border border-gray-200 p-2 text-sm">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="font-medium text-gray-800">{violation.help}</p>
                    <p className="text-xs text-gray-500">{violation.description}</p>
                    {violation.wcagTags.length > 0 && (
                        <div className="mt-1 flex gap-1">
                            {violation.wcagTags.map((tag) => (
                                <span key={tag} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
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
                        className="shrink-0 rounded bg-indigo-50 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-100 disabled:opacity-50"
                    >
                        {isLoading ? 'Analyzing...' : 'Analyze'}
                    </button>
                )}
            </div>

            {error && !explanation && (
                <p className="mt-1 text-xs text-red-600">{error}</p>
            )}

            {explanation && (
                <div className="mt-2">
                    <button
                        onClick={() => setCollapsed(violation.id, !isCollapsed)}
                        className="flex w-full items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                    >
                        <span className={`transition-transform ${isCollapsed ? '' : 'rotate-90'}`}>&#9654;</span>
                        {isCollapsed ? 'Show analysis' : 'Hide analysis'}
                    </button>
                    {!isCollapsed && (
                        <div className="mt-1 rounded bg-gray-50 p-2 text-xs text-gray-700 whitespace-pre-wrap">
                            {explanation}
                        </div>
                    )}
                </div>
            )}
        </li>
    );
}
