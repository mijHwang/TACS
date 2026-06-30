const BLUE = '#03BAE9';

interface PageSizeSelectorProps {
  value: number;
  options: number[];
  onChange: (n: number) => void;
}

/** Selector de cantidad por página ("Mostrar 10/20/50/100"). Presentacional. */
export default function PageSizeSelector({ value, options, onChange }: PageSizeSelectorProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      Mostrar
      <select
        aria-label="Cantidad por página"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 rounded-lg bg-surface text-text text-sm px-2 focus:outline-none"
        style={{ border: `1.5px solid ${BLUE}` }}
      >
        {options.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </label>
  );
}
