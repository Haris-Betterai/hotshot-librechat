import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dataService, QueryKeys } from 'librechat-data-provider';
import type {
  TConversation,
  ProductCatalog,
  PinProductInput,
  PinProductResult,
} from 'librechat-data-provider';
import { updateConvoInAllQueries } from '~/utils';

const CATALOG_STALE_MS = 10 * 60 * 1000;

export function useProductCatalogQuery(enabled: boolean) {
  return useQuery<ProductCatalog>({
    queryKey: [QueryKeys.productCatalog],
    queryFn: () => dataService.getProductCatalog(),
    enabled,
    staleTime: CATALOG_STALE_MS,
    refetchOnWindowFocus: false,
  });
}

/** Saves a chat's pinned product (or clears it with `productUrl: null`) and updates cached copies. */
export function usePinProductMutation() {
  const queryClient = useQueryClient();
  return useMutation<PinProductResult, unknown, PinProductInput>({
    mutationFn: (input) => dataService.pinProduct(input),
    onSuccess: ({ conversationId, productUrl }) => {
      const withPin = (convo: TConversation): TConversation => ({ ...convo, productUrl });
      queryClient.setQueryData<TConversation>([QueryKeys.conversation, conversationId], (convo) =>
        convo ? withPin(convo) : convo,
      );
      updateConvoInAllQueries(queryClient, conversationId, withPin);
    },
  });
}
