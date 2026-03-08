import { describe, it, expect } from 'vitest';
import { mapAxeViolations, groupByImpact } from './accessibility';
import type { Result } from 'axe-core';
import type { A11yViolation } from './accessibility';

const mockAxeViolation: Result = {
    id: 'image-alt',
    impact: 'critical',
    description: 'Ensures <img> elements have alternate text or a role of none or presentation',
    help: 'Images must have alternate text',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.7/image-alt',
    tags: ['wcag2a', 'wcag111', 'section508'],
    nodes: [
        {
            html: '<img src="photo.jpg">',
            failureSummary: 'Fix any of the following:\n  Element does not have an alt attribute',
            any: [],
            all: [],
            none: [],
            target: ['img'],
            impact: 'critical',
        },
    ],
};

const mockViolations: A11yViolation[] = [
    {
        id: 'image-alt',
        impact: 'critical',
        description: 'Images must have alternate text',
        help: 'Missing alt text',
        helpUrl: '',
        wcagTags: ['wcag2a'],
        nodes: [{ html: '<img src="photo.jpg">', failureSummary: 'No alt attribute' }],
    },
    {
        id: 'color-contrast',
        impact: 'serious',
        description: 'Color contrast must meet minimum ratio',
        help: 'Low contrast',
        helpUrl: '',
        wcagTags: ['wcag2aa'],
        nodes: [{ html: '<p>text</p>', failureSummary: 'Low contrast' }],
    },
    {
        id: 'label',
        impact: 'minor',
        description: 'Form elements must have labels',
        help: 'Missing label',
        helpUrl: '',
        wcagTags: ['wcag2a'],
        nodes: [{ html: '<input />', failureSummary: 'No label' }],
    },
];

describe('mapAxeViolations', () => {
    it('maps axe Result to A11yViolation', () => {
        const violations = mapAxeViolations([mockAxeViolation]);
        expect(violations).toHaveLength(1);
        expect(violations[0].id).toBe('image-alt');
        expect(violations[0].impact).toBe('critical');
        expect(violations[0].wcagTags).toContain('wcag2a');
        expect(violations[0].wcagTags).toContain('wcag111');
        expect(violations[0].nodes[0].html).toBe('<img src="photo.jpg">');
    });

    it('filters tags to only wcag-prefixed ones', () => {
        const violations = mapAxeViolations([mockAxeViolation]);
        expect(violations[0].wcagTags).not.toContain('section508');
    });

    it('handles empty violations array', () => {
        expect(mapAxeViolations([])).toEqual([]);
    });
});

describe('groupByImpact', () => {
    it('groups violations by impact level', () => {
        const grouped = groupByImpact(mockViolations);
        expect(grouped.critical).toHaveLength(1);
        expect(grouped.serious).toHaveLength(1);
        expect(grouped.moderate).toHaveLength(0);
        expect(grouped.minor).toHaveLength(1);
    });

    it('returns empty groups for no violations', () => {
        const grouped = groupByImpact([]);
        expect(grouped.critical).toHaveLength(0);
        expect(grouped.serious).toHaveLength(0);
    });
});
