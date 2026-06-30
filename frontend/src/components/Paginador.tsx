const BLUE = '#03BAE9';

interface PaginadorProps {
  page: number;        // 0-based current page
  totalPages: number;
  onChange: (page: number) => void;
}

/** Paginador numerado con ventana (máx 7 botones). `page` es 0-based; las etiquetas son 1-based. */
export default function Paginador({ page, totalPages, onChange }: PaginadorProps) {
  const WINDOW = 7;
  const pageCount = Math.max(1, totalPages);
  let start = Math.max(0, page - Math.floor(WINDOW / 2));
  const end = Math.min(pageCount, start + WINDOW);
  start = Math.max(0, end - WINDOW);
  const pages = Array.from({ length: end - start }, (_, i) => start + i);

  const numBtn = (n: number) => (
    <button
      key={n}
      type="button"
      onClick={() => onChange(n)}
      aria-current={n === page ? 'page' : undefined}
      className="w-8 h-8 rounded-lg text-sm font-semibold border transition-all duration-150"
      style={
        n === page
          ? { background: BLUE, color: 'white', borderColor: BLUE }
          : { borderColor: `${BLUE}30`, color: '#6b7280', background: 'white' }
      }
    >
      {n + 1}
    </button>
  );

  return (
    <div className="flex items-center justify-center gap-1 pt-2 pb-1">
      <button
        type="button"
        aria-label="Página anterior"
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ borderColor: `${BLUE}40`, color: BLUE }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
      </button>
      {start > 0 && <span className="px-1 text-gray-400">…</span>}
      {pages.map(numBtn)}
      {end < pageCount && <span className="px-1 text-gray-400">…</span>}
      <button
        type="button"
        aria-label="Página siguiente"
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount - 1}
        className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ borderColor: `${BLUE}40`, color: BLUE }}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
      </button>
    </div>
  );
}
