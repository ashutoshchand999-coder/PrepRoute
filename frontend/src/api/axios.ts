import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (
  typeof window !== "undefined" && window.location.port === "5173"
    ? "http://127.0.0.1:4000/api"
    : "/api"
);

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("preproute_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("preproute_token");
      localStorage.removeItem("preproute_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export const collectErrorMessages = (value: unknown): string[] => {
  if (!value) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectErrorMessages);
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const directMessage = record.message ?? record.msg ?? record.error;
    if (typeof directMessage === "string") return [directMessage];
    return Object.values(record).flatMap(collectErrorMessages);
  }
  return [];
};

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as { message?: string; error?: string; errors?: unknown } | undefined;
    const details = collectErrorMessages(responseData?.errors).join(", ");
    if (details) return details;
    return responseData?.message ?? responseData?.error ?? "Something went wrong. Please try again.";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
};

export const unwrap = <T>(payload: any): T => {
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data as T;
  }
  return payload as T;
};

