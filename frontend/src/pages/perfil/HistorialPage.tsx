import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TX_CONFIG, type TxType } from './transacciones';
import TransactionCard from './components/TransactionCard';
import TransactionDetailModal from './components/TransactionDetailModal';
import UserProfileModal from '../../components/UserProfileModal';
import type { Transaction } from './transacciones';
import { useAuth } from '../../auth/useAuth';
import { useTransactions } from './components/useTransactions';

const BLUE  = '#03BAE9';
const RED   = '#D82D31';

export default function HistorialPage() {
  const { user } = useAuth();
  const [search, setSearch]           = useState('');
  const [desde, setDesde]             = useState('');
  const [hasta, setHasta]             = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedTx, setSelectedTx]   = useState<Transaction | null>(null);
  const [page, setPage]               = useState(1);
  const navigate = useNavigate();

  const { transactions, loading } = useTransactions(user?.id, user?.username);

  const PAGE_SIZE = 5;

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSearch = search.trim() === '' ||
        tx.stickers.some((s) => s.toLowerCase().includes(search.toLowerCase()));
      const matchDesde = desde === '' || tx.isoDate >= desde;
      const matchHasta = hasta === '' || tx.isoDate <= hasta;
      return matchSearch && matchDesde && matchHasta;
    });
  }, [search, desde, hasta, transactions]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = search !== '' || desde !== '' || hasta !== '';

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-2 text-gray-400 text-sm">
      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
      Cargando transacciones…
    </div>
  );

  return (
    <div
      className="page-enter"
      style={{ margin: '-1.75rem', padding: '1.75rem', minHeight: 'calc(100% + 3.5rem)', background: 'white' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={() => navigate('/perfil')}
          className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-150 hover:opacity-80 shrink-0"
          style={{ borderColor: `${RED}40`, color: RED, background: `${RED}08` }}
          title="Volver al perfil"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${RED}15` }}>
          <svg className="w-5 h-5" style={{ color: RED }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/>
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">Historial de transacciones</h1>
          <p className="text-sm text-gray-400">
            {filtered.length} {filtered.length === 1 ? 'transacción' : 'transacciones'}
            {hasFilters && ` encontradas`}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Nombre figurita"
            className="pl-8 pr-3 py-1.5 rounded-lg border border-[#e5e7eb] focus:border-[#03BAE9] text-xs text-gray-800 outline-none transition-all duration-150 placeholder:text-gray-300 w-44"
          />
        </div>
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <input
            type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setPage(1); }}
            className="pl-8 pr-2 py-1.5 rounded-lg border border-[#e5e7eb] focus:border-[#03BAE9] text-xs text-gray-700 outline-none transition-all duration-150 cursor-pointer"
          />
        </div>
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <input
            type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setPage(1); }}
            className="pl-8 pr-2 py-1.5 rounded-lg border border-[#e5e7eb] focus:border-[#03BAE9] text-xs text-gray-700 outline-none transition-all duration-150 cursor-pointer"
          />
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={() => { setSearch(''); setDesde(''); setHasta(''); setPage(1); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 hover:opacity-80"
            style={{ color: RED, borderColor: `${RED}40`, background: `${RED}08` }}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
            Limpiar
          </button>
        )}
      </div>

      {/* Leyenda de tipos */}
      <div className="flex items-center gap-4 mb-4">
        {(Object.entries(TX_CONFIG) as [TxType, typeof TX_CONFIG[TxType]][]).map(([type, cfg]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cfg.color }} />
            <span className="text-xs font-medium text-gray-500">{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <svg className="w-10 h-10 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <p className="text-sm font-medium">Sin resultados para los filtros aplicados</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-w-2xl mx-auto">
          {paginated.map((tx) => (
            <TransactionCard key={tx.id} tx={tx} onUserClick={setSelectedUser} onCardClick={setSelectedTx} />
          ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 pt-2 pb-1">
              <button type="button" onClick={() => setPage((p) => p - 1)} disabled={page === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ borderColor: `${BLUE}40`, color: BLUE }}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" onClick={() => setPage(n)}
                  className="w-8 h-8 rounded-lg text-sm font-semibold border transition-all duration-150"
                  style={n === page ? { background: BLUE, color: 'white', borderColor: BLUE } : { borderColor: `${BLUE}30`, color: '#6b7280', background: 'white' }}>
                  {n}
                </button>
              ))}
              <button type="button" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center border transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ borderColor: `${BLUE}40`, color: BLUE }}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </div>
          )}
        </div>
      )}

      {selectedTx && (
        <TransactionDetailModal
          tx={selectedTx}
          onClose={() => setSelectedTx(null)}
          onUserClick={(u) => { setSelectedTx(null); setSelectedUser(u); }}
        />
      )}
      {selectedUser && (
        <UserProfileModal username={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
}