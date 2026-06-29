import { useState } from 'react';
import type { Sticker } from '../../types/auction';
import { useAuth } from '../../auth/useAuth';
import { mapFiguritaToSticker } from '../../services/auctionService';
import { getApiErrorMessage } from '../../services/errors';
import api from '../../services/api';
import AuctionCard from './components/AuctionCard';
import AuctionDetailModal from './components/AuctionDetailModal';
import { useSubastasActivas, useOfertar, type SubastaResponseDTO } from '../../hooks/useSubastas';

const RED = '#D82D31';
const BLUE = '#03BAE9';

export default function SubastasActivasPage() {
  const { user } = useAuth();
  const { data: auctions = [], isLoading, isError } = useSubastasActivas();
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

  return (
    <div className="page-enter flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: RED }} />
        <h2 className="text-base font-bold text-text">Subastas activas</h2>
        <span
          className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ background: `${RED}15`, color: RED }}
        >
          {auctions.length}
        </span>
      </div>

      {auctions.length === 0 ? (
        <EmptyState
          title="No hay subastas activas"
          subtitle="Volvé más tarde o creá una nueva subasta."
          accentColor={BLUE}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {auctions.map(auction => (
            <AuctionCard 
              key={auction.id} 
              auction={auction} 
              onViewDetail={handleSelectAuction}
            />
          ))}
        </div>
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
          <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-text">{title}</p>
      <p className="text-xs text-muted max-w-xs">{subtitle}</p>
    </div>
  );
}

export function PageLoading({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-20 gap-2 text-muted text-sm">
      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
      {label}
    </div>
  );
}

export function PageError({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
      <p className="text-sm font-semibold" style={{ color: '#D82D31' }}>{message}</p>
      <p className="text-xs text-muted">Verificá que el servidor esté corriendo en localhost:8080.</p>
    </div>
  );
}