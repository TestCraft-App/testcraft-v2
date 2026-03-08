import { createGenerationStore } from './generation-store-factory';

export const useIdeasStore = createGenerationStore({ withSelectedIdeas: true });
