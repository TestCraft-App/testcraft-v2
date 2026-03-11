import { create } from 'zustand';
import type { DetectedFormField, TestDataSet } from '../lib/form-data';

export interface TestDataState {
    fields: DetectedFormField[];
    selectedSelectors: Set<string>;
    datasets: TestDataSet[];
    selectedDatasetId: string;
    isDetecting: boolean;
    isGenerating: boolean;
    isFilling: boolean;
    error: string | null;

    setFields: (fields: DetectedFormField[]) => void;
    toggleField: (selector: string) => void;
    selectAllFields: () => void;
    deselectAllFields: () => void;
    setDatasets: (datasets: TestDataSet[]) => void;
    setSelectedDatasetId: (id: string) => void;
    setDetecting: (detecting: boolean) => void;
    setGenerating: (generating: boolean) => void;
    setFilling: (filling: boolean) => void;
    setError: (error: string | null) => void;
    reset: () => void;
}

export const useTestDataStore = create<TestDataState>((set, get) => ({
    fields: [],
    selectedSelectors: new Set<string>(),
    datasets: [],
    selectedDatasetId: '',
    isDetecting: false,
    isGenerating: false,
    isFilling: false,
    error: null,

    setFields: (fields) => {
        const allSelectors = new Set(fields.map((f) => f.selector));
        set({ fields, selectedSelectors: allSelectors, datasets: [], selectedDatasetId: '', error: null });
    },
    toggleField: (selector) => {
        const selected = new Set(get().selectedSelectors);
        if (selected.has(selector)) {
            selected.delete(selector);
        } else {
            selected.add(selector);
        }
        set({ selectedSelectors: selected });
    },
    selectAllFields: () => {
        set({ selectedSelectors: new Set(get().fields.map((f) => f.selector)) });
    },
    deselectAllFields: () => {
        set({ selectedSelectors: new Set<string>() });
    },
    setDatasets: (datasets) => {
        set({ datasets, selectedDatasetId: datasets.length > 0 ? datasets[0].id : '' });
    },
    setSelectedDatasetId: (id) => set({ selectedDatasetId: id }),
    setDetecting: (detecting) => set({ isDetecting: detecting }),
    setGenerating: (generating) => set({ isGenerating: generating }),
    setFilling: (filling) => set({ isFilling: filling }),
    setError: (error) => set({ error }),
    reset: () =>
        set({
            fields: [],
            selectedSelectors: new Set<string>(),
            datasets: [],
            selectedDatasetId: '',
            isDetecting: false,
            isGenerating: false,
            isFilling: false,
            error: null,
        }),
}));
