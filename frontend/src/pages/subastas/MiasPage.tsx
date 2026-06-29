import { useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import AuctionCard from './components/AuctionCard';
import AuctionDetailModal from './components/AuctionDetailModal';
import Spinner from '../../components/Spinner';
import ErrorState from '../../components/ErrorState';
import { useMisSubastas, type SubastaResponseDTO } from '../../hooks/useSubastas';

const RED = '#D82D31';

// FIXED: Removed STATUS_LABELS and STATUS_COLOR since we can't determine complex status from DTO
// DTO only has estado: PENDIENTE, EN_CURSO, FINALIZADA

export default function SubastasMiasPage() {
  const { user } = useAuth();
  const { data: auctions = [], isLoading, isError, refetch } = useMisSubastas(user?.id);
  const [selected, setSelected] = useState<SubastaResponseDTO | null>(null);

  if (isLoading) return <Spinner label="Cargando tus subastas…" />;
  if (isError) return <ErrorState message="No se pudieron cargar tus subastas." onRetry={() => refetch()} />;

  const pending = auctions.filter(a => a.estado === 'PENDIENTE');
  const active = auctions.filter(a => a.estado === 'EN_CURSO');
  const finished = auctions.filter(a => a.estado === 'FINALIZADA');

  if (auctions.length === 0) {
    return (
      <div className="page-enter flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: `${RED}12`, border: `1.5px solid ${RED}30` }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="1.8" className="w-6 h-6">
            <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /><path d="m13 13 6 6" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-text">Todavía no creaste subastas</p>
        <p className="text-xs text-muted">Publicá una subasta desde la pestaña "+ Nueva".</p>
      </div>
    );
  }

  return (
    <div className="page-enter flex flex-col gap-6">
      {/* Encabezado de sección */}
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: RED }} />
        <h2 className="text-base font-bold text-text">Mis subastas</h2>
        <span
          className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ background: `${RED}15`, color: RED }}
        >
          {auctions.length}
        </span>
      </div>

      <div className="flex gap-2 flex-wrap -mt-2">
        {pending.length > 0 && (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: `${RED}15`, color: RED }}
          >
            Pendiente · {pending.length}
          </span>
        )}
        {active.length > 0 && (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: `${RED}15`, color: RED }}
          >
            En curso · {active.length}
          </span>
        )}
        {finished.length > 0 && (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: '#9ca3af15', color: '#9ca3af' }}
          >
            Finalizada · {finished.length}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {auctions.map(auction => (
          <AuctionCard 
            key={auction.id} 
            auction={auction} 
            onViewDetail={setSelected} 
          />
        ))}
      </div>

      {selected && (
        <AuctionDetailModal
          auction={selected}
          myStickers={[]} // TODO: Fetch user's stickers
          onClose={() => setSelected(null)}
          onBid={() => {}} // FIXED: Empty handler since you can't bid on your own auctions
          isSubmitting={false}
        />
      )}
    </div>
  );
}