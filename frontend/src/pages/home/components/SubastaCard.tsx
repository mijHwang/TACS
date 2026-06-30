import CountdownBadge from '../../subastas/components/CountdownBadge';

const AMBER = '#D82D31';

interface Props {
  figurita: string;
  propietario: string;
  ofertasCount: number;
  tiempoRestante?: string;
  endTime?: string;
  esMia: boolean;
  etiqueta?: string;
}

export default function SubastaCard({ figurita, propietario, ofertasCount, tiempoRestante, endTime, esMia, etiqueta }: Props) {
  const label = etiqueta ?? (esMia ? 'Mi subasta' : 'Activa');
  return (
    <div
      className="flex-none w-48 rounded-2xl p-4 bg-white flex flex-col gap-3 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
      style={{ border: `1.5px solid ${AMBER}30` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${AMBER}15`, color: AMBER }}>
          {label}
        </span>
        {endTime ? (
          <CountdownBadge endTime={endTime} />
        ) : (
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3" style={{ color: AMBER }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            <span className="text-xs font-semibold" style={{ color: AMBER }}>{tiempoRestante}</span>
          </div>
        )}
      </div>

      <div className="w-full h-16 rounded-xl flex items-center justify-center text-2xl font-black" style={{ background: `${AMBER}10`, color: AMBER }}>
        🃏
      </div>

      <div>
        <p className="text-xs font-bold text-gray-800 leading-tight truncate">{figurita}</p>
        <p className="text-xs text-gray-400 mt-0.5">@{propietario}</p>
      </div>

      <div className="flex items-center gap-1">
        <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
        </svg>
        <span className="text-xs text-gray-500">{ofertasCount} {ofertasCount === 1 ? 'oferta' : 'ofertas'}</span>
      </div>
    </div>
  );
}
