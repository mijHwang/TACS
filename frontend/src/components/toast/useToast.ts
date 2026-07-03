import { useContext } from 'react';
import { ToastContext, type ToastApi } from './toast-types';

/** Acceso al sistema de toasts. Debe usarse dentro de <ToastProvider>. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
