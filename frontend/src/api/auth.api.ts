import { axiosInstance, unwrap } from "./axios";
import { AuthResponse, LoginRequest, ApiEnvelope } from "../types";

export const login = async (payload: LoginRequest): Promise<AuthResponse> => {
  const { data } = await axiosInstance.post<ApiEnvelope<AuthResponse>>("/auth/login", payload);
  return unwrap(data);
};
