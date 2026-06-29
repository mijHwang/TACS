import type { PropuestaVM } from '../../../types/dashboard';

const GREEN = '#05B15A';
const AMBER = '#D97706';

const ESTADO: Record<string, { label: string; color: string }> = {
  PENDIENTE: { label: 'Pend.', color: AMBER },
  ACEPTADO: { label: 'Acept.', color: GREEN },
  RECHAZADO: { label: 'Rech.', color: '#D82D31' },
};

export default function PropuestaEnviadaRow({ propuesta }: { propuesta: PropuestaVM }) {
  const est = ESTADO[propuesta.estado] ?? { label: propuesta.estado, color: '#6b7280' };
  return (
    <div className="flex items-center justify-between gap-2 py-2 border-b last:border-b-0" style={{ borderColor: '#f3f4f6' }}>
      <span className="text-xs text-gray-600 truncate">@{propuesta.contraparte} · {propuesta.pide}</span>
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ background: `${est.color}15`, color: est.color }}>
        {est.label}
      </span>
    </div>
  );
}
