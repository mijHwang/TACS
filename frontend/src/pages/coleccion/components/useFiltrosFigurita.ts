import { useState } from 'react';

export interface FiguritaFiltrable {
  jugadorNombre: string;
  seleccionNombre: string;
  equipoNombre: string;
  categoriaNombre: string;
}

/**
 * Hook compartido por las vistas de "Mi Colección" (Todas, Mis repetidas, Mis faltantes).
 * Mantiene el estado de los cuatro controles de filtro y expone `filtrar`, que aplica
 * el mismo predicado (búsqueda por jugador + filtros por selección/equipo/categoría)
 * a cualquier listado de items que cumpla {@link FiguritaFiltrable}.
 */
export function useFiltrosFigurita() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeleccion, setFilterSeleccion] = useState('');
  const [filterEquipo, setFilterEquipo] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');

  function filtrar<T extends FiguritaFiltrable>(items: T[]): T[] {
    const s = searchTerm.toLowerCase();
    const sel = filterSeleccion.toLowerCase();
    const eq = filterEquipo.toLowerCase();
    const cat = filterCategoria.toLowerCase();
    return items.filter((it) => {
      const matchesSearch = (it.jugadorNombre || '').toLowerCase().includes(s);
      const matchesSeleccion = sel === '' || (it.seleccionNombre || '').toLowerCase().includes(sel);
      const matchesEquipo = eq === '' || (it.equipoNombre || '').toLowerCase().includes(eq);
      const matchesCategoria = cat === '' || (it.categoriaNombre || '').toLowerCase().includes(cat);
      return matchesSearch && matchesSeleccion && matchesEquipo && matchesCategoria;
    });
  }

  return {
    searchTerm, setSearchTerm,
    filterSeleccion, setFilterSeleccion,
    filterEquipo, setFilterEquipo,
    filterCategoria, setFilterCategoria,
    filtrar,
  };
}

export type FiltrosFiguritaState = ReturnType<typeof useFiltrosFigurita>;
