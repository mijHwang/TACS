import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useCatalogoFiguritas } from '../../hooks/useCatalogoFiguritas';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import Paginador from '../../components/Paginador';

/**
 * Buscar (catálogo): figuritas de OTROS usuarios para pedir en una propuesta.
 * Paginado y filtrado 100% server-side (el backend agrupa por base y excluye las propias
 * vía `usuarioId`). Al cambiar cualquier filtro se vuelve a la página 0.
 */
export default function BuscarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterNumero, setFilterNumero] = useState('');
  const [filterSeleccion, setFilterSeleccion] = useState('');
  const [filterEquipo, setFilterEquipo] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [page, setPage] = useState(0);
  const filterByBaseId = location.state?.filterByBaseId as string | undefined;

  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  // Cualquier cambio de filtro reinicia a la página 0.
  const onFilter = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setPage(0);
  };

  const numeroParsed = filterNumero.trim() === '' ? undefined : Number(filterNumero);
  const { data, isLoading } = useCatalogoFiguritas({
    page,
    usuarioId: user?.id,
    figuritaBaseId: filterByBaseId,
    search: debouncedSearch.trim() || undefined,
    numero: Number.isNaN(numeroParsed) ? undefined : numeroParsed,
    seleccion: filterSeleccion.trim() || undefined,
    equipo: filterEquipo.trim() || undefined,
    categoria: filterCategoria.trim() || undefined,
  });
  const figuritas = data?.content ?? [];

  return (
    <div className="page-enter">
      <h1 className="text-3xl font-bold text-text mb-6">Buscar</h1>

      <div className="mb-6">
        <input
          type="text"
          aria-label="Buscar figurita"
          placeholder="Buscar figurita..."
          value={searchTerm}
          onChange={onFilter(setSearchTerm)}
          className="w-full p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <input
          type="text"
          aria-label="Número"
          placeholder="Número"
          value={filterNumero}
          onChange={onFilter(setFilterNumero)}
          className="p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
        <input
          type="text"
          aria-label="Selección"
          placeholder="Selección"
          value={filterSeleccion}
          onChange={onFilter(setFilterSeleccion)}
          className="p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
        <input
          type="text"
          aria-label="Equipo"
          placeholder="Equipo"
          value={filterEquipo}
          onChange={onFilter(setFilterEquipo)}
          className="p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
        <input
          type="text"
          aria-label="Categoria"
          placeholder="Categoria"
          value={filterCategoria}
          onChange={onFilter(setFilterCategoria)}
          className="p-3 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />
      </div>

      {isLoading ? (
        <p className="text-text">Cargando figuritas...</p>
      ) : figuritas.length === 0 ? (
        <p className="text-muted">No se encontraron figuritas.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {figuritas.map((figurita) => (
              <div key={figurita.id} className="bg-surface p-4 rounded-lg border border-border">
                <p className="text-sm font-bold text-text mb-2">{figurita.numero}</p>
                <p className="text-sm text-muted mb-2">{figurita.seleccionNombre}</p>
                <p className="text-xl font-bold text-primary mb-2">{figurita.jugadorNombre}</p>
                <p className="text-sm text-text mb-3">{figurita.equipoNombre}</p>
                <p className="text-xs text-muted mb-4">{figurita.categoriaNombre}</p>
                <p className="text-xs text-muted mb-2">De: {figurita.ownerName}</p>
                <button
                  onClick={() => navigate('/propuestas/nueva', { state: { figuritaSeleccionada: figurita } })}
                  className="w-full p-2 bg-primary text-text font-bold rounded-lg hover:opacity-90 transition-opacity">
                  Hacer Propuesta
                </button>
              </div>
            ))}
          </div>
          <Paginador page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
        </>
      )}
    </div>
  );
}
