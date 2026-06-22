import type { ReactNode } from 'react';

interface TarjetaColeccionProps {
  seleccionNombre: string;
  jugadorNombre: string;
  equipoNombre: string;
  categoriaNombre: string;
  /** Contenido del pie de la tarjeta: badge de cantidad, número, etc. */
  footer?: ReactNode;
  /** Si se provee, la tarjeta es clickeable (cursor + hover). */
  onClick?: () => void;
}

/**
 * Tarjeta de figurita reutilizable en las vistas de "Mi Colección".
 * El contenido variable (badge de cantidad vs. número de figurita) se pasa por `footer`.
 */
export default function TarjetaColeccion({
  seleccionNombre, jugadorNombre, equipoNombre, categoriaNombre, footer, onClick,
}: TarjetaColeccionProps) {
  const clickable = typeof onClick === 'function';
  return (
    <div
      onClick={onClick}
      className={
        'bg-surface p-4 rounded-lg border border-border flex flex-col ' +
        (clickable ? 'cursor-pointer hover:bg-surface/80 transition-colors' : '')
      }
    >
      <div className="w-full aspect-square bg-surface2 rounded-md mb-3 flex items-center justify-center">
        <p className="text-xs text-muted">Imagen</p>
      </div>
      <p className="text-xs text-muted mb-2">{seleccionNombre}</p>
      <p className="text-sm font-bold text-primary mb-2">{jugadorNombre}</p>
      <p className="text-xs text-text mb-2">{equipoNombre}</p>
      <p className="text-xs text-muted mb-3">{categoriaNombre}</p>
      {footer && <div className="mt-auto">{footer}</div>}
    </div>
  );
}
