import type { ReactNode } from 'react';

interface ListToolbarProps {
  total?: number;
  children: ReactNode;
}

/** Barra sobre una lista paginada: contador "{n} resultados" a la izquierda + controles a la derecha. */
export default function ListToolbar({ total, children }: ListToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <span className="text-sm text-muted">
        {total != null ? `${total} ${total === 1 ? 'resultado' : 'resultados'}` : ''}
      </span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
