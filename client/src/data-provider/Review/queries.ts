import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataService, MutationKeys, QueryKeys } from 'librechat-data-provider';
import type {
  ReviewPage,
  LoggedQuestion,
  FeedbackReport,
  FeedbackReportInput,
} from 'librechat-data-provider';

const PAGE_SIZE = 50;

export function useLoggedQuestionsQuery(enabled: boolean) {
  return useInfiniteQuery<ReviewPage<LoggedQuestion>>({
    queryKey: [QueryKeys.reviewQuestions],
    queryFn: ({ pageParam }) =>
      dataService.listLoggedQuestions({
        cursor: pageParam as string | undefined,
        limit: PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
    refetchOnWindowFocus: false,
  });
}

export function useFeedbackReportsQuery(enabled: boolean) {
  return useInfiniteQuery<ReviewPage<FeedbackReport>>({
    queryKey: [QueryKeys.reviewFeedback],
    queryFn: ({ pageParam }) =>
      dataService.listFeedbackReports({
        cursor: pageParam as string | undefined,
        limit: PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled,
    refetchOnWindowFocus: false,
  });
}

export function useSubmitFeedbackReportMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [MutationKeys.submitFeedbackReport],
    mutationFn: (input: FeedbackReportInput) => dataService.submitFeedbackReport(input),
    onSuccess: () => queryClient.invalidateQueries([QueryKeys.reviewFeedback]),
  });
}
