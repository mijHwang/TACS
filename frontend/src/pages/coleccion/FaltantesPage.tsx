import { useAuth } from '../../auth/useAuth';
import { useNavigate } from 'react-router-dom';
import { useFaltantes } from '../../hooks/useFiguritas';
import Spinner from '../../components/Spinner';
import ErrorState from '../../components/ErrorState';
import { useFiltrosFigurita } from './components/useFiltrosFigurita';
import FiltrosFigurita from './components/FiltrosFigurita';
import TarjetaColeccion from './components/TarjetaColeccion';
import GrillaFiguritas from './components/GrillaFiguritas';

/** Vista "Mis faltantes": figuritas que el usuario no tiene. Click → /buscar para encontrarla. */
export default function ColeccionFaltantesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: faltantes = [], isLoading, isError, refetch } = useFaltantes(user?.username);
  const filtros = useFiltrosFigurita();

  if (isLoading) return <Spinner label="Cargando faltantes…" />;
  if (isError) return <ErrorState message="No se pudieron cargar tus faltantes." onRetry={() => refetch()} />;

  const visibles = filtros.filtrar(faltantes);

  return (
    <>
      <FiltrosFigurita filtros={filtros} />
      <GrillaFiguritas isEmpty={visibles.length === 0} emptyMessage="¡Tienes todas las figuritas!">
        {visibles.map((f) => (
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
    </>
  );
}
