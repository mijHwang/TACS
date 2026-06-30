import type { ReactNode } from 'react';
import type { AlertaVM, AlertaTipoUI } from '../../../types/dashboard';

const COLORS: Record<AlertaTipoUI, string> = {
  propuesta: '#05B15A', subasta: '#D82D31', intercambio: '#05B15A', sistema: '#03BAE9',
};

const ICONS: Record<AlertaTipoUI, ReactNode> = {
  propuesta: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  subasta: <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />,
  intercambio: <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />,
  sistema: <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
};

export default function NovedadesList({ alertas }: { alertas: AlertaVM[] }) {
  if (alertas.length === 0) {
    return <p className="text-sm text-gray-400">No tenés novedades sin leer.</p>;
  }
  return (
    <div className="rounded-2xl bg-white px-4" style={{ border: '1.5px solid #03BAE930' }}>
      {alertas.map((a) => {
        const color = COLORS[a.tipo];
        return (
          <div key={a.id} className="flex items-center gap-3 py-2.5 border-b last:border-b-0" style={{ borderColor: '#f3f4f6' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15`, color }}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{ICONS[a.tipo]}</svg>
            </div>
            <span className="text-sm text-gray-700 flex-1 truncate">{a.texto}</span>
            <span className="text-xs text-gray-400 shrink-0">{a.tiempo}</span>
          </div>
        );
      })}
    </div>
  );
}
