import { useState, useEffect } from 'react';
import type { Sticker } from '../../types/auction';
import { useAuth } from '../../auth/useAuth';
import { mapFiguritaToSticker } from '../../services/auctionService';
import { getApiErrorMessage } from '../../services/errors';
import api from '../../services/api';
import AuctionCard from './components/AuctionCard';
import AuctionDetailModal from './components/AuctionDetailModal';
import { PageLoading, PageError } from './ActivasPage';

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
  liderId: string | null;
  liderUsername: string;
  liderFiguritasNombres: string[];
}

const RED = '#D82D31';
const BLUE = '#03BAE9';

export default function ParticipandoPage() {
  const { user } = useAuth();
  const [auctions, setAuctions] = useState<SubastaResponseDTO[]>([]);
  const [loading, setLoading] = useState(Boolean(user?.id));
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SubastaResponseDTO | null>(null);
  
  const [bidFormStickers, setBidFormStickers] = useState<Sticker[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingStickers, setFetchingStickers] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    
    api.get(`/api/subastas/participando/${user.id}`)
      .then(res => {
        setAuctions(res.data);
      })
      .catch(() => setError('No se pudieron cargar las subastas.'))
      .finally(() => setLoading(false));
  }, [user?.id]);

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

  // CHANGED: Fixed body field key mapping and decoupled validation failures from global error page unmounts
  const handleBid = async (auctionId: string, stickerIds: string[]) => {
    if (!user) return;
    setSubmitting(true);
    try {
      await api.post(`/api/subastas/${auctionId}/ofertar`, { 
        usuarioId: user.id,
        figuritaIds: stickerIds // FIXED: Property matches backend expectations perfectly now
      });
      
      const res = await api.get(`/api/subastas/participando/${user.id}`);
      setAuctions(res.data);
      setSelected(null);
      setBidFormStickers([]);
    } catch (err: unknown) {
      console.error('Error placing bid:', err);
      alert(getApiErrorMessage(err, 'Error al enviar la oferta.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoading label="Cargando subastas…" />;
  if (error) return <PageError message={error} />;

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
          isSubmitting={submitting}
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