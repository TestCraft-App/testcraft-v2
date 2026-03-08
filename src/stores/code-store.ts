import { createGenerationStore } from './generation-store-factory';

export const useCodeStore = createGenerationStore({ withSelectedIdeas: false });
