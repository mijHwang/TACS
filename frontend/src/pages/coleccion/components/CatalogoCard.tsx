import { useState } from 'react';
import type { FiguritaBaseDTO } from '../../../hooks/useFiguritas';

const BLUE = '#03BAE9';
const GREEN = '#05B15A';

interface CatalogoCardProps {
  base: FiguritaBaseDTO;
  mode: 'poseida' | 'faltante';
  owned?: number;
  selected?: boolean;
  onSelect?: () => void;
  inWishlist?: boolean;
  busy?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
}

function Imagen({ base }: { base: FiguritaBaseDTO }) {
  const [err, setErr] = useState(false);
  const show = !!base.imagenUrl && !err;
  return (
    <div className="w-full aspect-square bg-surface rounded mb-2 flex items-center justify-center overflow-hidden">
      {show
        ? <img src={base.imagenUrl!} alt={base.jugadorNombre} className="w-full h-full object-contain" onError={() => setErr(true)} />
        : <span className="text-xs text-muted">#{base.numero}</span>}
    </div>
  );
}

/** Tarjeta del maestro dentro del modal. En `poseida` la tarjeta entera selecciona; en `faltante` trae su acción. */
export default function CatalogoCard({
  base, mode, owned = 0, selected, onSelect, inWishlist, busy, onAdd, onRemove,
}: CatalogoCardProps) {
  const meta = (
    <>
      <p className="text-xs text-muted">{base.seleccionNombre}</p>
      <p className="text-sm font-bold text-primary">{base.jugadorNombre}</p>
      <p className="text-xs text-text">#{base.numero}</p>
    </>
  );

  if (mode === 'poseida') {
    return (
      <button
        type="button"
        data-testid="catalogo-card"
        onClick={onSelect}
        className={'text-left bg-surface2 p-3 rounded-lg border transition-colors hover:border-primary ' + (selected ? 'border-primary' : 'border-border')}
        style={selected ? { boxShadow: `0 0 0 1px ${BLUE}` } : undefined}
      >
        <Imagen base={base} />
        {meta}
        <span
          className="inline-block mt-2 text-xs px-2 py-0.5 rounded"
          style={{ background: owned > 0 ? `${BLUE}18` : 'transparent', color: owned > 0 ? BLUE : 'var(--muted, #888)' }}
        >
          {owned > 0 ? `Tenés ${owned}` : 'No la tenés'}
        </span>
      </button>
    );
  }

  return (
    <div
      data-testid="catalogo-card"
      className="bg-surface2 p-3 rounded-lg border transition-colors"
      style={{ borderColor: inWishlist ? `${GREEN}55` : 'var(--border, #e5e5e5)' }}
    >
      <Imagen base={base} />
      {meta}
      {inWishlist ? (
        <button
          onClick={onRemove}
          disabled={busy}
          className="w-full mt-2 py-1.5 text-xs rounded border border-border text-muted hover:text-red-500 hover:border-red-500 transition-colors disabled:opacity-50"
        >
          En tu wishlist · Quitar
        </button>
      ) : (
        <button
          onClick={onAdd}
          disabled={busy}
          className="w-full mt-2 py-1.5 text-xs font-semibold rounded transition-colors disabled:opacity-50"
          style={{ background: `${BLUE}18`, color: BLUE }}
        >
          {busy ? 'Agregando…' : '+ Agregar'}
        </button>
      )}
    </div>
  );
}
