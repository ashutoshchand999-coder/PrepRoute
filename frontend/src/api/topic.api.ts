import { axiosInstance, unwrap } from "./axios";
import { Topic, SubTopic, ApiEnvelope } from "../types";

export const getTopicsBySubject = async (subjectId: string): Promise<Topic[]> => {
  const { data } = await axiosInstance.get<ApiEnvelope<Topic[]> | Topic[]>(`/topics/subject/${subjectId}`);
  return unwrap(data);
};

export const getSubTopicsByTopics = async (topicIds: string[]): Promise<SubTopic[]> => {
  const { data } = await axiosInstance.post<ApiEnvelope<SubTopic[]> | SubTopic[]>("/sub-topics/multi-topics", { topicIds });
  return unwrap(data);
};

export const getAllTopics = async (): Promise<Topic[]> => {
  const { data } = await axiosInstance.get<ApiEnvelope<Topic[]> | Topic[]>(`/topics`);
  return unwrap(data);
};

export const getAllSubTopics = async (): Promise<SubTopic[]> => {
  const { data } = await axiosInstance.get<ApiEnvelope<SubTopic[]> | SubTopic[]>(`/sub-topics`);
  return unwrap(data);
};

