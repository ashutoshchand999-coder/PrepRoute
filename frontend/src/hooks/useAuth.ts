import { useMutation } from "@tanstack/react-query";
import { login } from "../api";
import { useAuth } from "../context/AuthContext";
import { LoginRequest } from "../types";

export const useLogin = () => {
  const { login: setAuth } = useAuth();

  return useMutation({
    mutationFn: (payload: LoginRequest) => login(payload),
    onSuccess: (auth) => setAuth(auth),
  });
};

