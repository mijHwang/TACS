import { useState } from 'react';
import { adminService, type SeedResult } from '../../../services/adminService';

const RED = '#D82D31';

interface Props {
  onDone?: () => void;
  onSeed?: () => Promise<SeedResult>;
}

export default function SeedDemoCard({ onDone, onSeed = () => adminService.seedDemo() }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const close = () => { setOpen(false); setConfirmText(''); setError(null); };

  const run = async () => {
    setLoading(true); setError(null);
    try {
      const res = await onSeed();
      setResult(res);
      setOpen(false); setConfirmText('');
      onDone?.();
    } catch {
      setError('Falló el reset/seed. Revisá la conexión y que seas admin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className="bg-surface rounded-2xl p-5"
      style={{ border: `1.5px solid ${RED}30` }}
    >
      <h2 className="text-sm font-bold text-text uppercase tracking-wider" style={{ color: RED }}>
        Mantenimiento de datos
      </h2>
      <p className="text-xs text-muted mt-1 mb-4">
        Borra TODA la base y carga una cohorte de prueba (~12 usuarios). Acción destructiva.
      </p>

      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 font-bold rounded-lg text-white hover:opacity-90 transition-opacity"
        style={{ background: RED }}
      >
        Resetear base y cargar datos de demo
      </button>

      {result && (
        <div className="mt-4 p-3 rounded-lg text-xs" style={{ background: `${RED}15`, color: RED }}>
          <p className="font-bold">{result.mensaje}</p>
          <p className="mt-1 text-text">
            {result.usuarios} usuarios · {result.figuritas} figuritas · {result.solicitudes} propuestas ·{' '}
            {result.subastas} subastas · {result.ofertas} ofertas · {result.sugerencias} sugerencias ·{' '}
            {result.notificaciones} notificaciones
          </p>
          <p className="mt-1 text-text">
            Login protagonista: <b>{result.protagonistaUsername}</b> / {result.protagonistaPassword}
          </p>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full mx-4 border border-border">
            <h3 className="text-lg font-bold text-text">¿Resetear toda la base?</h3>
            <p className="text-xs text-muted mt-2">
              Esto borra <b>todos</b> los datos (incluida la base de producción, que es compartida) y
              carga la cohorte de demo. Escribí <b>RESET</b> para confirmar.
            </p>
            <input
              type="text"
              placeholder="Escribí RESET"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full p-2 mt-3 bg-surface border border-border rounded-lg text-text"
            />
            {error && <p className="text-xs mt-2" style={{ color: RED }}>{error}</p>}
            <div className="flex gap-2 mt-4 justify-end">
              <button
                onClick={close}
                disabled={loading}
                className="px-3 py-2 text-sm rounded-lg border border-border text-text"
              >
                Cancelar
              </button>
              <button
                onClick={run}
                disabled={confirmText !== 'RESET' || loading}
                aria-label="Confirmar reset"
                className="px-3 py-2 text-sm font-bold rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: RED }}
              >
                {loading ? 'Reseteando…' : 'Confirmar reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
