import React from 'react';

const BLUE  = '#03BAE9';
const RED   = '#D82D31';
const GREEN = '#05B15A';

export type TxType = 'intercambio' | 'subasta' | 'subasta-mia' | 'oferta';

export interface TxDetailIntercambio {
  type: 'intercambio';
  given: string[];
  received: string[];
}

export interface TxDetailSubasta {
  type: 'subasta';
  myOffer: string[];
  received: string;
}

export interface TxDetailSubastaMia {
  type: 'subasta-mia';
  mySticker: string;
  winnerOffer: string[];
}

export interface TxDetailOferta {
  type: 'oferta';
  given: string[];
  received: string[];
}

export type TxDetail = TxDetailIntercambio | TxDetailSubasta | TxDetailSubastaMia | TxDetailOferta;

export interface Transaction {
  id: string;
  type: TxType;
  user: string;
  date: string;
  isoDate: string;
  stickers: string[];
  detail: TxDetail;
}

const MAX_STICKERS_VISIBLE = 2;

export function stickersLabel(stickers: string[]): string {
  if (stickers.length <= MAX_STICKERS_VISIBLE) return stickers.join(', ');
  return stickers.slice(0, MAX_STICKERS_VISIBLE).join(', ') + ` y ${stickers.length - MAX_STICKERS_VISIBLE} más...`;
}

export const TX_CONFIG: Record<TxType, { label: string; color: string; icon: React.ReactNode }> = {
  intercambio: {
    label: 'Intercambio',
    color: BLUE,
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
      </svg>
    ),
  },
  subasta: {
    label: 'Subasta (participé)',
    color: RED,
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /><path d="m13 13 6 6" />
      </svg>
    ),
  },
  'subasta-mia': {
    label: 'Mi subasta',
    color: '#F59E0B',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  oferta: {
    label: 'Oferta aceptada',
    color: GREEN,
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
};

// ── DTOs from backend ─────────────────────────────────────────────────────────

export interface IntercambioResponseDTO {
  id: string;
  usuarioGeneradorId: string;
  usuarioGeneradorUsername: string;
  usuarioIntercambiadorId: string;
  usuarioIntercambiadorUsername: string;
  figuritaId: string;
  figuritaNombre: string;
  figuritasIntercambiadasNombres: string[];
  fecha: string;
  puntajeGenerador: number | null;
  puntajeIntercambiador: number | null;
}

export interface SubastaResponseDTO {
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
  liderUsername: string | null;
  liderFiguritasNombres: string[];
}

// ── Mappers ───────────────────────────────────────────────────────────────────

export function mapIntercambioToTransaction(
  intercambio: IntercambioResponseDTO,
  userId: string
): Transaction {
  const soyGenerador = intercambio.usuarioGeneradorId === userId;
  const otroUsername = soyGenerador
    ? intercambio.usuarioIntercambiadorUsername
    : intercambio.usuarioGeneradorUsername;

  const dado = soyGenerador
    ? intercambio.figuritasIntercambiadasNombres
    : [intercambio.figuritaNombre];

  const recibido = soyGenerador
    ? [intercambio.figuritaNombre]
    : intercambio.figuritasIntercambiadasNombres;

  const fecha = new Date(intercambio.fecha);

  return {
    id: intercambio.id,
    type: 'intercambio',
    user: otroUsername,
    date: fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }),
    isoDate: intercambio.fecha.slice(0, 10),
    stickers: [...dado, ...recibido],
    detail: {
      type: 'intercambio',
      given: dado,
      received: recibido,
    },
  };
}

export function mapSubastaToTransaction(
  subasta: SubastaResponseDTO,
  userId: string
): Transaction | null {
  if (subasta.estado !== 'FINALIZADA') return null;

  const stickerSubastado = `${subasta.figuritaJugadorNombre} #${subasta.figuritaNumero}`;
  const fecha = new Date(subasta.horaFin);
  const dateStr = fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
  const isoDate = subasta.horaFin.slice(0, 10);

  // My auction — someone won it
  if (subasta.usuarioId === userId && subasta.liderId && subasta.liderId !== userId) {
    return {
      id: subasta.id,
      type: 'subasta-mia',
      user: subasta.liderUsername ?? 'Desconocido',
      date: dateStr,
      isoDate,
      stickers: [stickerSubastado],
      detail: {
        type: 'subasta-mia',
        mySticker: stickerSubastado,
        winnerOffer: subasta.liderFiguritasNombres ?? [],
      },
    };
  }

  // I won someone else's auction
  if (subasta.liderId === userId && subasta.usuarioId !== userId) {
    return {
      id: subasta.id,
      type: 'subasta',
      user: subasta.usuarioUsername,
      date: dateStr,
      isoDate,
      stickers: [stickerSubastado, ...(subasta.liderFiguritasNombres ?? [])],
      detail: {
        type: 'subasta',
        myOffer: subasta.liderFiguritasNombres ?? [],
        received: stickerSubastado,
      },
    };
  }

  return null;
}