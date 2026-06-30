import { useState } from 'react';
import type { Sticker } from '../../types/auction';
import { useAuth } from '../../auth/useAuth';
import { mapFiguritaToSticker } from '../../services/auctionService';
import { getApiErrorMessage } from '../../services/errors';
import api from '../../services/api';
import AuctionCard from './components/AuctionCard';
import AuctionDetailModal from './components/AuctionDetailModal';
import { useSubastasParticipando, useOfertar, type SubastaResponseDTO } from '../../hooks/useSubastas';
import Spinner from '../../components/Spinner';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import Paginador from '../../components/Paginador';
import ListToolbar from '../../components/ListToolbar';
import PageSizeSelector from '../../components/PageSizeSelector';
import { usePageSize } from '../../hooks/usePageSize';

const RED = '#D82D31';
const BLUE = '#03BAE9';

export default function ParticipandoPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const { pageSize, setPageSize, options } = usePageSize();
  const { data, isLoading, isError, refetch } = useSubastasParticipando(user?.id, page, pageSize);
  const auctions = data?.content ?? [];
  const ofertar = useOfertar();
  const [selected, setSelected] = useState<SubastaResponseDTO | null>(null);

  const [bidFormStickers, setBidFormStickers] = useState<Sticker[]>([]);
  const [fetchingStickers, setFetchingStickers] = useState(false);

  const handleSelectAuction = async (auction: SubastaResponseDTO) => {
    setSelected(auction);

    if (user?.username) {
      setFetchingStickers(true);
      try {
        const res = await api.get(`/api/usuarios/${user.username}/figuritas/repetidas`, { params: { page: 0, size: 2000 } });
        const mapped = res.data.content.map(mapFiguritaToSticker);
        setBidFormStickers(mapped);
      } catch (err) {
        console.error('Error fetching stickers:', err);
        setBidFormStickers([]);
      } finally {
        setFetchingStickers(false);
      }
    }
  };

  const handleBid = (auctionId: string, stickerIds: string[]) => {
    if (!user) return;
    ofertar.mutate(
      { auctionId, usuarioId: user.id, figuritaIds: stickerIds },
      {
        onSuccess: () => {
          setSelected(null);
          setBidFormStickers([]);
        },
      },
    );
  };

  if (isLoading) return <Spinner label="Cargando subastas…" />;
  if (isError) return <ErrorState message="No se pudieron cargar las subastas." onRetry={() => refetch()} />;

  const active = auctions.filter(a => a.estado === 'EN_CURSO');
  const finished = auctions.filter(a => a.estado !== 'EN_CURSO');

  return (
    <div className="page-enter flex flex-col gap-8">
      <ListToolbar total={data?.totalElements ?? 0}>
        <PageSizeSelector value={pageSize} options={options} onChange={(n) => { setPageSize(n); setPage(0); }} />
      </ListToolbar>
      {auctions.length === 0 && (
        <EmptyState
          title="No estás participando en ninguna subasta"
          subtitle="Hacé una oferta en una subasta activa para verla acá."
          accentColor={BLUE}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="1.8" className="w-6 h-6" aria-hidden="true">
              <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
            </svg>
          }
        />
      )}
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

      <Paginador page={page} totalPages={data?.totalPages ?? 0} onChange={setPage} />

      {selected && (
        <AuctionDetailModal
          auction={selected}
          myStickers={bidFormStickers}
          onClose={() => { setSelected(null); setBidFormStickers([]); ofertar.reset(); }}
          onBid={handleBid}
          isSubmitting={ofertar.isPending}
          isFetchingStickers={fetchingStickers}
          errorMessage={ofertar.isError ? getApiErrorMessage(ofertar.error, 'Error al enviar la oferta.') : null}
        />
      )}
    </div>
  );
}
