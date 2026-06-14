import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bulkCreateQuestions, fetchBulkQuestions } from "../api";
import { Question } from "../types";

export const useQuestions = (questionIds: string[], testId?: string) =>
  useQuery({
    queryKey: ["questions", testId, questionIds],
    queryFn: () => fetchBulkQuestions(questionIds),
    enabled: questionIds.length > 0,
  });

export const useBulkCreateQuestions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ testId, questions }: { testId: string; questions: Question[] }) =>
      bulkCreateQuestions(testId, questions),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tests", variables.testId] });
      queryClient.invalidateQueries({ queryKey: ["questions", variables.testId] });
    },
  });
};
