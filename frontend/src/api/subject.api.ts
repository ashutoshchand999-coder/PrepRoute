import { axiosInstance, unwrap } from "./axios";
import { Subject, ApiEnvelope } from "../types";

export const getSubjects = async (): Promise<Subject[]> => {
  const { data } = await axiosInstance.get<ApiEnvelope<Subject[]> | Subject[]>("/subjects");
  return unwrap(data);
};
