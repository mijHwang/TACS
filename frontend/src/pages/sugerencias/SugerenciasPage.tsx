import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { useSugerencias, type SugerenciaResponseDTO } from '../../hooks/useSugerencias';
import type { FiguritaResponseDTO } from '../../hooks/useFiguritas';
import Spinner from '../../components/Spinner';
import ErrorState from '../../components/ErrorState';
import Paginador from '../../components/Paginador';
import ListToolbar from '../../components/ListToolbar';
import PageSizeSelector from '../../components/PageSizeSelector';
import { usePageSize } from '../../hooks/usePageSize';

/**
 * Página de Sugerencias de Intercambio (US4): muestra intercambios bidireccionales posibles
 * con otros usuarios, agrupados por contraparte. Click en una figurita "a recibir" prearma
 * una propuesta con las figuritas a ofrecer pre-tildadas.
 */
export default function SugerenciasPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const { pageSize, setPageSize, options } = usePageSize();
  const { data, isLoading, isError, refetch } = useSugerencias(user?.username, page, pageSize);
  const sugerencias = data?.content ?? [];

  const proponer = (s: SugerenciaResponseDTO, f: FiguritaResponseDTO) => {
    navigate('/propuestas/nueva', {
      state: {
        figuritaSeleccionada: f,
        figuritasOfrecidasBaseIds: s.figuritasAOfrecer.map((x) => x.figuritaBaseId),
      },
    });
  };

  if (isLoading) {
    return <div className="page-enter"><Spinner label="Cargando sugerencias…" /></div>;
  }
  if (isError) {
    return (
      <div className="page-enter">
        <ErrorState message="No se pudieron cargar las sugerencias." onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="page-enter">
      <h1 className="text-2xl font-bold text-text mb-1">Sugerencias de Intercambio</h1>
      <p className="text-sm text-muted mb-6">Intercambios posibles con otros usuarios. Se actualizan a diario.</p>

      <ListToolbar total={data?.totalElements ?? 0}>
        <PageSizeSelector value={pageSize} options={options} onChange={(n) => { setPageSize(n); setPage(0); }} />
      </ListToolbar>

      {sugerencias.length === 0 ? (
        <p className="text-muted">No tenés sugerencias por ahora.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {sugerencias.map((s) => (
            <div key={s.contraparteId} className="bg-surface border border-border rounded-lg p-5">
              <h2 className="text-lg font-semibold text-text mb-4">Con @{s.contraparteNombre}</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-semibold text-primary mb-3">Te puede dar</p>
                  <div className="flex flex-col gap-2">
                    {s.figuritasARecibir.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => proponer(s, f)}
                        className="text-left p-3 bg-surface2 rounded-lg border border-border hover:border-primary transition-colors"
                      >
                        <p className="text-sm font-bold text-text">
                          {f.jugadorNombre} <span className="text-muted font-normal">#{f.numero}</span>
                        </p>
                        <p className="text-xs text-muted">{f.seleccionNombre} · {f.equipoNombre}</p>
                        <p className="text-xs text-primary mt-1">Proponer intercambio →</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-text mb-3">Vos le podés dar</p>
                  <div className="flex flex-col gap-2">
                    {s.figuritasAOfrecer.map((f) => (
                      <div key={f.id} className="p-3 bg-surface2 rounded-lg border border-border">
                        <p className="text-sm font-bold text-text">
                          {f.jugadorNombre} <span className="text-muted font-normal">#{f.numero}</span>
                        </p>
                        <p className="text-xs text-muted">{f.seleccionNombre} · {f.equipoNombre}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Paginador page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
    </div>
  );
}
