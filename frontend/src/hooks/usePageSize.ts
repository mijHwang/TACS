import { useCallback, useState } from 'react';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../services/api';

const STORAGE_KEY = 'tacs.pageSize';
const OPTIONS: number[] = [...PAGE_SIZE_OPTIONS];

function readStoredPageSize(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = raw == null ? NaN : Number(raw);
    return OPTIONS.includes(n) ? n : DEFAULT_PAGE_SIZE;
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
}

/**
 * Preferencia GLOBAL de cantidad por página, persistida en localStorage ('tacs.pageSize').
 * Default 10. Valida contra PAGE_SIZE_OPTIONS; un valor inválido cae al default.
 * Como las rutas montan de a una, cada página relee la preferencia al montar.
 */
export function usePageSize() {
  const [pageSize, setPageSizeState] = useState<number>(readStoredPageSize);

  const setPageSize = useCallback((n: number) => {
    const next = OPTIONS.includes(n) ? n : DEFAULT_PAGE_SIZE;
    setPageSizeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* localStorage no disponible: la preferencia vale sólo para esta sesión */
    }
  }, []);

  return { pageSize, setPageSize, options: OPTIONS };
}
