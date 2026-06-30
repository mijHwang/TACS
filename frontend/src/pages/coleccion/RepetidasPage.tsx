import { useAuth } from '../../auth/useAuth';
import { useRepetidas } from '../../hooks/useFiguritas';
import Spinner from '../../components/Spinner';
import ErrorState from '../../components/ErrorState';
import { useFiltrosFigurita } from './components/useFiltrosFigurita';
import FiltrosFigurita from './components/FiltrosFigurita';
import TarjetaColeccion from './components/TarjetaColeccion';
import GrillaFiguritas from './components/GrillaFiguritas';

/**
 * Vista "Mis repetidas": solo figuritas con count>1. Muestra total y excedente
 * (`x{count} ({count-1} repetidas)`). Solo lectura.
 */
export default function RepetidasPage() {
  const { user } = useAuth();
  const { data: repetidas = [], isLoading, isError, refetch } = useRepetidas(user?.username);
  const filtros = useFiltrosFigurita();

  if (isLoading) return <Spinner label="Cargando repetidas…" />;
  if (isError) return <ErrorState message="No se pudieron cargar tus repetidas." onRetry={() => refetch()} />;

  const visibles = filtros.filtrar(repetidas);

  return (
    <>
      <FiltrosFigurita filtros={filtros} />
      <GrillaFiguritas isEmpty={visibles.length === 0} emptyMessage="No tenés figuritas repetidas">
        {visibles.map((f) => (
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
    </>
  );
}
