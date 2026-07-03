import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/useAuth';
import api from '../../../services/api';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useMaestro } from '../../../hooks/useMaestro';
import { useMisCantidades } from '../../../hooks/useMisCantidades';
import { useWishlistBaseIds } from '../../../hooks/useWishlistBaseIds';
import { useToast } from '../../../components/toast/useToast';
import type { FiguritaBaseDTO } from '../../../hooks/useFiguritas';
import Paginador from '../../../components/Paginador';
import CatalogoGrid from './CatalogoGrid';
import CatalogoCard from './CatalogoCard';
import CantidadConfigurator from './CantidadConfigurator';

const BLUE = '#03BAE9';

interface Props {
  mode: 'poseida' | 'faltante';
  onClose: () => void;
  onDone: () => void;
}

function mapError(status: number | undefined, mode: 'poseida' | 'faltante'): string {
  if (status === 409) return mode === 'faltante' ? 'Ya tenés esta figurita.' : 'No se pudo actualizar la cantidad.';
  if (status === 404) return 'Figurita no encontrada.';
  if (status === 403) return 'No tenés permiso para esta acción.';
  return 'No se pudo completar la acción.';
}

/**
 * Modal para construir la colección desde el maestro completo.
 * - `poseida`: elegís una base → configurador de total (PUT), con aviso al bajar.
 * - `faltante`: agregás/quitás bases de la wishlist (POST/DELETE); el maestro excluye lo que ya tenés.
 */
export default function AgregarFiguritaModal({ mode, onClose, onDone }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const debounced = useDebouncedValue(search, 300);

  const maestro = useMaestro({
    page,
    search: debounced.trim() || undefined,
    excludeOwnedBy: mode === 'faltante' ? user?.id : undefined,
  });
  const cantidades = useMisCantidades(mode === 'poseida' ? user?.username : undefined);
  const wishlist = useWishlistBaseIds(mode === 'faltante' ? user?.username : undefined);

  const items = maestro.data?.content ?? [];
  const selected = items.find((b) => b.id === selectedId) ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const afterMutate = () => {
    qc.invalidateQueries({ queryKey: ['figuritas'] });
    qc.invalidateQueries({ queryKey: ['faltantes'] });
    onDone();
  };

  const handleSaveCantidad = async (total: number) => {
    if (!user || !selected) return;
    setBusyId(selected.id);
    try {
      await api.put(`/api/usuarios/${user.username}/figuritas/${selected.id}`, { cantidad: total });
      toast.success(`${selected.jugadorNombre}: ahora tenés ${total}`);
      setSelectedId(null);
      afterMutate();
    } catch (e: unknown) {
      toast.error(mapError((e as { response?: { status?: number } }).response?.status, mode));
    } finally { setBusyId(null); }
  };

  const handleAdd = async (base: FiguritaBaseDTO) => {
    if (!user) return;
    setBusyId(base.id);
    try {
      await api.post(`/api/usuarios/${user.username}/faltantes`, { figuritaBaseId: base.id });
      toast.success(`${base.jugadorNombre} agregada a faltantes`);
      afterMutate();
    } catch (e: unknown) {
      toast.error(mapError((e as { response?: { status?: number } }).response?.status, mode));
    } finally { setBusyId(null); }
  };

  const handleRemove = async (base: FiguritaBaseDTO) => {
    if (!user) return;
    setBusyId(base.id);
    try {
      await api.delete(`/api/usuarios/${user.username}/faltantes/${base.id}`);
      toast.info(`${base.jugadorNombre} quitada de faltantes`);
      afterMutate();
    } catch (e: unknown) {
      toast.error(mapError((e as { response?: { status?: number } }).response?.status, mode));
    } finally { setBusyId(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-2xl border border-border w-full max-w-3xl max-h-[85vh] flex flex-col p-6"
        style={{ borderColor: `${BLUE}30` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text">
            {mode === 'poseida' ? 'Agregar a mis repetidas' : 'Agregar a mis faltantes'}
          </h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-muted hover:text-text text-xl leading-none">✕</button>
        </div>

        <div className="flex items-center gap-2 mb-3 px-3 bg-surface2 border border-border rounded-lg focus-within:border-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-muted shrink-0" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            aria-label="Buscar en el maestro"
            placeholder="Buscar por jugador, selección o número…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="flex-1 py-3 bg-transparent text-text placeholder-muted focus:outline-none"
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(0); }} aria-label="Limpiar búsqueda" className="text-muted hover:text-text">✕</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <CatalogoGrid loading={maestro.isLoading} isEmpty={items.length === 0} emptyMessage="Sin resultados">
            {items.map((base) => (
              <CatalogoCard
                key={base.id}
                base={base}
                mode={mode}
                owned={cantidades.data?.get(base.id) ?? 0}
                selected={selectedId === base.id}
                onSelect={() => setSelectedId(base.id)}
                inWishlist={wishlist.data?.has(base.id) ?? false}
                busy={busyId === base.id}
                onAdd={() => handleAdd(base)}
                onRemove={() => handleRemove(base)}
              />
            ))}
          </CatalogoGrid>
        </div>

        {mode === 'poseida' && selected && (
          <CantidadConfigurator
            key={selected.id}
            base={selected}
            current={cantidades.data?.get(selected.id) ?? 0}
            busy={busyId === selected.id}
            onSave={handleSaveCantidad}
            onCancel={() => setSelectedId(null)}
          />
        )}

        <div className="mt-3">
          <Paginador page={page} totalPages={maestro.data?.totalPages ?? 1} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}
