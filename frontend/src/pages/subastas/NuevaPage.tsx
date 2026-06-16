import { useState, useEffect } from 'react';
import type { AuctionCondition, Sticker } from '../../types/auction';
import CreateAuctionForm from './components/CreateAuctionForm';
import { auctionService } from '../../services/auctionService';
import { useAuth } from '../../auth/useAuth';
import api from '../../services/api';
import { MOCK_MY_STICKERS } from '../../data/mockAuctions';

const RED = '#D82D31';
const GREEN = '#05B15A';

export default function SubastasNuevaPage() {
  const { user } = useAuth();
  const [myStickers, setMyStickers] = useState<Sticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // FETCH REAL STICKERS
  useEffect(() => {
    if (!user?.username) { setLoading(false); return; }
    api.get(`/api/usuarios/${user.username}/figuritas/repetidas`)
      .then(res => {
        setMyStickers(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('No se pudieron cargar tus figuritas repetidas.');
        setLoading(false);
      });
  }, [user?.username]);

  const handleSubmit = async (stickerId: string, durationHours: number, conditions: AuctionCondition[]) => {
    if (!user) return;

    const stickersList = myStickers.length > 0 ? myStickers : MOCK_MY_STICKERS;
    const sticker = stickersList.find(s => s.id === stickerId);
    if (!sticker) return;

    setSubmitting(true);
    setError(null);
    try {
      await auctionService.create({ sticker, durationHours, conditions, userId: user.id, username: user.username });
      setSuccess(true);
    } catch {
      setError('No se pudo publicar la subasta. Verificá que el servidor esté corriendo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-muted">Cargando figuritas...</p>;

  if (success) {
    return (
      <div className="page-enter flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: `${GREEN}15`, border: `1.5px solid ${GREEN}40` }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="1.8" className="w-6 h-6">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <p className="text-base font-bold text-gray-900">¡Subasta publicada!</p>
        <p className="text-xs text-gray-400 max-w-xs">
          Ya está activa. La encontrás en "Activas" o "Mis Subastas".
        </p>
        <button
          className="mt-2 border border-gray-200 text-gray-700 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150 hover:border-gray-300 hover:shadow-sm"
          onClick={() => { setSuccess(false); setError(null); }}
        >
          Crear otra subasta
        </button>
      </div>
    );
  }

  return (
    <div className="page-enter w-full flex flex-col gap-4">
      {/* Encabezado */}
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: RED }} />
        <h2 className="text-base font-bold text-gray-900">Nueva subasta</h2>
      </div>

      {error && (
        <p
          className="text-xs rounded-xl px-4 py-2.5 border"
          style={{ color: RED, background: `${RED}10`, borderColor: `${RED}30` }}
        >
          {error}
        </p>
      )}
      <CreateAuctionForm
  myStickers={myStickers}  // ✅ Only real stickers
  onSubmit={handleSubmit}
  isSubmitting={submitting}
/>
    </div>
  );
}