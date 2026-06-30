import type { FiltrosFiguritaState } from './useFiltrosFigurita';

/**
 * Bloque de filtros reutilizable (búsqueda por nombre + selección/equipo/categoría).
 * Controlado por el estado que provee {@link useFiltrosFigurita}.
 */
export default function FiltrosFigurita({ filtros }: { filtros: FiltrosFiguritaState }) {
  return (
    <>
      <div className="mb-6">
        <input
          type="text"
          aria-label="Buscar figurita"
          placeholder="Buscar figurita..."
          value={filtros.searchTerm}
          onChange={(e) => filtros.setSearchTerm(e.target.value)}
          className="w-full p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          aria-label="Selección"
          placeholder="Selección"
          value={filtros.filterSeleccion}
          onChange={(e) => filtros.setFilterSeleccion(e.target.value)}
          className="p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
        <input
          type="text"
          aria-label="Equipo"
          placeholder="Equipo"
          value={filtros.filterEquipo}
          onChange={(e) => filtros.setFilterEquipo(e.target.value)}
          className="p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
        <input
          type="text"
          aria-label="Categoria"
          placeholder="Categoria"
          value={filtros.filterCategoria}
          onChange={(e) => filtros.setFilterCategoria(e.target.value)}
          className="p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
      </div>
    </>
  );
}
