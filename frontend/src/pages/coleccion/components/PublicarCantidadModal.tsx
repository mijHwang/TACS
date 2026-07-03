import { useEffect, useState } from 'react';

const RED = '#D82D31'; // primary — misma acción que el botón "Publicar Intercambio"

interface Props {
  jugadorNombre: string;
  /** Máximo publicable = copias que tiene el usuario (count). */
  max: number;
  busy?: boolean;
  onConfirm: (cantidad: number) => void;
  onClose: () => void;
}

/**
 * Mini-modal para elegir cuántas copias publicar para intercambio (1..max).
 * Reemplaza el viejo `askQuantity` (window.prompt + alert): el padre corre el POST
 * y muestra los toasts de éxito/error. Cierra con ✕, Cancelar, click afuera o Escape.
 */
export default function PublicarCantidadModal({ jugadorNombre, max, busy, onConfirm, onClose }: Props) {
  const [cantidad, setCantidad] = useState(1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const confirm = () => { if (!busy) onConfirm(cantidad); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-2xl border border-border w-full max-w-sm flex flex-col p-6"
        style={{ borderColor: `${RED}30` }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Enter') confirm(); }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text">Publicar para intercambio</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-muted hover:text-text text-xl leading-none">✕</button>
        </div>

        <p className="text-sm font-bold text-text truncate">{jugadorNombre}</p>
        <p className="text-xs text-muted mb-4">¿Cuántas copias querés publicar? (máximo {max})</p>

        <div className="flex items-center justify-center gap-4">
          <button
            type="button" aria-label="Restar una copia"
            onClick={() => setCantidad((c) => Math.max(1, c - 1))}
            disabled={cantidad <= 1}
            className="w-9 h-9 rounded-md border border-border text-text text-lg leading-none flex items-center justify-center hover:bg-surface2 disabled:opacity-40"
          >−</button>
          <span data-testid="cantidad" className="min-w-8 text-center text-xl font-semibold text-text">{cantidad}</span>
          <button
            type="button" aria-label="Sumar una copia"
            onClick={() => setCantidad((c) => Math.min(max, c + 1))}
            disabled={cantidad >= max}
            className="w-9 h-9 rounded-md border border-border text-text text-lg leading-none flex items-center justify-center hover:bg-surface2 disabled:opacity-40"
          >+</button>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button" onClick={onClose}
            className="h-9 px-3 text-sm rounded-md border border-border text-muted hover:text-text"
          >Cancelar</button>
          <button
            type="button" onClick={confirm} disabled={busy}
            className="h-9 px-4 text-sm font-semibold rounded-md text-white disabled:opacity-40"
            style={{ background: RED }}
          >
            {busy ? 'Publicando…' : `Publicar ${cantidad} ${cantidad === 1 ? 'copia' : 'copias'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
