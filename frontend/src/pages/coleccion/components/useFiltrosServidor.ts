import { useState, type Dispatch, type SetStateAction } from 'react';
import { useFiltrosFigurita, type FiltrosFiguritaState } from './useFiltrosFigurita';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import type { FiltrosColeccion } from '../../../hooks/useFiguritas';
import { usePageSize } from '../../../hooks/usePageSize';

export interface FiltrosServidor {
  /** Estado compatible con `<FiltrosFigurita>` (setters envueltos para resetear la página). */
  filtros: FiltrosFiguritaState;
  page: number;
  setPage: (p: number) => void;
  /** Filtros listos para los hooks paginados (search debounced, vacíos → undefined). */
  params: FiltrosColeccion;
  pageSize: number;
  setPageSize: (n: number) => void;
  options: number[];
}

/**
 * Filtros server-side para las vistas de colección: reusa la UI de {@link useFiltrosFigurita},
 * pero al cambiar cualquier filtro vuelve a la página 0 y debounce-a la búsqueda por nombre,
 * y arma los `params` que consumen los hooks paginados.
 */
export function useFiltrosServidor(): FiltrosServidor {
  const base = useFiltrosFigurita();
  const [page, setPage] = useState(0);
  const { pageSize, setPageSize: setPageSizeRaw, options } = usePageSize();
  const setPageSize = (n: number) => { setPageSizeRaw(n); setPage(0); };

  const wrap =
    (setter: Dispatch<SetStateAction<string>>) =>
    (v: SetStateAction<string>) => { setter(v); setPage(0); };

  const filtros: FiltrosFiguritaState = {
    ...base,
    setSearchTerm: wrap(base.setSearchTerm),
    setFilterSeleccion: wrap(base.setFilterSeleccion),
    setFilterEquipo: wrap(base.setFilterEquipo),
    setFilterCategoria: wrap(base.setFilterCategoria),
  };

  const debouncedSearch = useDebouncedValue(base.searchTerm, 300);
  const params: FiltrosColeccion = {
    page,
    size: pageSize,
    search: debouncedSearch.trim() || undefined,
    seleccion: base.filterSeleccion.trim() || undefined,
    equipo: base.filterEquipo.trim() || undefined,
    categoria: base.filterCategoria.trim() || undefined,
  };

  return { filtros, page, setPage, params, pageSize, setPageSize, options };
}
