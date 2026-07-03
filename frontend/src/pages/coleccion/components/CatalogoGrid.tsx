import type { ReactNode } from 'react';
import EmptyState from '../../../components/EmptyState';

interface Props {
  loading: boolean;
  isEmpty: boolean;
  emptyMessage: string;
  children: ReactNode;
}

const GRID = 'grid grid-cols-2 sm:grid-cols-3 gap-3';

/** Grilla del maestro: skeletons mientras carga, EmptyState si no hay resultados, o los hijos. */
export default function CatalogoGrid({ loading, isEmpty, emptyMessage, children }: Props) {
  if (loading) {
    return (
      <div className={GRID}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} data-testid="skeleton-card" className="bg-surface2 rounded-lg border border-border p-3 animate-pulse">
            <div className="w-full aspect-square bg-surface rounded mb-2" />
            <div className="h-3 bg-surface rounded w-1/2 mb-1" />
            <div className="h-3 bg-surface rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }
  if (isEmpty) return <EmptyState title={emptyMessage} />;
  return <div className={GRID}>{children}</div>;
}
