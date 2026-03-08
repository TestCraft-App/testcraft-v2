import type { Result } from 'axe-core';

export interface A11yViolation {
    id: string;
    impact: 'critical' | 'serious' | 'moderate' | 'minor';
    description: string;
    help: string;
    helpUrl: string;
    wcagTags: string[];
    nodes: {
        html: string;
        failureSummary: string;
    }[];
}

export function mapAxeViolations(violations: Result[]): A11yViolation[] {
    return violations.map((v) => ({
        id: v.id,
        impact: (v.impact ?? 'minor') as A11yViolation['impact'],
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        wcagTags: v.tags.filter((t) => t.startsWith('wcag')),
        nodes: v.nodes.map((n) => ({
            html: n.html,
            failureSummary: n.failureSummary ?? '',
        })),
    }));
}

export function groupByImpact(violations: A11yViolation[]): Record<string, A11yViolation[]> {
    const groups: Record<string, A11yViolation[]> = {
        critical: [],
        serious: [],
        moderate: [],
        minor: [],
    };

    for (const v of violations) {
        groups[v.impact].push(v);
    }

    return groups;
}

export const impactLabels: Record<string, { label: string; color: string }> = {
    critical: { label: 'Critical', color: 'text-red-700 bg-red-50 border-red-200' },
    serious: { label: 'Serious', color: 'text-orange-700 bg-orange-50 border-orange-200' },
    moderate: { label: 'Moderate', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
    minor: { label: 'Minor', color: 'text-blue-700 bg-blue-50 border-blue-200' },
};
