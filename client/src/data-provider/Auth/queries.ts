import { useRecoilValue } from 'recoil';
import { useQuery } from '@tanstack/react-query';
import { QueryKeys, DynamicQueryKeys, dataService, request } from 'librechat-data-provider';
import type { QueryObserverResult, UseQueryOptions } from '@tanstack/react-query';
import type t from 'librechat-data-provider';
import store from '~/store';

export const useGetUserQuery = (
  config?: UseQueryOptions<t.TUser>,
): QueryObserverResult<t.TUser> => {
  const queriesEnabled = useRecoilValue<boolean>(store.queriesEnabled);
  return useQuery<t.TUser>([QueryKeys.user], () => dataService.getUser(), {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: false,
    ...config,
    enabled: (config?.enabled ?? true) === true && queriesEnabled,
  });
};

/**
 * Public config for the chat page mounted inside the embed iframe — no
 * `queriesEnabled` gate, since (unlike the rest of the app's queries) this
 * one must run before the guest/auth flow has had a chance to complete.
 */
export const useGetEmbedWidgetConfigQuery = (
  embedId: string | undefined,
  config?: UseQueryOptions<t.TEmbedWidgetConfig>,
): QueryObserverResult<t.TEmbedWidgetConfig> => {
  return useQuery<t.TEmbedWidgetConfig>(
    DynamicQueryKeys.embedWidgetConfig(embedId ?? ''),
    () => request.embedWidgetConfig(embedId as string),
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: false,
      ...config,
      enabled: (config?.enabled ?? true) === true && !!embedId,
    },
  );
};

export interface UseGraphTokenQueryOptions {
  scopes?: string;
  enabled?: boolean;
}

export const useGraphTokenQuery = (
  options: UseGraphTokenQueryOptions = {},
  config?: UseQueryOptions<any>,
): QueryObserverResult<any> => {
  const { scopes, enabled = false } = options;

  return useQuery({
    queryKey: [QueryKeys.graphToken, scopes],
    queryFn: () => dataService.getGraphApiToken({ scopes: scopes ?? '' }),
    enabled,
    staleTime: 50 * 60 * 1000, // 50 minutes (tokens expire in 60 minutes)
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    ...config,
  });
};
