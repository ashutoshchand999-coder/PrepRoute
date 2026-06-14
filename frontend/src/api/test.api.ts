import { axiosInstance, unwrap } from "./axios";
import { Test, TestPayload, ApiEnvelope } from "../types";

export const getAllTests = async (): Promise<Test[]> => {
  const { data } = await axiosInstance.get<ApiEnvelope<Test[]> | Test[]>("/tests");
  return unwrap(data);
};

export const getTestById = async (id: string): Promise<Test> => {
  const { data } = await axiosInstance.get<ApiEnvelope<Test> | Test>(`/tests/${id}`);
  return unwrap(data);
};

export const createTest = async (payload: TestPayload): Promise<Test> => {
  const { data } = await axiosInstance.post<ApiEnvelope<Test> | Test>("/tests", payload);
  return unwrap(data);
};

export const updateTest = async (id: string, payload: Partial<TestPayload>): Promise<Test> => {
  const { data } = await axiosInstance.put<ApiEnvelope<Test> | Test>(`/tests/${id}`, payload);
  return unwrap(data);
};

export const deleteTest = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/tests/${id}`);
};

export const publishTest = async (id: string): Promise<Test> => {
  return updateTest(id, { status: "live" });
};
