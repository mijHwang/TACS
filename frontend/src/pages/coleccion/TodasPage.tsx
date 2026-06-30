import { useAuth } from '../../auth/useAuth';
import { useFiguritas } from '../../hooks/useFiguritas';
import { useFiltrosFigurita } from './components/useFiltrosFigurita';
import FiltrosFigurita from './components/FiltrosFigurita';
import TarjetaColeccion from './components/TarjetaColeccion';
import GrillaFiguritas from './components/GrillaFiguritas';

/** Vista "Todas": la colección completa del usuario, agrupada, con badge de cantidad. */
export default function TodasPage() {
  const { user } = useAuth();
  const { data: figuritas = [], isLoading } = useFiguritas(user?.username);
  const filtros = useFiltrosFigurita();

  if (isLoading) return <p className="text-text">Cargando figuritas...</p>;

  const visibles = filtros.filtrar(figuritas);

  return (
    <>
      <FiltrosFigurita filtros={filtros} />
      <GrillaFiguritas isEmpty={visibles.length === 0} emptyMessage="No tienes figuritas aún">
        {visibles.map((f) => (
          <TarjetaColeccion
            key={f.figuritaBaseId}
            seleccionNombre={f.seleccionNombre}
            jugadorNombre={f.jugadorNombre}
            equipoNombre={f.equipoNombre}
            categoriaNombre={f.categoriaNombre}
            imagenUrl={f.imagenUrl}
            footer={
              <span className="inline-block px-2 py-1 bg-yellow-600 text-white text-xs font-bold rounded">
                x{f.count}
              </span>
            }
          />
        ))}
      </GrillaFiguritas>
    </>
  );
}
