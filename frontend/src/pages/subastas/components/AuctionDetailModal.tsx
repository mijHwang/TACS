// AuctionDetailModal.tsx
import { useEffect } from 'react';
import { useAuth } from '../../../auth/useAuth';
import type { Sticker } from '../../../types/auction';
import CountdownBadge from './CountdownBadge';
import BidForm from './BidForm';

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

interface AuctionDetailModalProps {
  auction: SubastaResponseDTO;
  myStickers: Sticker[];
  onClose: () => void;
  onBid: (auctionId: string, stickerIds: string[]) => void;
  isSubmitting?: boolean;
  isFetchingStickers?: boolean;
  errorMessage?: string | null;
}

export default function AuctionDetailModal({
  auction,
  myStickers,
  onClose,
  onBid,
  isSubmitting = false,
  isFetchingStickers = false,
  errorMessage = null,
}: AuctionDetailModalProps) {
  const { user } = useAuth();
  const isOwner = user?.username === auction.usuarioUsername;
  const isActive = auction.estado === 'EN_CURSO';
  const canBid = isActive && !isOwner;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease]"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh] animate-[slideUp_0.2s_ease] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <p className="text-[0.7rem] text-muted uppercase tracking-widest mb-0.5">
              #{auction.figuritaNumero} · {auction.figuritaSeleccionNombre}
            </p>
            <h2 className="text-lg font-semibold text-text">{auction.figuritaJugadorNombre}</h2>
          </div>
          <button
            onClick={onClose} 
            aria-label="Cerrar"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-text hover:bg-surface2 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 flex flex-col gap-5">

          {/* Dueño + tiempo */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted mb-0.5">Publicada por</p>
              <p className="text-sm font-medium text-text">@{auction.usuarioUsername}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <p className="text-[0.65rem] text-muted uppercase tracking-wider">Tiempo restante</p>
              <CountdownBadge endTime={auction.horaFin} />
            </div>
          </div>

          {/* Información de la subasta */}
          <div className="bg-surface2 border border-border rounded-lg px-4 py-3 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[0.65rem] text-muted uppercase tracking-wider mb-1">Equipo</p>
              <p className="text-sm text-text font-medium">{auction.figuritaEquipoNombre}</p>
            </div>
            <div>
              <p className="text-[0.65rem] text-muted uppercase tracking-wider mb-1">Categoría</p>
              <p className="text-sm text-text font-medium">{auction.figuritaCategoriaNombre}</p>
            </div>
          </div>

          {/* Ofertas actual + Leaderboard Block */}
          <div className="bg-surface2 border border-border rounded-lg px-4 py-3 flex flex-col gap-2.5">
            <div>
              <p className="text-[0.65rem] text-muted uppercase tracking-wider mb-1">Ofertas recibidas</p>
              <p className="text-sm font-semibold text-text">
                {auction.ofertasCount} oferta{auction.ofertasCount !== 1 ? 's' : ''}
              </p>
            </div>

            {/* NEW: Live leader tracking added directly inside the modal panel */}
            {auction.ofertasCount > 0 && auction.liderUsername && auction.liderUsername !== 'Nadie' && (
              <div 
                className="p-2.5 rounded-xl text-[0.7rem] flex flex-col gap-1.5 border"
                style={{ background: '#FFF9E6', borderColor: '#FFEAA7' }}
              >
                <div className="flex items-center gap-1 font-bold text-amber-900">
                  <span>👑</span>
                  <span className="uppercase tracking-wider text-[0.6rem] text-amber-800">Líder de la puja:</span>
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
          </div>

          {/* BidForm */}
          {canBid && (
            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold text-text mb-3">Hacer una oferta</p>
              {isFetchingStickers ? (
                <p className="text-xs text-muted text-center py-3">Cargando figuritas…</p>
              ) : myStickers.length > 0 ? (
                <>
                  {errorMessage && (
                    <p className="text-xs font-semibold text-center" style={{ color: '#D82D31' }}>
                      {errorMessage}
                    </p>
                  )}
                  <BidForm
                    myStickers={myStickers}
                    conditions={[]}
                    onBid={(ids) => onBid(auction.id, ids)}
                    isSubmitting={isSubmitting}
                  />
                </>
              ) : (
                <p className="text-xs text-muted text-center py-3">
                  No tenés figuritas disponibles para ofertar.
                </p>
              )}
            </div>
          )}

          {/* Status messages */}
          {isOwner && isActive && (
            <p className="text-xs text-muted text-center py-2">Esta es tu subasta — no podés ofertar.</p>
          )}
          {!isActive && (
            <p className="text-xs text-muted text-center py-2">
              {auction.estado === 'FINALIZADA' ? 'Esta subasta ya finalizó.' : 'Esta subasta está pendiente.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}