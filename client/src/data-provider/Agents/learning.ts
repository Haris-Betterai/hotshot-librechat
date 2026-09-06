import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dataService, MutationKeys, QueryKeys } from 'librechat-data-provider';

export function useAgentLearning(agentId: string, enabled: boolean) {
  return useQuery([QueryKeys.agentLearning, agentId], () => dataService.getAgentLearning(agentId), {
    enabled: !!agentId && enabled,
    retry: false,
    refetchInterval: enabled ? 60_000 : false,
  });
}

export function useUpdateAgentLearning(agentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [MutationKeys.agentLearning, agentId],
    mutationFn: (action: 'enable' | 'disable' | 'review' | 'rollback') =>
      dataService.updateAgentLearning(agentId, action),
    onSuccess: (report) => {
      queryClient.setQueryData([QueryKeys.agentLearning, agentId], report);
    },
  });
}
