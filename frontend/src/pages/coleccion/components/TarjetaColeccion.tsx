import { useState, type ReactNode } from 'react';

interface TarjetaColeccionProps {
  seleccionNombre: string;
  jugadorNombre: string;
  equipoNombre: string;
  categoriaNombre: string;
  /** Foto real del jugador; si falta o falla la carga, se muestra el placeholder. */
  imagenUrl?: string | null;
  /** Contenido del pie de la tarjeta: badge de cantidad, número, etc. */
  footer?: ReactNode;
  /** Si se provee (y no hay acciones), la tarjeta es clickeable y dispara este handler. */
  onClick?: () => void;
  /** Si se provee, muestra un botón "Quitar" (para faltantes/wishlist). */
  onRemove?: () => void;
  // Acciones (happy path): si se proveen, el click expande los botones en vez de disparar onClick.
  onPublishExchange?: () => void;
  onAuction?: () => void;
  canAuction?: boolean;
  isPublishing?: boolean;
}

/**
 * Tarjeta de figurita reutilizable en las vistas de "Mi Colección".
 * El contenido variable (badge de cantidad vs. número de figurita) se pasa por `footer`.
 * Modos de interacción (mutuamente excluyentes según el consumidor):
 *  - `onClick`: la tarjeta entera es un botón (p. ej. Faltantes → ir a buscar).
 *  - `onPublishExchange`/`onAuction`: el click expande los botones de acción (happy path).
 */
export default function TarjetaColeccion({
  seleccionNombre, jugadorNombre, equipoNombre, categoriaNombre, imagenUrl, footer, onClick, onRemove,
  onPublishExchange, onAuction, canAuction, isPublishing,
}: TarjetaColeccionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const mostrarImagen = !!imagenUrl && !imgError;
  const hasActions = !!(onPublishExchange || onAuction);
  const clickable = hasActions || typeof onClick === 'function';

  const handleCardClick = () => {
    if (hasActions) setIsExpanded((v) => !v);
    else if (onClick) onClick();
  };

  return (
    <div
      data-testid="figurita-card"
      onClick={handleCardClick}
      className={
        'bg-surface p-4 rounded-lg border border-border flex flex-col transition-all duration-200 ' +
        (clickable ? 'cursor-pointer hover:bg-surface/80 ' : '') +
        (isExpanded ? 'border-primary' : '')
      }
    >
      <div className="w-full aspect-square bg-surface2 rounded-md mb-3 flex items-center justify-center overflow-hidden">
        {mostrarImagen ? (
          <img
            src={imagenUrl!}
            alt={jugadorNombre}
            className="w-full h-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <p className="text-xs text-muted">Imagen</p>
        )}
      </div>
      <p className="text-xs text-muted mb-2">{seleccionNombre}</p>
      <p className="text-sm font-bold text-primary mb-2">{jugadorNombre}</p>
      <p className="text-xs text-text mb-2">{equipoNombre}</p>
      <p className="text-xs text-muted mb-3">{categoriaNombre}</p>

      {(footer || onRemove) && (
        <div className="mt-auto mb-3 flex items-center justify-between gap-2">
          <span>{footer}</span>
          {onRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="text-xs px-2 py-1 rounded border border-border text-muted hover:text-red-500 hover:border-red-500 transition-colors"
            >
              Quitar
            </button>
          )}
        </div>
      )}

      {/* Botones de acción (visibles al expandir) */}
      {isExpanded && hasActions && (
        <div
          className="mt-2 pt-3 border-t border-border flex flex-col gap-2 animate-in fade-in slide-in-from-top-1"
          onClick={(e) => e.stopPropagation()}
        >
          {onPublishExchange && (
            <button
              onClick={onPublishExchange}
              disabled={isPublishing}
              className="w-full py-2 bg-primary/20 text-primary text-xs font-bold rounded hover:bg-primary/30 transition-colors"
            >
              {isPublishing ? 'Publicando...' : 'Publicar Intercambio'}
            </button>
          )}
          {onAuction && (
            <button
              onClick={onAuction}
              disabled={!canAuction}
              className="w-full py-2 bg-secondary/20 text-secondary text-xs font-bold rounded hover:bg-secondary/30 disabled:opacity-50 transition-colors"
            >
              Subastar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
