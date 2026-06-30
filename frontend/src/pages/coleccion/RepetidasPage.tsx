import { useAuth } from '../../auth/useAuth';
import { useRepetidasPaginadas } from '../../hooks/useFiguritas';
import Spinner from '../../components/Spinner';
import ErrorState from '../../components/ErrorState';
import { useFiltrosServidor } from './components/useFiltrosServidor';
import FiltrosFigurita from './components/FiltrosFigurita';
import TarjetaColeccion from './components/TarjetaColeccion';
import GrillaFiguritas from './components/GrillaFiguritas';
import Paginador from '../../components/Paginador';

/**
 * Vista "Mis repetidas": sólo figuritas con count>1, paginadas y filtradas server-side.
 * Muestra total y excedente (`x{count} ({count-1} repetidas)`). Solo lectura.
 */
export default function RepetidasPage() {
  const { user } = useAuth();
  const { filtros, page, setPage, params } = useFiltrosServidor();
  const { data, isLoading, isError, refetch } = useRepetidasPaginadas(user?.username, params);
  const repetidas = data?.content ?? [];

  if (isError) return <ErrorState message="No se pudieron cargar tus repetidas." onRetry={() => refetch()} />;

  return (
    <>
      <FiltrosFigurita filtros={filtros} />
      {isLoading ? (
        <Spinner label="Cargando repetidas…" />
      ) : (
        <>
          <GrillaFiguritas isEmpty={repetidas.length === 0} emptyMessage="No tenés figuritas repetidas">
            {repetidas.map((f) => (
              <TarjetaColeccion
                key={f.figuritaBaseId}
                seleccionNombre={f.seleccionNombre}
                jugadorNombre={f.jugadorNombre}
                equipoNombre={f.equipoNombre}
                categoriaNombre={f.categoriaNombre}
                imagenUrl={f.imagenUrl}
                footer={
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block px-2 py-1 bg-yellow-600 text-white text-xs font-bold rounded">
                      x{f.count}
                    </span>
                    <span className="text-xs text-muted">({f.count - 1} repetidas)</span>
                  </span>
                }
              />
            ))}
          </GrillaFiguritas>
          <Paginador page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
        </>
      )}
    </>
  );
}
