import { useAuth } from '../../auth/useAuth';
import { useFiguritasPaginadas } from '../../hooks/useFiguritas';
import { useFiltrosServidor } from './components/useFiltrosServidor';
import FiltrosFigurita from './components/FiltrosFigurita';
import TarjetaColeccion from './components/TarjetaColeccion';
import GrillaFiguritas from './components/GrillaFiguritas';
import Paginador from '../../components/Paginador';
import ListToolbar from '../../components/ListToolbar';
import PageSizeSelector from '../../components/PageSizeSelector';

/**
 * Vista "Todas": inventario completo del usuario, agrupado, paginado y filtrado server-side.
 * Es de **solo-lectura** y NO aparece en las tabs de Mi Colección; queda accesible por URL
 * directa (`/coleccion/todas`). Muestra todo lo que el usuario posee con badge `x{count}`,
 * incluidas las figuritas en cantidad 1 (que no salen en Repetidas ni Faltantes).
 * Las acciones (publicar/subastar/agregar) viven en `RepetidasPage`.
 */
export default function TodasPage() {
  const { user } = useAuth();
  const { filtros, page, setPage, params, pageSize, setPageSize, options } = useFiltrosServidor();
  const { data, isLoading } = useFiguritasPaginadas(user?.username, params);
  const figuritas = data?.content ?? [];

  return (
    <>
      <FiltrosFigurita filtros={filtros} />
      {isLoading ? (
        <p className="text-text">Cargando figuritas...</p>
      ) : (
        <>
          <ListToolbar total={data?.totalElements ?? 0}>
            <PageSizeSelector value={pageSize} options={options} onChange={(n) => setPageSize(n)} />
          </ListToolbar>
          <GrillaFiguritas isEmpty={figuritas.length === 0} emptyMessage="No tenés figuritas aún">
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
