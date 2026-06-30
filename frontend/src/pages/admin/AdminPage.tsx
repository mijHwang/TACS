import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService, type PlatformStats } from '../../services/adminService';
import Spinner from '../../components/Spinner';
import ErrorState from '../../components/ErrorState';
import SeedDemoCard from './components/SeedDemoCard';
import {
  StatCard,
  SectionHeader,
  RankRow,
  ActivityItem,
} from '../../components/admin/AdminWidgets';

// ── Accent palette ─────────────────────────────────────────────────────────────
const RED   = '#D82D31';
const BLUE  = '#03BAE9';
const GREEN = '#05B15A';
const GOLD  = '#F59E0B';

// ── Icons ─────────────────────────────────────────────────────────────────────
const ICONS = {
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  auctions: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /><path d="m13 13 6 6" />
    </svg>
  ),
  active: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
    </svg>
  ),
  bids: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
    </svg>
  ),
  finished: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
    </svg>
  ),
  engagement: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  ),
};

export default function AdminPage() {
  const navigate = useNavigate();
  const [stats, setStats]     = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const loadStats = () => {
    adminService.getStats()
      .then((data) => { setStats(data); setLoading(false); })
      .catch(() => { setError('No se pudieron cargar las estadísticas.'); setLoading(false); });
  };
  useEffect(() => { loadStats(); }, []);

  if (loading) return <Spinner label="Cargando estadísticas…" />;
  if (error || !stats) return <ErrorState message={error ?? 'Error inesperado.'} />;

  const engagementRate = stats.totalAuctions > 0
    ? Math.round((stats.auctionsWithBids / stats.totalAuctions) * 100)
    : 0;

  return (
    <div className="page-enter flex flex-col gap-8">

      {/* ── Título ──────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-[0.6rem] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
            style={{ background: `${RED}15`, color: RED }}
          >
            Admin
          </span>
        </div>
        <h1 className="text-2xl font-bold text-text">Estadísticas de la plataforma</h1>
        <p className="text-xs text-muted mt-0.5">
          Datos en tiempo real sobre el uso y actividad del sistema.
        </p>
        
        {/* Navigation button */}
        <button
          onClick={() => navigate('/admin/gift')}
          className="mt-4 px-4 py-2 bg-primary text-text font-bold rounded-lg hover:opacity-90 transition-opacity"
        >
          Regalar Figurita
        </button>
      </div>

      <SeedDemoCard onDone={loadStats} />

      {/* ── KPI cards ───────────────────────────────────────────────────────── */}
      <section>
        <SectionHeader label="Resumen general" accentColor={RED} />
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          <StatCard
            label="Usuarios registrados"
            value={stats.totalUsers}
            icon={ICONS.users}
            accentColor={BLUE}
            sub="Cuentas creadas en la plataforma"
          />
          <StatCard
            label="Subastas totales"
            value={stats.totalAuctions}
            icon={ICONS.auctions}
            accentColor={RED}
            sub={`${stats.activeAuctions} activa${stats.activeAuctions !== 1 ? 's' : ''} ahora`}
          />
          <StatCard
            label="Subastas activas"
            value={stats.activeAuctions}
            icon={ICONS.active}
            accentColor={GOLD}
            sub="En curso en este momento"
          />
          <StatCard
            label="Subastas finalizadas"
            value={stats.finishedAuctions}
            icon={ICONS.finished}
            accentColor={GREEN}
            sub="Completadas exitosamente"
          />
          <StatCard
            label="Ofertas totales"
            value={stats.totalBids}
            icon={ICONS.bids}
            accentColor={BLUE}
            sub={`${stats.auctionsWithBids} subasta${stats.auctionsWithBids !== 1 ? 's' : ''} con al menos 1 oferta`}
          />
          <StatCard
            label="Tasa de participación"
            value={`${engagementRate}%`}
            icon={ICONS.engagement}
            accentColor={GREEN}
            sub="Subastas que recibieron ofertas"
          />
        </div>
      </section>

      {/* ── Rankings + Actividad ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Top oferentes */}
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col">
          <SectionHeader label="Top oferentes" accentColor={BLUE} />
          {stats.topBidders.length === 0 ? (
            <p className="text-xs text-muted text-center py-6 italic">Sin datos todavía.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {stats.topBidders.map((b, i) => (
                <RankRow
                  key={b.username}
                  rank={i + 1}
                  username={b.username}
                  count={b.bids}
                  countLabel={b.bids === 1 ? 'oferta' : 'ofertas'}
                  accentColor={BLUE}
                />
              ))}
            </div>
          )}
        </div>

        {/* Top subastadores */}
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col">
          <SectionHeader label="Top subastadores" accentColor={RED} />
          {stats.topOwners.length === 0 ? (
            <p className="text-xs text-muted text-center py-6 italic">Sin datos todavía.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {stats.topOwners.map((o, i) => (
                <RankRow
                  key={o.username}
                  rank={i + 1}
                  username={o.username}
                  count={o.auctions}
                  countLabel={o.auctions === 1 ? 'subasta' : 'subastas'}
                  accentColor={RED}
                />
              ))}
            </div>
          )}
        </div>

        {/* Actividad reciente */}
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col">
          <SectionHeader label="Actividad reciente" accentColor={GREEN} />
          {stats.recentActivity.length === 0 ? (
            <p className="text-xs text-muted text-center py-6 italic">Sin actividad reciente.</p>
          ) : (
            <div className="flex flex-col overflow-y-auto max-h-72 pr-1">
              {stats.recentActivity.map(item => (
                <ActivityItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}