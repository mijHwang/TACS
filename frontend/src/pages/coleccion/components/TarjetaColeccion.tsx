import { useState } from 'react';
import type { ReactNode } from 'react';

interface TarjetaColeccionProps {
  seleccionNombre: string;
  jugadorNombre: string;
  equipoNombre: string;
  categoriaNombre: string;
  footer?: ReactNode;
  // Acciones
  onPublishExchange?: () => void;
  onAuction?: () => void;
  canAuction?: boolean;
  isPublishing?: boolean;
}

export default function TarjetaColeccion({
  seleccionNombre, jugadorNombre, equipoNombre, categoriaNombre, footer,
  onPublishExchange, onAuction, canAuction, isPublishing
}: TarjetaColeccionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasActions = !!(onPublishExchange || onAuction);

  return (
    <div
      onClick={() => hasActions && setIsExpanded(!isExpanded)}
      className={`bg-surface p-4 rounded-lg border border-border flex flex-col transition-all duration-200
        ${hasActions ? 'cursor-pointer hover:bg-surface/80' : ''}
        ${isExpanded ? 'border-primary' : ''}`}
    >
      <div className="w-full aspect-square bg-surface2 rounded-md mb-3 flex items-center justify-center">
        <p className="text-xs text-muted">Imagen</p>
      </div>
      <p className="text-xs text-muted mb-2">{seleccionNombre}</p>
      <p className="text-sm font-bold text-primary mb-2">{jugadorNombre}</p>
      <p className="text-xs text-text mb-2">{equipoNombre}</p>
      <p className="text-xs text-muted mb-3">{categoriaNombre}</p>
      
      {footer && <div className="mt-auto mb-3">{footer}</div>}

      {/* Action Buttons (Visible when clicked) */}
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