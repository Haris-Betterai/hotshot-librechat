import { useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { Constants } from 'librechat-data-provider';
import { usePinProductMutation } from '~/data-provider';
import store from '~/store';

/**
 * The product pinned to the open chat. On a chat that already exists the pin is saved
 * first, so the card never shows a pin the server doesn't have; on a new chat it rides
 * along with the first message.
 */
export default function usePinnedProduct(index = 0) {
  const [conversation, setConversation] = useRecoilState(store.conversationByIndex(index));
  const { mutateAsync, isLoading } = usePinProductMutation();
  const conversationId = conversation?.conversationId;

  const setPinnedProduct = useCallback(
    async (productUrl: string | null) => {
      if (conversationId && conversationId !== Constants.NEW_CONVO) {
        await mutateAsync({ conversationId, productUrl });
      }
      setConversation((prev) =>
        prev && prev.conversationId === conversationId ? { ...prev, productUrl } : prev,
      );
    },
    [conversationId, mutateAsync, setConversation],
  );

  return {
    productUrl: conversation?.productUrl ?? null,
    setPinnedProduct,
    isSaving: isLoading,
  };
}
