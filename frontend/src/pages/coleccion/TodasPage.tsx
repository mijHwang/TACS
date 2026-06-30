import { useAuth } from '../../auth/useAuth';
import { useFiguritasPaginadas } from '../../hooks/useFiguritas';
import { useFiltrosServidor } from './components/useFiltrosServidor';
import FiltrosFigurita from './components/FiltrosFigurita';
import TarjetaColeccion from './components/TarjetaColeccion';
import GrillaFiguritas from './components/GrillaFiguritas';
import Paginador from '../../components/Paginador';

/** Vista "Todas": la colección del usuario, agrupada, paginada y filtrada server-side. */
export default function TodasPage() {
  const { user } = useAuth();
  const { filtros, page, setPage, params } = useFiltrosServidor();
  const { data, isLoading } = useFiguritasPaginadas(user?.username, params);
  const figuritas = data?.content ?? [];

  return (
    <>
      <FiltrosFigurita filtros={filtros} />
      {isLoading ? (
        <p className="text-text">Cargando figuritas...</p>
      ) : (
        <>
          <GrillaFiguritas isEmpty={figuritas.length === 0} emptyMessage="No tienes figuritas aún">
            {figuritas.map((f) => (
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
          <Paginador page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
        </>
      )}
    </>
  );
}
