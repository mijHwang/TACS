import type { ReactNode } from 'react';

interface GrillaFiguritasProps {
  isEmpty: boolean;
  emptyMessage: string;
  children: ReactNode;
}

/**
 * Contenedor de grilla para las tarjetas de colección. Muestra `emptyMessage`
 * cuando no hay resultados (post-filtrado).
 */
export default function GrillaFiguritas({ isEmpty, emptyMessage, children }: GrillaFiguritasProps) {
  if (isEmpty) {
    return <p className="text-muted">{emptyMessage}</p>;
  }
  return <div className="grid grid-cols-4 gap-4">{children}</div>;
}
