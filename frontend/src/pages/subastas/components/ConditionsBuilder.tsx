import { useState } from 'react';
import type { AuctionCondition } from '../../../types/auction';

// ── Países disponibles ────────────────────────────────────────────────────────
export const WC_COUNTRIES = [
  'ARG', 'BRA', 'FRA', 'ENG', 'GER', 'ESP', 'POR', 'NGA',
  'MEX', 'USA', 'CAN', 'JPN', 'KOR', 'MAR', 'NED', 'BEL',
  'URU', 'COL', 'CRO', 'SUI', 'ECU', 'SEN', 'GHA', 'AUS',
];

// ── Tipos de condición disponibles ───────────────────────────────────────────
// Para agregar una nueva: agregar aquí + manejar en buildCondition() + en BidForm
const CONDITION_TYPES: { type: AuctionCondition['type']; label: string }[] = [
  { type: 'min_stickers', label: 'Cantidad mínima de figuritas' },
  { type: 'country', label: 'De una selección específica' },
  { type: 'specific_sticker', label: 'Figurita específica requerida' },
];

// ── Label legible de una condición ────────────────────────────────────────────
export function conditionLabel(c: AuctionCondition): string {
  switch (c.type) {
    case 'min_stickers': return `Mínimo ${c.value} figurita${c.value !== 1 ? 's' : ''}`;
    case 'country': return `Solo de ${c.value}`;
    case 'specific_sticker': return `Debe incluir #${c.value}`;
  }
}

// ── Componente ────────────────────────────────────────────────────────────────
interface ConditionsBuilderProps {
  conditions: AuctionCondition[];
  onChange: (conditions: AuctionCondition[]) => void;
}

export default function ConditionsBuilder({ conditions, onChange }: ConditionsBuilderProps) {
  const [type, setType] = useState<AuctionCondition['type']>('min_stickers');
  const [numValue, setNumValue] = useState('2');
  const [country, setCountry] = useState('ARG');
  const [stickerNum, setStickerNum] = useState('');

  const remove = (i: number) => onChange(conditions.filter((_, idx) => idx !== i));

  const add = () => {
    let next: AuctionCondition | null = null;

    if (type === 'min_stickers') {
      const n = parseInt(numValue, 10);
      if (isNaN(n) || n < 1) return;
      next = { type: 'min_stickers', value: n };
    } else if (type === 'country') {
      next = { type: 'country', value: country };
    } else if (type === 'specific_sticker') {
      const n = parseInt(stickerNum, 10);
      if (isNaN(n) || n < 1) return;
      next = { type: 'specific_sticker', value: n };
    }

    if (!next) return;
    // Si ya existe el mismo type, reemplazar
    const exists = conditions.some((c) => c.type === next!.type);
    onChange(exists ? conditions.map((c) => (c.type === next!.type ? next! : c)) : [...conditions, next]);
  };

  const valueInput = () => {
    if (type === 'min_stickers') {
      return (
        <input
          type="number" min={1} max={20} value={numValue}
          onChange={(e) => setNumValue(e.target.value)}
          className="w-20 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        />
      );
    }
    if (type === 'country') {
      return (
        <select
          aria-label="País"
          value={country} onChange={(e) => setCountry(e.target.value)}
          className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        >
          {WC_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      );
    }
    if (type === 'specific_sticker') {
      return (
        <input
          type="number" min={1} placeholder="Nº" value={stickerNum}
          onChange={(e) => setStickerNum(e.target.value)}
          className="w-24 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        />
      );
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Condiciones agregadas */}
      {conditions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {conditions.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/30 text-xs font-medium text-primary">
              {conditionLabel(c)}
              <button
                type="button" onClick={() => remove(i)}
                className="w-3.5 h-3.5 rounded-full bg-primary/20 hover:bg-secondary/30 hover:text-secondary flex items-center justify-center transition-all"
                aria-label="Eliminar"
              >
                <svg viewBox="0 0 8 8" fill="none" className="w-2 h-2">
                  <path d="M1 1l6 6M7 1 1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Fila para agregar */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          aria-label="Tipo de condición"
          value={type} onChange={(e) => setType(e.target.value as AuctionCondition['type'])}
          className="flex-1 min-w-[180px] bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
        >
          {CONDITION_TYPES.map(({ type: t, label }) => <option key={t} value={t}>{label}</option>)}
        </select>
        {valueInput()}
        <button
          type="button" onClick={add}
          className="px-3 py-2 rounded-lg border border-primary/50 text-primary text-sm font-medium hover:bg-primary/10 active:scale-95 transition-all duration-150 shrink-0"
        >
          + Agregar
        </button>
      </div>

      {conditions.length === 0 && (
        <p className="text-[0.65rem] text-muted">Sin condiciones — se acepta cualquier oferta válida.</p>
      )}
    </div>
  );
}
