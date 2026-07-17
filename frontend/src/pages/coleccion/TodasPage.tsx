import { useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useFiguritasPaginadas } from '../../hooks/useFiguritas';
import { useFiltrosServidor } from './components/useFiltrosServidor';
import FiltrosFigurita from './components/FiltrosFigurita';
import TarjetaColeccion from './components/TarjetaColeccion';
import GrillaFiguritas from './components/GrillaFiguritas';
import Paginador from '../../components/Paginador';
import ListToolbar from '../../components/ListToolbar';
import PageSizeSelector from '../../components/PageSizeSelector';
import api from '../../services/api';

const ESTADO_LABELS: Record<string, string> = {
  LIBRE: 'Libre',
  PUBLICADA: 'Publicada',
  EN_SUBASTA: 'En subasta',
  OFERTADA: 'Ofertada',
};

export default function TodasPage() {
  const { user } = useAuth();
  const { filtros, page, setPage, params, pageSize, setPageSize, options } = useFiltrosServidor();
  const { data, isLoading } = useFiguritasPaginadas(user?.username, params);
  const figuritas = data?.content ?? [];

  const [abierta, setAbierta] = useState<string | null>(null);
  const [estados, setEstados] = useState<Record<string, number> | null>(null);
  const [cargandoEstados, setCargandoEstados] = useState(false);

  const handleClick = async (figuritaBaseId: string) => {
    if (abierta === figuritaBaseId) {
      setAbierta(null);
      return;
    }
    setAbierta(figuritaBaseId);
    setEstados(null);
    setCargandoEstados(true);
    try {
      const res = await api.get(`/api/figuritas/usuario/${user!.id}/base/${figuritaBaseId}/estados`);
      setEstados(res.data);
    } catch {
      setEstados({});
    } finally {
      setCargandoEstados(false);
    }
  };

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
              <div key={f.figuritaBaseId} className="relative">
                <TarjetaColeccion
                  seleccionNombre={f.seleccionNombre}
                  jugadorNombre={f.jugadorNombre}
                  equipoNombre={f.equipoNombre}
                  categoriaNombre={f.categoriaNombre}
                  imagenUrl={f.imagenUrl}
                  onClick={() => handleClick(f.figuritaBaseId)}
                  footer={
                    <span className="inline-block px-2 py-1 bg-yellow-600 text-white text-xs font-bold rounded">
                      x{f.count}
                    </span>
                  }
                />
                {abierta === f.figuritaBaseId && (
                  <div className="absolute z-10 top-2 right-2 bg-surface border border-border rounded-md shadow-lg p-3 text-xs min-w-[140px]">
                    {cargandoEstados ? (
                      <p className="text-muted">Cargando...</p>
                    ) : estados && Object.keys(estados).length > 0 ? (
                      <ul className="flex flex-col gap-1">
                        {Object.entries(estados).map(([estado, cantidad]) => (
                          <li key={estado} className="flex justify-between gap-3">
                            <span className="text-muted">{ESTADO_LABELS[estado] ?? estado}</span>
                            <span className="font-bold text-text">{cantidad}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted">Sin datos</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </GrillaFiguritas>
          <Paginador page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
        </>
      )}
    </>
  );
}