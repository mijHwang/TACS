import { useState } from 'react';
import type { Sticker } from '../../types/auction';
import { useAuth } from '../../auth/useAuth';
import { mapFiguritaToSticker } from '../../services/auctionService';
import { getApiErrorMessage } from '../../services/errors';
import api from '../../services/api';
import AuctionCard from './components/AuctionCard';
import AuctionDetailModal from './components/AuctionDetailModal';
import { PageLoading, PageError } from './ActivasPage';
import { useSubastasParticipando, useOfertar, type SubastaResponseDTO } from '../../hooks/useSubastas';

const RED = '#D82D31';
const BLUE = '#03BAE9';

export default function ParticipandoPage() {
  const { user } = useAuth();
  const { data: auctions = [], isLoading, isError } = useSubastasParticipando(user?.id);
  const ofertar = useOfertar();
  const [selected, setSelected] = useState<SubastaResponseDTO | null>(null);

  const [bidFormStickers, setBidFormStickers] = useState<Sticker[]>([]);
  const [fetchingStickers, setFetchingStickers] = useState(false);

  const handleSelectAuction = async (auction: SubastaResponseDTO) => {
    setSelected(auction);
    
    if (user?.username) {
      setFetchingStickers(true);
      try {
        const res = await api.get(`/api/usuarios/${user.username}/figuritas/repetidas`);
        const mapped = res.data.map(mapFiguritaToSticker);
        setBidFormStickers(mapped);
      } catch (err) {
        console.error('Error fetching stickers:', err);
        setBidFormStickers([]);
      } finally {
        setFetchingStickers(false);
      }
    }
  };

  const handleBid = async (auctionId: string, stickerIds: string[]) => {
    if (!user) return;
    try {
      await ofertar.mutateAsync({ auctionId, usuarioId: user.id, figuritaIds: stickerIds });
      setSelected(null);
      setBidFormStickers([]);
    } catch (err: unknown) {
      console.error('Error placing bid:', err);
      alert(getApiErrorMessage(err, 'Error al enviar la oferta.'));
    }
  };

  if (isLoading) return <PageLoading label="Cargando subastas…" />;
  if (isError) return <PageError message="No se pudieron cargar las subastas." />;

  const active = auctions.filter(a => a.estado === 'EN_CURSO');
  const finished = auctions.filter(a => a.estado !== 'EN_CURSO');

  if (auctions.length === 0) {
    return (
      <EmptyState
        title="No estás participando en ninguna subasta"
        subtitle="Hacé una oferta en una subasta activa para verla acá."
        accentColor={BLUE}
      />
    );
  }

  return (
    <div className="page-enter flex flex-col gap-8">
      {active.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: RED }} />
            <h2 className="text-base font-bold text-text">En curso</h2>
            <span
              className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: `${RED}15`, color: RED }}
            >
              {active.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {active.map(auction => (
              <AuctionCard
                key={auction.id}
                auction={auction}
                onViewDetail={handleSelectAuction}
              />
            ))}
          </div>
        </section>
      )}

      {finished.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-300 shrink-0" />
            <h2 className="text-base font-bold text-text">Finalizadas</h2>
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500">
              {finished.length}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {finished.map(auction => (
              <AuctionCard
                key={auction.id}
                auction={auction}
                onViewDetail={handleSelectAuction}
              />
            ))}
          </div>
        </section>
      )}

      {selected && (
        <AuctionDetailModal
          auction={selected}
          myStickers={bidFormStickers}
          onClose={() => {
            setSelected(null);
            setBidFormStickers([]);
          }}
          onBid={handleBid}
          isSubmitting={ofertar.isPending}
          isFetchingStickers={fetchingStickers}
        />
      )}
    </div>
  );
}

function EmptyState({ title, subtitle, accentColor }: { title: string; subtitle: string; accentColor: string; }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: `${accentColor}12`, border: `1.5px solid ${accentColor}30` }}>
        <svg viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.8" className="w-6 h-6">
          <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-text">{title}</p>
      <p className="text-xs text-muted max-w-xs">{subtitle}</p>
    </div>
  );
}