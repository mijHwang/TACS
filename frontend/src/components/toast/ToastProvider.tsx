import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ToastContext, type ToastApi, type ToastKind } from './toast-types';

const GREEN = '#05B15A';
const RED = '#D82D31';
const BLUE = '#03BAE9';
const COLORS: Record<ToastKind, string> = { success: GREEN, error: RED, info: BLUE };
const AUTO_DISMISS_MS = 3500;

interface ToastItem { id: number; kind: ToastKind; message: string; }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = nextId.current++;
    setItems((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => remove(id), AUTO_DISMISS_MS);
  }, [remove]);

  const api = useMemo<ToastApi>(() => ({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed z-[100] bottom-4 right-4 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            aria-live={t.kind === 'error' ? 'assertive' : 'polite'}
            className="flex items-start gap-2 rounded-xl bg-surface border px-4 py-3 shadow-lg text-sm text-text animate-in fade-in slide-in-from-bottom-2"
            style={{ borderColor: `${COLORS[t.kind]}40`, borderLeft: `3px solid ${COLORS[t.kind]}` }}
          >
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              aria-label="Cerrar aviso"
              className="text-muted hover:text-text leading-none"
            >✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
