import { axiosInstance, unwrap } from "./axios";
import { Question, ApiEnvelope } from "../types";

export interface GetQuestionsResponse {
  data: Question[];
  total: number;
  page: number;
  limit: number;
}

export const getQuestions = async (params?: Record<string, any>): Promise<GetQuestionsResponse> => {
  const { data } = await axiosInstance.get<ApiEnvelope<GetQuestionsResponse> | GetQuestionsResponse>("/questions", { params });
  return unwrap(data);
};

export const getQuestionById = async (id: string): Promise<Question> => {
  const { data } = await axiosInstance.get<ApiEnvelope<Question> | Question>(`/questions/${id}`);
  return unwrap(data);
};

export const getQuestionUsage = async (id: string): Promise<{ tests: { id: string; name: string }[] }> => {
  const { data } = await axiosInstance.get<ApiEnvelope<{ tests: { id: string; name: string }[] }> | { tests: { id: string; name: string }[] }>(`/questions/${id}/usage`);
  return unwrap(data);
};

export const createQuestion = async (question: Partial<Question>): Promise<Question> => {
  const { data } = await axiosInstance.post<ApiEnvelope<Question> | Question>("/questions", question);
  return unwrap(data);
};

export const updateQuestion = async (id: string, question: Partial<Question>): Promise<Question> => {
  const { data } = await axiosInstance.put<ApiEnvelope<Question> | Question>(`/questions/${id}`, question);
  return unwrap(data);
};

export const deleteQuestion = async (id: string): Promise<{ success: boolean }> => {
  const { data } = await axiosInstance.delete<ApiEnvelope<{ success: boolean }> | { success: boolean }>(`/questions/${id}`);
  return unwrap(data);
};

export const bulkDeleteQuestions = async (ids: string[]): Promise<{ success: boolean; count: number }> => {
  const { data } = await axiosInstance.post<ApiEnvelope<{ success: boolean; count: number }> | { success: boolean; count: number }>("/questions/bulk-delete", { ids });
  return unwrap(data);
};

export const bulkAssignTopic = async (ids: string[], topicId: string, subTopicId?: string): Promise<{ success: boolean }> => {
  const { data } = await axiosInstance.post<ApiEnvelope<{ success: boolean }> | { success: boolean }>("/questions/bulk-assign-topic", { ids, topic_id: topicId, sub_topic_id: subTopicId });
  return unwrap(data);
};

export const bulkAssignDifficulty = async (ids: string[], difficulty: string): Promise<{ success: boolean }> => {
  const { data } = await axiosInstance.post<ApiEnvelope<{ success: boolean }> | { success: boolean }>("/questions/bulk-assign-difficulty", { ids, difficulty });
  return unwrap(data);
};

export const bulkCreateQuestions = async (testId: string, questions: Question[]): Promise<Question[]> => {
  const { data } = await axiosInstance.post<ApiEnvelope<Question[]> | Question[]>("/questions/bulk", {
    test_id: testId,
    questions,
  });
  return unwrap(data);
};

export const fetchBulkQuestions = async (questionIds: string[]): Promise<Question[]> => {
  const { data } = await axiosInstance.post<ApiEnvelope<Question[]> | Question[]>("/questions/fetchBulk", {
    question_ids: questionIds,
  });
  return unwrap(data);
};

export const bulkCreateQuestionBank = async (questions: Question[]): Promise<Question[]> => {
  const { data } = await axiosInstance.post<ApiEnvelope<Question[]> | Question[]>("/questions/bulk-create", {
    questions,
  });
  return unwrap(data);
};
