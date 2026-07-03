import { useState, type ReactNode } from 'react';
import type { FiguritaBaseDTO } from '../../../hooks/useFiguritas';

const BLUE = '#03BAE9';
const RED = '#D82D31';
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

/** Celda tipo "casillero de álbum": foto (o placeholder) con el número y un chip de estado sobre ella. */
function Cell({ base, topRight }: { base: FiguritaBaseDTO; topRight?: ReactNode }) {
  const [err, setErr] = useState(false);
  const show = !!base.imagenUrl && !err;
  return (
    <div className="relative aspect-square bg-surface2 rounded-lg overflow-hidden mb-2.5 border border-border">
      {show ? (
        <img src={base.imagenUrl!} alt={base.jugadorNombre} className="w-full h-full object-contain" onError={() => setErr(true)} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-7 h-7" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
          </svg>
        </div>
      )}
      <span
        className="absolute top-1.5 left-1.5 text-[11px] font-medium px-1.5 py-0.5 rounded"
        style={{ background: 'rgba(255,255,255,0.9)', color: '#3d3d3a' }}
      >
        #{base.numero}
      </span>
      {topRight && <div className="absolute top-1.5 right-1.5">{topRight}</div>}
    </div>
  );
}

/** Nombre del jugador + selección con puntito de color (compartido por los dos modos). */
function Meta({ base }: { base: FiguritaBaseDTO }) {
  return (
    <>
      <p className="text-sm font-semibold text-text leading-tight">{base.jugadorNombre}</p>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: RED }} />
        <span className="text-xs text-muted truncate">{base.seleccionNombre}</span>
      </div>
    </>
  );
}

/**
 * Tarjeta del maestro dentro del modal (estilo ficha de álbum).
 * En `poseida` la tarjeta entera selecciona (chip "×N" / "Nueva"); en `faltante` trae su acción.
 */
export default function CatalogoCard({
  base, mode, owned = 0, selected, onSelect, inWishlist, busy, onAdd, onRemove,
}: CatalogoCardProps) {
  if (mode === 'poseida') {
    const chip = owned > 0 ? (
      <span aria-label={`Tenés ${owned}`} className="text-[11px] font-medium text-white px-2 py-0.5 rounded-full" style={{ background: BLUE }}>
        ×{owned}
      </span>
    ) : (
      <span aria-label="No la tenés todavía" className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.9)', color: '#8a8a86' }}>
        Nueva
      </span>
    );
    return (
      <button
        type="button"
        data-testid="catalogo-card"
        onClick={onSelect}
        className={'text-left bg-surface p-2.5 rounded-xl border transition-all duration-150 hover:-translate-y-0.5 ' + (selected ? 'border-primary' : 'border-border')}
        style={selected ? { boxShadow: `0 0 0 1px ${BLUE}` } : undefined}
      >
        <Cell base={base} topRight={chip} />
        <Meta base={base} />
      </button>
    );
  }

  const check = inWishlist ? (
    <span aria-label="En tu wishlist" className="flex items-center justify-center w-5 h-5 rounded-full text-white" style={{ background: GREEN }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="w-3 h-3" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
    </span>
  ) : null;

  return (
    <div
      data-testid="catalogo-card"
      className="bg-surface p-2.5 rounded-xl border border-border transition-all duration-150"
      style={inWishlist ? { borderColor: `${GREEN}55` } : undefined}
    >
      <Cell base={base} topRight={check} />
      <Meta base={base} />
      {inWishlist ? (
        <button
          onClick={onRemove}
          disabled={busy}
          className="w-full mt-2.5 py-1.5 text-xs rounded-lg border border-border text-muted hover:text-red-500 hover:border-red-500 transition-colors disabled:opacity-50"
        >
          En tu wishlist · Quitar
        </button>
      ) : (
        <button
          onClick={onAdd}
          disabled={busy}
          className="w-full mt-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
          style={{ background: `${BLUE}18`, color: BLUE }}
        >
          {busy ? 'Agregando…' : '+ Agregar'}
        </button>
      )}
    </div>
  );
}
