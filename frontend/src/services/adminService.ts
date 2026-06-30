import { apiFetch } from './api';

export interface PlatformStats {
  totalUsers: number;
  totalAuctions: number;
  activeAuctions: number;
  finishedAuctions: number;
  totalBids: number;
  auctionsWithBids: number;
  topBidders: { username: string; bids: number }[];
  topOwners: { username: string; auctions: number }[];
  recentActivity: RecentActivityItem[];
}

export interface RecentActivityItem {
  id: string;
  type: 'auction_created' | 'bid_placed' | 'auction_finished';
  description: string;
  timestamp: string;
}

export interface SeedResult {
  usuarios: number;
  figuritasBase: number;
  figuritas: number;
  solicitudes: number;
  intercambios: number;
  subastas: number;
  ofertas: number;
  sugerencias: number;
  notificaciones: number;
  calificaciones: number;
  protagonistaUsername: string;
  protagonistaPassword: string;
  adminUsername: string;
  adminPassword: string;
  mensaje: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const adminService = {
  async getStats(): Promise<PlatformStats> {
    return apiFetch<PlatformStats>('/admin/stats');
  },
  async seedDemo(): Promise<SeedResult> {
    return apiFetch<SeedResult>('/admin/seed-demo', { method: 'POST' });
  },
};
