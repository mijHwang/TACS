import { AxiosError } from 'axios';

/** Extrae el mensaje de error del backend (Spring ProblemDetail) de forma segura, sin `any`. */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { detail?: string; message?: string } | undefined;
    if (data?.detail) return data.detail;
    if (data?.message) return data.message;
  }
  return fallback;
}