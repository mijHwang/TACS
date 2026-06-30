import type { PropuestaVM } from '../../../types/dashboard';

const GREEN = '#05B15A';

interface Props {
  propuesta: PropuestaVM;
  onAceptar: (id: string) => void;
  onRechazar: (id: string) => void;
}

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente', ACEPTADO: 'Aceptada', RECHAZADO: 'Rechazada',
};

export default function PropuestaRecibidaCard({ propuesta, onAceptar, onRechazar }: Props) {
  const pendiente = propuesta.estado === 'PENDIENTE';
  return (
    <div className="flex-none w-60 rounded-2xl p-4 bg-white flex flex-col gap-2" style={{ border: `1.5px solid ${GREEN}30` }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-800 truncate">@{propuesta.contraparte}</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${GREEN}15`, color: GREEN }}>
          {ESTADO_LABEL[propuesta.estado] ?? propuesta.estado}
        </span>
      </div>
      <p className="text-xs text-gray-500 truncate">Te ofrece: {propuesta.ofrece.join(', ') || '—'}</p>
      <p className="text-xs text-gray-500 truncate">Quiere: {propuesta.pide}</p>
      {pendiente && (
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={() => onAceptar(propuesta.id)}
            className="flex-1 text-xs font-bold text-white rounded-lg py-1.5 cursor-pointer hover:opacity-90"
            style={{ background: GREEN }}
          >
            Aceptar
          </button>
          <button
            type="button"
            onClick={() => onRechazar(propuesta.id)}
            className="flex-1 text-xs font-bold rounded-lg py-1.5 cursor-pointer border hover:opacity-80"
            style={{ color: '#6b7280', borderColor: '#e5e7eb' }}
          >
            Rechazar
          </button>
        </div>
      )}
    </div>
  );
}
