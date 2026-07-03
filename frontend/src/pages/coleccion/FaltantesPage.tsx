import { useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useFaltantesPaginadas } from '../../hooks/useFiguritas';
import Spinner from '../../components/Spinner';
import ErrorState from '../../components/ErrorState';
import { useFiltrosServidor } from './components/useFiltrosServidor';
import TarjetaColeccion from './components/TarjetaColeccion';
import GrillaFiguritas from './components/GrillaFiguritas';
import Paginador from '../../components/Paginador';
import ListToolbar from '../../components/ListToolbar';
import PageSizeSelector from '../../components/PageSizeSelector';
import AgregarFiguritaModal from './components/AgregarFiguritaModal';

/** Vista "Mis faltantes": wishlist declarada por el usuario (las figuritas que marcó que le faltan). */
export default function ColeccionFaltantesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { page, setPage, params, pageSize, setPageSize, options } = useFiltrosServidor();
  const { data, isLoading, isError, refetch } = useFaltantesPaginadas(user?.username, params);
  const faltantes = data?.content ?? [];
  const [showAdd, setShowAdd] = useState(false);

  const handleRemove = async (baseId: string) => {
    if (!user) return;
    try {
      await api.delete(`/api/usuarios/${user.username}/faltantes/${baseId}`);
      await refetch();
    } catch {
      alert('No se pudo quitar de faltantes.');
    }
  };

  if (isError) return <ErrorState message="No se pudieron cargar tus faltantes." onRetry={() => refetch()} />;

  return (
    <>
      {isLoading ? (
        <Spinner label="Cargando faltantes…" />
      ) : (
        <>
          <ListToolbar total={data?.totalElements ?? 0}>
            <button
              onClick={() => setShowAdd(true)}
              className="px-3 py-1.5 rounded-md text-sm font-semibold bg-primary/15 text-primary border border-primary/40 hover:bg-primary/25 transition-colors"
            >
              + Agregar Figurita
            </button>
            <PageSizeSelector value={pageSize} options={options} onChange={(n) => setPageSize(n)} />
          </ListToolbar>
          <GrillaFiguritas isEmpty={faltantes.length === 0} emptyMessage="No marcaste faltantes todavía">
            {faltantes.map((f) => (
              <TarjetaColeccion
                key={f.id}
                seleccionNombre={f.seleccionNombre}
                jugadorNombre={f.jugadorNombre}
                equipoNombre={f.equipoNombre}
                categoriaNombre={f.categoriaNombre}
                imagenUrl={f.imagenUrl}
                onClick={() => navigate('/buscar', { state: { filterByBaseId: f.id, figuritaInfo: f } })}
                onRemove={() => handleRemove(f.id)}
                footer={<p className="text-xs text-muted">#{f.numero}</p>}
              />
            ))}
          </GrillaFiguritas>
          <Paginador page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
        </>
      )}
      {showAdd && (
        <AgregarFiguritaModal
          mode="faltante"
          onClose={() => setShowAdd(false)}
          onDone={() => refetch()}
        />
      )}
    </>
  );
}
