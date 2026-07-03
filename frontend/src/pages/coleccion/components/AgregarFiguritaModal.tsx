import { useState } from 'react';
import { useAuth } from '../../../auth/useAuth';
import api from '../../../services/api';
import { useCatalogoFiguritas } from '../../../hooks/useCatalogoFiguritas';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import type { FiguritaResponseDTO } from '../../../hooks/useFiguritas';
import Paginador from '../../../components/Paginador';

const BLUE = '#03BAE9';

interface Props {
  mode: 'poseida' | 'faltante';
  onClose: () => void;
  onDone: () => void;
}

/**
 * Modal para construir la colección desde el maestro.
 * - modo 'poseida': elegís una figu + cantidad (total) → PUT /figuritas/{baseId}.
 * - modo 'faltante': elegís una figu → POST /faltantes (excluye lo que ya tenés).
 */
export default function AgregarFiguritaModal({ mode, onClose, onDone }: Props) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [busyBaseId, setBusyBaseId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const debounced = useDebouncedValue(search, 300);

  // faltante: excluye lo que el usuario ya posee (usuarioId). poseida: todo el maestro.
  const { data, isLoading } = useCatalogoFiguritas({
    page,
    search: debounced.trim() || undefined,
    usuarioId: mode === 'faltante' ? user?.id : undefined,
  });
  const items = data?.content ?? [];

  const handleSelect = async (f: FiguritaResponseDTO) => {
    if (!user) return;
    setMsg(null);
    try {
      if (mode === 'poseida') {
        const input = window.prompt(`¿Cuántas copias de ${f.jugadorNombre} tenés en total?`, '1');
        if (input === null) return;
        const cantidad = parseInt(input, 10);
        if (isNaN(cantidad) || cantidad < 1) { alert('Ingresá un número mayor o igual a 1'); return; }
        setBusyBaseId(f.figuritaBaseId);
        await api.put(`/api/usuarios/${user.username}/figuritas/${f.figuritaBaseId}`, { cantidad });
        setMsg(`✔ ${f.jugadorNombre}: ahora tenés ${cantidad}`);
      } else {
        setBusyBaseId(f.figuritaBaseId);
        await api.post(`/api/usuarios/${user.username}/faltantes`, { figuritaBaseId: f.figuritaBaseId });
        setMsg(`✔ ${f.jugadorNombre} agregada a faltantes`);
      }
      onDone();
    } catch (error: unknown) {
      const resp = (error as { response?: { data?: { message?: string; error?: string } } }).response;
      alert(resp?.data?.message || resp?.data?.error || 'No se pudo completar la acción.');
    } finally {
      setBusyBaseId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl border border-border w-full max-w-3xl max-h-[85vh] flex flex-col p-6"
        style={{ borderColor: `${BLUE}30` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text">
            {mode === 'poseida' ? 'Agregar figurita a mi colección' : 'Agregar figurita a faltantes'}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-text text-xl leading-none">✕</button>
        </div>

        <input
          type="text"
          aria-label="Buscar en el maestro"
          placeholder="Buscar por jugador, selección o número…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-full p-3 mb-3 bg-surface2 border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:border-primary"
        />

        {msg && <p className="text-xs mb-2" style={{ color: '#05B15A' }}>{msg}</p>}

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="text-muted text-sm py-6 text-center">Cargando…</p>
          ) : items.length === 0 ? (
            <p className="text-muted text-sm py-6 text-center">Sin resultados</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((f) => (
                <button
                  key={f.figuritaBaseId}
                  onClick={() => handleSelect(f)}
                  disabled={busyBaseId === f.figuritaBaseId}
                  className="text-left bg-surface2 p-3 rounded-lg border border-border hover:border-primary transition-colors disabled:opacity-50"
                >
                  <div className="w-full aspect-square bg-surface rounded mb-2 flex items-center justify-center overflow-hidden">
                    {f.imagenUrl ? (
                      <img src={f.imagenUrl} alt={f.jugadorNombre} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs text-muted">#{f.numero}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted">{f.seleccionNombre}</p>
                  <p className="text-sm font-bold text-primary">{f.jugadorNombre}</p>
                  <p className="text-xs text-text">#{f.numero}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3">
          <Paginador page={page} totalPages={data?.totalPages ?? 1} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}
