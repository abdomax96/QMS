import { useEffect, useState } from 'react';
import type { DocumentVariable } from '../types/variables';
import { variableService } from '../services/variableService';

interface ProductDocumentVariablesState {
  variables: DocumentVariable[];
  sourceDocumentId: string | null;
  isLoading: boolean;
}

export const useProductDocumentVariables = (productId?: string | null): ProductDocumentVariablesState => {
  const [variables, setVariables] = useState<DocumentVariable[]>([]);
  const [sourceDocumentId, setSourceDocumentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!productId) {
        setVariables([]);
        setSourceDocumentId(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const context = await variableService.getDocumentVariablesContextByProduct(productId);
        if (cancelled) return;

        setVariables(context.variables || []);
        setSourceDocumentId(context.sourceDocumentId || null);
      } catch (error) {
        if (cancelled) return;
        console.error('[useProductDocumentVariables] Failed to load variables:', error);
        setVariables([]);
        setSourceDocumentId(null);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  return { variables, sourceDocumentId, isLoading };
};
