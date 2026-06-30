import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api, { type PagedResponse } from '../../services/api';
import { useAuth } from '../../auth/useAuth';
import Paginador from '../../components/Paginador';
import ListToolbar from '../../components/ListToolbar';
import PageSizeSelector from '../../components/PageSizeSelector';
import { usePageSize } from '../../hooks/usePageSize';

interface PublicacionResponseDTO {
  id: string;
  figuritaBaseId: string;
  figuritaNumero: number;
  figuritaJugadorNombre: string;
  figuritaSeleccionNombre: string;
  figuritaEquipoNombre: string;
  figuritaCategoriaNombre: string;
  figuritaIds: string[];
  cantidad: number;
  usuarioId: string;
  usuarioUsername: string;
  fechaPublicacion: string;
  estado: string;
}

/**
 * Buscar (intercambios): figuritas que OTROS usuarios publicaron como disponibles para
 * intercambio (US1 → US3 → US5). Datos vía `/api/publicaciones/disponibles/{userId}`,
 * paginado server-side (el backend ya excluye las publicaciones propias). Los filtros de
 * texto se aplican sobre la página cargada.
 */
export default function BuscarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNumero, setFilterNumero] = useState('');
  const [filterSeleccion, setFilterSeleccion] = useState('');
  const [filterEquipo, setFilterEquipo] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');

  const { pageSize, setPageSize, options } = usePageSize();
  const { data, isLoading } = useQuery({
    queryKey: ['publicaciones', 'disponibles', user?.id, page, pageSize],
    queryFn: async (): Promise<PagedResponse<PublicacionResponseDTO>> =>
      (await api.get(`/api/publicaciones/disponibles/${user!.id}`, { params: { page, size: pageSize } })).data,
    enabled: !!user?.id,
    placeholderData: keepPreviousData,
  });

  const publicaciones = data?.content ?? [];

  const safeLower = (value: string | null | undefined): string => value?.toLowerCase() || '';

  // Filtro de texto sobre la página cargada (la paginación es server-side).
  const filtered = publicaciones.filter((pub) => {
    const matchesSearch = safeLower(pub.figuritaJugadorNombre).includes(safeLower(searchTerm));
    const matchesNumero = filterNumero === '' || pub.figuritaNumero.toString().includes(filterNumero);
    const matchesSeleccion = filterSeleccion === '' || safeLower(pub.figuritaSeleccionNombre).includes(safeLower(filterSeleccion));
    const matchesEquipo = filterEquipo === '' || safeLower(pub.figuritaEquipoNombre).includes(safeLower(filterEquipo));
    const matchesCategoria = filterCategoria === '' || safeLower(pub.figuritaCategoriaNombre).includes(safeLower(filterCategoria));
    return matchesSearch && matchesNumero && matchesSeleccion && matchesEquipo && matchesCategoria;
  });

  const handleProponer = (pub: PublicacionResponseDTO) => {
    const figuritaSeleccionada = {
      id: pub.figuritaIds[0] || '',
      ownerId: pub.usuarioId,
      jugadorNombre: pub.figuritaJugadorNombre,
      seleccionNombre: pub.figuritaSeleccionNombre,
      equipoNombre: pub.figuritaEquipoNombre,
      categoriaNombre: pub.figuritaCategoriaNombre,
      numero: pub.figuritaNumero,
      figuritaBaseId: pub.figuritaBaseId,
      count: pub.cantidad,
      ownerName: pub.usuarioUsername,
    };
    navigate('/propuestas/nueva', { state: { figuritaSeleccionada } });
  };

  return (
    <div className="page-enter">
      <h1 className="text-3xl font-bold text-text mb-6">Buscar Intercambios</h1>

      <div className="mb-6">
        <input
          type="text"
          aria-label="Buscar figurita"
          placeholder="Buscar figurita..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <input
          type="text"
          aria-label="Número"
          placeholder="Número"
          value={filterNumero}
          onChange={(e) => setFilterNumero(e.target.value)}
          className="p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
        <input
          type="text"
          aria-label="Selección"
          placeholder="Selección"
          value={filterSeleccion}
          onChange={(e) => setFilterSeleccion(e.target.value)}
          className="p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
        <input
          type="text"
          aria-label="Equipo"
          placeholder="Equipo"
          value={filterEquipo}
          onChange={(e) => setFilterEquipo(e.target.value)}
          className="p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
        <input
          type="text"
          aria-label="Categoría"
          placeholder="Categoría"
          value={filterCategoria}
          onChange={(e) => setFilterCategoria(e.target.value)}
          className="p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
      </div>

      <ListToolbar total={data?.totalElements ?? 0}>
        <PageSizeSelector value={pageSize} options={options} onChange={(n) => { setPageSize(n); setPage(0); }} />
      </ListToolbar>
      {isLoading ? (
        <p className="text-text">Cargando figuritas publicadas...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted">No se encontraron figuritas disponibles.</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((pub) => (
            <div key={pub.id} className="bg-surface p-4 rounded-lg border border-border">
              <p className="text-sm font-bold text-text mb-2">{pub.figuritaNumero}</p>
              <p className="text-sm text-muted mb-2">{pub.figuritaSeleccionNombre || 'Sin selección'}</p>
              <p className="text-xl font-bold text-primary mb-2">{pub.figuritaJugadorNombre || 'Sin nombre'}</p>
              <p className="text-sm text-text mb-3">{pub.figuritaEquipoNombre || 'Sin equipo'}</p>
              <p className="text-xs text-muted mb-4">{pub.figuritaCategoriaNombre || 'Sin categoría'}</p>
              <p className="text-xs text-muted mb-2">
                Cantidad disponible: <span className="font-semibold text-text">{pub.cantidad}</span>
              </p>
              <p className="text-xs text-muted mb-2">De: @{pub.usuarioUsername || 'Usuario desconocido'}</p>
              <button
                onClick={() => handleProponer(pub)}
                className="w-full p-2 bg-primary text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
              >
                Hacer Propuesta
              </button>
            </div>
          ))}
        </div>
      )}
      {!isLoading && (
        <Paginador page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
      )}
    </div>
  );
}
