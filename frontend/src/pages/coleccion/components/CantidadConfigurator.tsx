import { useState } from 'react';
import type { FiguritaBaseDTO } from '../../../hooks/useFiguritas';

const BLUE = '#03BAE9';
const RED = '#D82D31';

interface Props {
  base: FiguritaBaseDTO;
  current: number;
  busy?: boolean;
  onSave: (total: number) => void;
  onCancel: () => void;
}

/**
 * Barra inferior del modo repetidas: stepper de total + aviso de cascada al bajar.
 * El estado inicial se toma de `current` al montar; el padre remonta (via `key={base.id}`)
 * al cambiar de figurita, así que no hace falta sincronizar por efecto.
 */
export default function CantidadConfigurator({ base, current, busy, onSave, onCancel }: Props) {
  const [total, setTotal] = useState(current);

  const lowering = total < current;
  const unchanged = total === current;
  const liberadas = current - total;
  const accent = lowering ? RED : BLUE;

  const save = () => { if (!unchanged && !busy) onSave(total); };

  return (
    <div
      className="mt-3 rounded-xl border p-3"
      style={{ borderColor: `${accent}40`, background: `${accent}0d` }}
      onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-text truncate">{base.jugadorNombre} · #{base.numero}</p>
          <p className="text-xs text-muted">Total de copias que tenés</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button" aria-label="Restar una copia"
            onClick={() => setTotal((t) => Math.max(0, t - 1))}
            className="w-8 h-8 rounded-md border border-border text-text text-lg leading-none flex items-center justify-center hover:bg-surface2"
          >−</button>
          <span data-testid="total" className="min-w-6 text-center text-base font-semibold">{total}</span>
          <button
            type="button" aria-label="Sumar una copia"
            onClick={() => setTotal((t) => t + 1)}
            className="w-8 h-8 rounded-md border border-border text-text text-lg leading-none flex items-center justify-center hover:bg-surface2"
          >+</button>
        </div>
      </div>

      {lowering && (
        <p role="alert" className="mt-2 text-xs" style={{ color: RED }}>
          Bajás de {current} a {total}: se liberan {liberadas} {liberadas === 1 ? 'copia' : 'copias'}.
          Puede cancelar publicaciones, subastas o propuestas que las usen.
        </p>
      )}

      <div className="flex justify-end gap-2 mt-3">
        <button
          type="button" onClick={onCancel}
          className="h-8 px-3 text-sm rounded-md border border-border text-muted hover:text-text"
        >Cancelar</button>
        <button
          type="button" onClick={save} disabled={unchanged || busy}
          className="h-8 px-4 text-sm font-semibold rounded-md text-white disabled:opacity-40"
          style={{ background: accent }}
        >
          {busy ? 'Guardando…' : lowering ? `Liberar ${liberadas} ${liberadas === 1 ? 'copia' : 'copias'}` : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
