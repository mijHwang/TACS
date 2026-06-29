import { useState } from 'react';
import type { Sticker, AuctionCondition } from '../../../types/auction';
import ConditionsBuilder from './ConditionsBuilder';

const DURATION_OPTIONS = [
  { label: '1 hora', hours: 1 },
  { label: '6 horas', hours: 6 },
  { label: '24 horas', hours: 24 },
  { label: '48 horas', hours: 48 },
];

interface CreateAuctionFormProps {
  myStickers: Sticker[];
  onSubmit: (stickerId: string, durationHours: number, conditions: AuctionCondition[]) => void;
  isSubmitting?: boolean;
}

export default function CreateAuctionForm({
  myStickers,
  onSubmit,
  isSubmitting = false,
}: CreateAuctionFormProps) {
  const [selectedSticker, setSelectedSticker] = useState<string>('');
  const [duration, setDuration] = useState<number>(24);
  const [conditions, setConditions] = useState<AuctionCondition[]>([]);
  const [previewNow, setPreviewNow] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSticker) return;
    onSubmit(selectedSticker, duration, conditions);
  };

  if (myStickers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-surface2 border border-border flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 text-muted">
            <path d="M19 11H5M19 11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2M19 11V9a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2" />
          </svg>
        </div>
        <p className="text-sm font-medium text-text">No tenés figuritas para subastar</p>
        <p className="text-xs text-muted max-w-xs">
          Necesitás tener figuritas repetidas en tu colección para poder crear una subasta.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* LEFT: Sticker selector */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-text uppercase tracking-wider">
            Figurita a subastar
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2 max-h-96 overflow-y-auto pr-1">
            {myStickers.map((sticker) => {
              const isSelected = selectedSticker === sticker.id;
              return (
                <button
                  key={sticker.id}
                  type="button"
                  onClick={() => { setSelectedSticker(sticker.id); setPreviewNow(Date.now()); }}
                  className={
                    `flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-150 ` +
                    (isSelected
                      ? 'border-primary/60 bg-primary/10 text-text shadow-[0_0_12px_rgba(60,172,59,0.2)]'
                      : 'border-border bg-surface2 text-muted hover:border-border/70 hover:text-text')
                  }
                >
                  <span className={`text-xl font-black leading-none ${isSelected ? 'text-primary' : 'text-text'}`}>
                    {sticker.number}
                  </span>
                  <span className="text-[0.65rem] font-medium truncate w-full text-center">
                    {sticker.playerName}
                  </span>
                  <span className="text-[0.6rem] text-muted">{sticker.country}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Duration, conditions, preview, submit */}
        <div className="flex flex-col gap-6">

          {/* Duration selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-text uppercase tracking-wider">
              Duración
            </label>
            <div className="flex gap-2 flex-wrap">
              {DURATION_OPTIONS.map(({ label, hours }) => (
                <button
                  key={hours}
                  type="button"
                  onClick={() => { setDuration(hours); setPreviewNow(Date.now()); }}
                  className={
                    `px-4 py-1.5 rounded-lg text-sm font-medium border transition-all duration-150 ` +
                    (duration === hours
                      ? 'bg-primary/15 text-primary border-primary/50'
                      : 'text-muted border-border hover:bg-surface2 hover:text-text')
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Condiciones mínimas */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text uppercase tracking-wider">
                Condiciones mínimas
              </label>
              {conditions.length > 0 && (
                <span className="text-[0.65rem] text-primary font-medium">
                  {conditions.length} {conditions.length !== 1 ? 'condiciones' : 'condición'}
                </span>
              )}
            </div>
            <ConditionsBuilder conditions={conditions} onChange={setConditions} />
          </div>

          {/* Preview */}
          {selectedSticker && previewNow > 0 && (() => {
            const s = myStickers.find((st) => st.id === selectedSticker)!;
            const end = new Date(previewNow + duration * 3600 * 1000);
            return (
              <div className="bg-surface2 border border-border rounded-lg px-4 py-3">
                <p className="text-[0.65rem] text-muted uppercase tracking-wider mb-1">Vista previa</p>
                <p className="text-sm text-text font-medium">
                  #{s.number} {s.playerName} · {s.country}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  Finaliza: {end.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              </div>
            );
          })()}

          <button
            type="submit"
            disabled={!selectedSticker || isSubmitting}
            className="bg-primary text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100"
          >
            {isSubmitting ? 'Publicando…' : 'Publicar subasta'}
          </button>
        </div>
      </div>
    </form>
  );
}
