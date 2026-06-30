import { useAuth } from '../../auth/useAuth';
import { useNavigate } from 'react-router-dom';
import { useFaltantesPaginadas } from '../../hooks/useFiguritas';
import Spinner from '../../components/Spinner';
import ErrorState from '../../components/ErrorState';
import { useFiltrosServidor } from './components/useFiltrosServidor';
import FiltrosFigurita from './components/FiltrosFigurita';
import TarjetaColeccion from './components/TarjetaColeccion';
import GrillaFiguritas from './components/GrillaFiguritas';
import Paginador from '../../components/Paginador';

/** Vista "Mis faltantes": figuritas que el usuario no tiene, paginadas y filtradas server-side. */
export default function ColeccionFaltantesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { filtros, page, setPage, params } = useFiltrosServidor();
  const { data, isLoading, isError, refetch } = useFaltantesPaginadas(user?.username, params);
  const faltantes = data?.content ?? [];

  if (isError) return <ErrorState message="No se pudieron cargar tus faltantes." onRetry={() => refetch()} />;

  return (
    <>
      <FiltrosFigurita filtros={filtros} />
      {isLoading ? (
        <Spinner label="Cargando faltantes…" />
      ) : (
        <>
          <GrillaFiguritas isEmpty={faltantes.length === 0} emptyMessage="¡Tienes todas las figuritas!">
            {faltantes.map((f) => (
              <TarjetaColeccion
                key={f.id}
                seleccionNombre={f.seleccionNombre}
                jugadorNombre={f.jugadorNombre}
                equipoNombre={f.equipoNombre}
                categoriaNombre={f.categoriaNombre}
                imagenUrl={f.imagenUrl}
                onClick={() => navigate('/buscar', { state: { filterByBaseId: f.id, figuritaInfo: f } })}
                footer={<p className="text-xs text-muted">#{f.numero}</p>}
              />
            ))}
          </GrillaFiguritas>
          <Paginador page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
        </>
      )}
    </>
  );
}
