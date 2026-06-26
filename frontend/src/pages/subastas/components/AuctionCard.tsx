// AuctionCard.tsx
import { useAuth } from '../../../auth/useAuth';

interface SubastaResponseDTO {
  id: string;
  usuarioId: string;
  usuarioUsername: string;
  figuritaId: string;
  figuritaNumero: number;
  figuritaJugadorNombre: string;
  figuritaSeleccionNombre: string;
  figuritaEquipoNombre: string;
  figuritaCategoriaNombre: string;
  estado: 'PENDIENTE' | 'EN_CURSO' | 'FINALIZADA';
  duracion: number;
  horaInicio: string;
  horaFin: string;
  ofertasCount: number;

  // NEW: Fields added to match the updated Java Backend DTO
  liderId: string | null;
  liderUsername: string;
  liderFiguritasNombres: string[];
}

interface AuctionCardProps {
  auction: SubastaResponseDTO;
  onViewDetail: (auction: SubastaResponseDTO) => void;
}

const RED = '#D82D31';
const BLUE = '#03BAE9';

const statusStyle: Record<string, { border: string; bg: string }> = {
  'EN_CURSO': { border: `${RED}30`, bg: 'white' },
  'PENDIENTE': { border: `${RED}30`, bg: 'white' },
  'FINALIZADA': { border: '#e5e7eb', bg: '#f9fafb' },
};

export default function AuctionCard({ auction, onViewDetail }: AuctionCardProps) {
  const { user } = useAuth();
  const isOwner = user?.username === auction.usuarioUsername;
  const style = statusStyle[auction.estado] ?? statusStyle['EN_CURSO'];
  const finished = auction.estado !== 'EN_CURSO';

  return (
    <article
      className="rounded-2xl p-4 flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
      style={{
        background: style.bg,
        border: `1.5px solid ${style.border}`,
        opacity: finished ? 0.75 : 1,
      }}
      onClick={() => onViewDetail(auction)}
      role="button" 
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onViewDetail(auction)}
    >
      {/* Header — badges */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isOwner && (
            <span
              className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
              style={{ background: `${RED}15`, color: RED }}
            >
              Mi subasta
            </span>
          )}
        </div>
      </div>

      {/* Figurita visual */}
      <div className="flex items-center justify-center py-2">
        <div
          className="w-16 h-20 rounded-xl flex flex-col items-center justify-center gap-1 select-none"
          style={{ background: `${RED}10`, border: `1.5px solid ${RED}25` }}
        >
          <span className="text-2xl font-black leading-none" style={{ color: RED }}>
            {auction.figuritaNumero}
          </span>
          <span className="text-[0.6rem] uppercase tracking-wider text-center px-1 leading-tight text-gray-500">
            {auction.figuritaSeleccionNombre}
          </span>
        </div>
      </div>

      {/* Info del jugador */}
      <div>
        <p className="text-[0.68rem] text-gray-400 uppercase tracking-widest mb-0.5 truncate">
          #{auction.figuritaNumero} · {auction.figuritaSeleccionNombre}
        </p>
        <h3 className="text-sm font-bold text-gray-800 leading-tight truncate">
          {auction.figuritaJugadorNombre}
        </h3>
      </div>

      {/* Footer — info */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
        <svg className="w-3 h-3 shrink-0" style={{ color: BLUE }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        </svg>
        <p className="text-xs text-gray-500 truncate">
          @{auction.usuarioUsername} · {auction.ofertasCount} oferta{auction.ofertasCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* NEW: Displays the winning leader box if active offers exist */}
      {auction.ofertasCount > 0 && auction.liderUsername && auction.liderUsername !== 'Nadie' && (
        <div 
          className="p-2.5 rounded-xl text-[0.7rem] flex flex-col gap-1.5 border mt-1"
          style={{ background: '#FFF9E6', borderColor: '#FFEAA7' }}
          onClick={(e) => e.stopPropagation()} // Prevents card opening when clicking on leader details directly
        >
          <div className="flex items-center gap-1 font-bold text-amber-900">
            <span>👑</span>
            <span className="uppercase tracking-wider text-[0.6rem] text-amber-800">Líder actual:</span>
            <span className="text-gray-900 font-semibold font-mono">@{auction.liderUsername}</span>
          </div>

          {auction.liderFiguritasNombres && auction.liderFiguritasNombres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {auction.liderFiguritasNombres.map((name, index) => (
                <span 
                  key={index} 
                  className="bg-white px-1.5 py-0.5 rounded border border-amber-200 text-amber-950 font-medium text-[0.62rem] shadow-sm max-w-full truncate"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}