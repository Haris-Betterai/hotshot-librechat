import { useQuery } from '@tanstack/react-query';
import { DynamicQueryKeys, dataService } from 'librechat-data-provider';
import type { TGenUiResult } from 'librechat-data-provider';

const POLL_MS = 1500;

/**
 * The generated UI for one assistant message. With `run`, the server decides (and builds) it
 * the first time; the query polls while the result is pending.
 */
export const useGenUiQuery = (params: {
  messageId: string;
  conversationId?: string | null;
  run: boolean;
  enabled: boolean;
}) =>
  useQuery<TGenUiResult>(
    DynamicQueryKeys.genUi(params.messageId),
    () =>
      dataService.getGenUi({
        messageId: params.messageId,
        conversationId: params.conversationId ?? undefined,
        run: params.run,
      }),
    {
      enabled: params.enabled,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
      refetchInterval: (data) => (data?.status === 'pending' ? POLL_MS : false),
    },
  );
