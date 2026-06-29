import { AxiosError } from 'axios';

/** Extrae el mensaje de error del backend (Spring) de forma segura, sin `any`. */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
  }
  return fallback;
}
