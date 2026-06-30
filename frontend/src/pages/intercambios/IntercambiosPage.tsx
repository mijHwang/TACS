import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/useAuth';
import api, { DEFAULT_PAGE_SIZE, type PagedResponse } from '../../services/api';
import Paginador from '../../components/Paginador';

interface IntercambioResponseDTO {
  id: string;
  usuarioGeneradorId: string;
  usuarioGeneradorUsername: string;
  usuarioIntercambiadorId: string;
  usuarioIntercambiadorUsername: string;
  figuritaId: string;
  figuritaNombre: string;
  figuritasIntercambiadasNombres: string[];
  fecha: string;
  puntajeGenerador: number | null;
  puntajeIntercambiador: number | null;
}

const RED = '#D82D31';
const BLUE = '#03BAE9';

export default function IntercambiosPage() {
  const { user } = useAuth();
  const [intercambios, setIntercambios] = useState<IntercambioResponseDTO[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(Boolean(user?.id && user.id !== user.username));
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<{ id: string; star: number } | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [calificarError, setCalificarError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || user.id === user.username) return;
    // No seteamos loading=true en cambios de página: mantenemos las filas previas
    // visibles hasta que llega la nueva página (UX tipo keepPreviousData). El spinner
    // inicial se cubre con el estado loading inicial (true).
    api.get<PagedResponse<IntercambioResponseDTO>>(`/api/intercambios/usuario/${user.id}`, {
      params: { page, size: DEFAULT_PAGE_SIZE },
    })
      .then(res => {
        setIntercambios(res.data.content);
        setTotalPages(res.data.totalPages);
        setTotalElements(res.data.totalElements);
      })
      .catch(() => setError('No se pudieron cargar los intercambios.'))
      .finally(() => setLoading(false));
  }, [user?.id, user?.username, page]);

  const handleCalificar = async (intercambioId: string, puntaje: number) => {
    if (!user?.id) return;
    setCalificarError(null);
    setSubmittingId(intercambioId);
    try {
      const res = await api.patch(
        `/api/intercambios/${intercambioId}/calificar`,
        null,
        { params: { calificadorId: user.id, puntaje } }
      );
      setIntercambios(prev =>
        prev.map(i => i.id === intercambioId ? res.data : i)
      );
    } catch {
      setCalificarError('No se pudo calificar. Intentá de nuevo.');
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading && intercambios.length === 0) return (
    <div className="flex items-center justify-center py-20 gap-2 text-muted text-sm">
      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
      Cargando intercambios…
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
      <p className="text-sm font-semibold" style={{ color: RED }}>{error}</p>
    </div>
  );

  return (
    <div className="page-enter flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: BLUE }} />
        <h2 className="text-base font-bold text-text">Mis Intercambios</h2>
        <span
          className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ background: `${BLUE}15`, color: BLUE }}
        >
          {totalElements}
        </span>
      </div>

      {intercambios.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: `${BLUE}12`, border: `1.5px solid ${BLUE}30` }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="1.8" className="w-6 h-6">
              <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-text">No tenés intercambios aún</p>
          <p className="text-xs text-muted">Cuando completes un intercambio, aparecerá acá.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {intercambios.map(intercambio => {
            const soyGenerador = user?.id === intercambio.usuarioGeneradorId;
            const otroUsername = soyGenerador
              ? intercambio.usuarioIntercambiadorUsername
              : intercambio.usuarioGeneradorUsername;

            // If I'm generador, I rate intercambiador → puntajeIntercambiador
            // If I'm intercambiador, I rate generador → puntajeGenerador
            const miPuntaje = soyGenerador
              ? intercambio.puntajeIntercambiador
              : intercambio.puntajeGenerador;

            const yaCalifique = miPuntaje !== null && miPuntaje !== undefined;
            const isSubmitting = submittingId === intercambio.id;

            return (
              <div key={intercambio.id} className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-4">

                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[0.65rem] text-muted uppercase tracking-wider mb-0.5">Intercambiaste con</p>
                    <p className="text-sm font-semibold text-text">@{otroUsername}</p>
                  </div>
                  <p className="text-xs text-muted">
                    {new Date(intercambio.fecha).toLocaleDateString('es-AR')}
                  </p>
                </div>

                {/* Figuritas */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface2 border border-border rounded-lg px-3 py-2">
                    <p className="text-[0.65rem] text-muted uppercase tracking-wider mb-1">
                      {soyGenerador ? 'Recibiste' : 'Diste'}
                    </p>
                    <p className="text-xs font-medium text-text">{intercambio.figuritaNombre}</p>
                  </div>
                  <div className="bg-surface2 border border-border rounded-lg px-3 py-2">
                    <p className="text-[0.65rem] text-muted uppercase tracking-wider mb-1">
                      {soyGenerador ? 'Diste' : 'Recibiste'}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {intercambio.figuritasIntercambiadasNombres.map((nombre, i) => (
                        <p key={i} className="text-xs font-medium text-text">{nombre}</p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Rating */}
                <div className="border-t border-border pt-3">
                  {yaCalifique ? (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted">Tu calificación:</p>
                      <Stars value={miPuntaje!} readonly />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <p className="text-xs text-muted shrink-0">Calificar a @{otroUsername}:</p>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              disabled={isSubmitting}
                              onClick={() => handleCalificar(intercambio.id, star)}
                              onMouseEnter={() => setHovered({ id: intercambio.id, star })}
                              onMouseLeave={() => setHovered(null)}
                              className="transition-transform hover:scale-110 disabled:opacity-40"
                            >
                              <svg viewBox="0 0 24 24" className="w-5 h-5" fill={
                                hovered?.id === intercambio.id && star <= hovered.star
                                  ? '#F59E0B'
                                  : 'none'
                              } stroke="#F59E0B" strokeWidth="1.5">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                            </button>
                          ))}
                        </div>
                        {isSubmitting && <span className="text-xs text-muted">Guardando…</span>}
                      </div>
                      {calificarError && submittingId === null && (
                        <p className="text-xs font-semibold mt-1" style={{ color: RED }}>{calificarError}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <Paginador page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      )}
    </div>
  );
}

function Stars({ value, readonly = false }: { value: number; readonly?: boolean }) {
  return (
    <div className="flex items-center gap-0.5" aria-readonly={readonly}>
      {[1, 2, 3, 4, 5].map(star => (
        <svg key={star} viewBox="0 0 24 24" className="w-4 h-4" fill={star <= value ? '#F59E0B' : 'none'} stroke="#F59E0B" strokeWidth="1.5">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}