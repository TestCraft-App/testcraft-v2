import { create } from 'zustand';
import type { A11yViolation } from '../lib/accessibility';

export interface AccessibilityState {
    violations: A11yViolation[];
    explanations: Record<string, string>;
    analyzing: Record<string, boolean>;
    analyzeErrors: Record<string, string>;
    collapsed: Record<string, boolean>;
    isScanning: boolean;
    error: string | null;
    setViolations: (violations: A11yViolation[]) => void;
    setExplanation: (violationId: string, explanation: string) => void;
    setAnalyzing: (violationId: string, analyzing: boolean) => void;
    setAnalyzeError: (violationId: string, error: string | null) => void;
    setCollapsed: (violationId: string, collapsed: boolean) => void;
    setScanning: (scanning: boolean) => void;
    setError: (error: string | null) => void;
    reset: () => void;
}

export const useAccessibilityStore = create<AccessibilityState>((set, get) => ({
    violations: [],
    explanations: {},
    analyzing: {},
    analyzeErrors: {},
    collapsed: {},
    isScanning: false,
    error: null,

    setViolations: (violations) =>
        set({ violations, explanations: {}, analyzing: {}, analyzeErrors: {}, collapsed: {}, error: null }),
    setExplanation: (violationId, explanation) =>
        set({ explanations: { ...get().explanations, [violationId]: explanation } }),
    setAnalyzing: (violationId, analyzing) =>
        set({ analyzing: { ...get().analyzing, [violationId]: analyzing } }),
    setAnalyzeError: (violationId, error) => {
        const errors = { ...get().analyzeErrors };
        if (error) {
            errors[violationId] = error;
        } else {
            delete errors[violationId];
        }
        set({ analyzeErrors: errors });
    },
    setCollapsed: (violationId, collapsed) =>
        set({ collapsed: { ...get().collapsed, [violationId]: collapsed } }),
    setScanning: (scanning) => set({ isScanning: scanning }),
    setError: (error) => set({ error, isScanning: false }),
    reset: () =>
        set({ violations: [], explanations: {}, analyzing: {}, analyzeErrors: {}, collapsed: {}, isScanning: false, error: null }),
}));
