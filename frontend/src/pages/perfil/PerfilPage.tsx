import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { TX_CONFIG, type TxType } from './transacciones';
import TransactionCard from './components/TransactionCard';
import TransactionDetailModal from './components/TransactionDetailModal';
import type { Transaction } from './transacciones';
import { useTransactions } from './components/useTransactions';
import StarRating from '../../components/StarRating';
import ErrorState from '../../components/ErrorState';
import { useReputacion } from '../../hooks/useReputacion';
import api from '../../services/api';

const BLUE = '#03BAE9';
const RED = '#D82D31';
const GREEN = '#05B15A';

const PREVIEW_COUNT = 5;

export default function PerfilPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saved, setSaved] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const { transactions, loading, error: transactionsError } = useTransactions(user?.id, user?.username);
  const { data: reputacion, isError: reputacionError, refetch: refetchReputacion } = useReputacion(user?.id, user?.username);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateUser({ avatar: reader.result as string });
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      await api.put(`/api/usuarios/${user!.id}`, { username, email });
      updateUser({ username, email });
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('No se pudo guardar el perfil. Intentá de nuevo.');
    }
  };

  const handleCancel = () => {
    setUsername(user?.username ?? '');
    setEmail(user?.email ?? '');
    setEditing(false);
  };

  const initials = user?.username?.[0]?.toUpperCase() ?? '?';

  return (
    <div
      className="page-enter"
      style={{ margin: '-1.75rem', padding: '1.75rem', minHeight: 'calc(100% + 3.5rem)', background: 'white' }}
    >
      <div className="flex gap-6 items-start">

        {/* ── Columna izquierda ── */}
        <div className="w-1/2 min-w-0 flex flex-col gap-5">

          {/* Header de perfil */}
          <div className="rounded-2xl p-6 flex items-center gap-5"
            style={{ background: `linear-gradient(135deg, ${RED} 0%, ${BLUE} 100%)` }}>
            <div className="relative group shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} alt="avatar" className="w-20 h-20 rounded-full object-cover border-4 border-white/40" />
              ) : (
                <div className="w-20 h-20 rounded-full border-4 border-white/40 flex items-center justify-center text-white text-3xl font-black"
                  style={{ background: 'rgba(255,255,255,0.2)' }}>
                  {initials}
                </div>
              )}
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center cursor-pointer border-none">
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-xl leading-tight truncate">{user?.username ?? '—'}</p>
              <p className="text-white/70 text-sm capitalize mb-2">{user?.role ?? '—'}</p>
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-white/80 bg-white/15 border border-white/30 rounded-lg px-3 py-1 cursor-pointer hover:bg-white/25 transition-all duration-150">
                Cambiar foto
              </button>
            </div>
          </div>

          {/* Información de la cuenta */}
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${BLUE}30` }}>
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `2px solid ${BLUE}` }}>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: BLUE }} />
                <span className="text-sm font-bold" style={{ color: BLUE }}>Información de la cuenta</span>
              </div>
              {!editing && (
                <button type="button" onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white rounded-lg px-3 py-1.5 cursor-pointer transition-all duration-150 hover:opacity-85"
                  style={{ background: BLUE }}>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Editar
                </button>
              )}
            </div>
            <div className="divide-y divide-gray-100">
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${BLUE}15` }}>
                  <svg className="w-4 h-4" style={{ color: BLUE }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-400 mb-0.5 uppercase tracking-wider">Usuario</p>
                  {editing ? (
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                      className="w-full text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-1.5 outline-none transition-all duration-150"
                      style={{ border: `1.5px solid ${BLUE}` }} />
                  ) : (
                    <p className="text-sm font-semibold text-gray-800 truncate">{user?.username || '—'}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${BLUE}15` }}>
                  <svg className="w-4 h-4" style={{ color: BLUE }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-400 mb-0.5 uppercase tracking-wider">Email</p>
                  {editing ? (
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-1.5 outline-none transition-all duration-150"
                      style={{ border: `1.5px solid ${BLUE}` }} />
                  ) : (
                    <p className="text-sm font-semibold text-gray-800 truncate">{user?.email || '—'}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${RED}15` }}>
                  <svg className="w-4 h-4" style={{ color: RED }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-400 mb-0.5 uppercase tracking-wider">Rol</p>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full capitalize" style={{ background: `${RED}15`, color: RED }}>
                    {user?.role || '—'}
                  </span>
                </div>
              </div>
            </div>
            {editing && (
              <div className="flex gap-3 px-5 py-4" style={{ borderTop: `1px solid ${BLUE}20` }}>
                <button type="button" onClick={handleSave}
                  className="flex-1 py-2 rounded-lg text-sm font-bold text-white transition-all duration-150 hover:opacity-90 active:scale-95"
                  style={{ background: BLUE }}>
                  Guardar cambios
                </button>
                <button type="button" onClick={handleCancel}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-gray-500 bg-gray-100 transition-all duration-150 hover:bg-gray-200">
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Reputación */}
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${GREEN}30` }}>
            <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `2px solid ${GREEN}` }}>
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: GREEN }} />
              <span className="text-sm font-bold" style={{ color: GREEN }}>Reputación</span>
            </div>
            {reputacionError ? (
              <div className="px-5 py-6">
                <ErrorState message="No se pudo cargar la reputación." onRetry={() => refetchReputacion()} color={GREEN} />
              </div>
            ) : (
              <div className="flex items-center gap-6 px-5 py-5">
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <span className="text-5xl font-black leading-none" style={{ color: GREEN }}>
                    {reputacion ? reputacion.score.toFixed(1) : '—'}
                  </span>
                  <StarRating score={reputacion?.score ?? 0} emptyColor="#D1FAE5" />
                  <span className="text-xs text-gray-400 mt-0.5">
                    {reputacion ? `${reputacion.total} ${reputacion.total === 1 ? 'reseña' : 'reseñas'}` : 'Sin reseñas'}
                  </span>
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  {[
                    { star: 5, count: reputacion?.cincoEstrellas ?? 0 },
                    { star: 4, count: reputacion?.cuatroEstrellas ?? 0 },
                    { star: 3, count: reputacion?.tresEstrellas ?? 0 },
                    { star: 2, count: reputacion?.dosEstrellas ?? 0 },
                    { star: 1, count: reputacion?.unaEstrella ?? 0 },
                  ].map(({ star, count }) => {
                    const pct = reputacion && reputacion.total > 0
                      ? Math.round((count / reputacion.total) * 100)
                      : 0;
                    return (
                      <div key={star} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-3 text-right shrink-0">{star}</span>
                        <svg className="w-3 h-3 shrink-0" style={{ color: GREEN }} viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                        </svg>
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: `${GREEN}20` }}>
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: GREEN }} />
                        </div>
                        <span className="text-xs text-gray-400 w-5 shrink-0">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {saved && (
            <div className="flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-3"
              style={{ background: `${GREEN}15`, color: GREEN, border: `1.5px solid ${GREEN}40` }}>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Perfil actualizado correctamente.
            </div>
          )}
        </div>

        {/* ── Columna derecha — Historial ── */}
        <div className="w-1/2 min-w-0 flex flex-col gap-0" style={{ border: `1.5px solid ${RED}30`, borderRadius: '1rem', overflow: 'hidden' }}>
          <div className="flex items-center gap-2 px-5 py-3.5" style={{ borderBottom: `2px solid ${RED}`, background: 'white' }}>
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: RED }} />
            <span className="text-sm font-bold" style={{ color: RED }}>Historial de transacciones</span>
          </div>
          <div className="flex items-center gap-3 px-5 py-2.5 bg-gray-50" style={{ borderBottom: '1px solid #f3f4f6' }}>
            {(Object.entries(TX_CONFIG) as [TxType, typeof TX_CONFIG[TxType]][]).map(([type, cfg]) => (
              <div key={type} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                <span className="text-xs text-gray-400">{cfg.label}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col divide-y divide-gray-100" style={{ background: 'white' }}>
            {loading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-gray-400 text-xs">
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Cargando…
              </div>
            ) : transactionsError ? (
              <p className="text-xs text-center py-8" style={{ color: RED }}>No se pudieron cargar las transacciones.</p>
            ) : transactions.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">Sin transacciones aún.</p>
            ) : (
              transactions.slice(0, PREVIEW_COUNT).map((tx) => (
                <TransactionCard key={tx.id} tx={tx} compact onCardClick={setSelectedTx} />
              ))
            )}
          </div>
          {transactions.length > PREVIEW_COUNT && (
            <button type="button" onClick={() => navigate('/perfil/historial')}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all duration-150 hover:opacity-80"
              style={{ color: RED, borderTop: `1px solid ${RED}20` }}>
              Ver todas las transacciones
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {selectedTx && (
        <TransactionDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
      )}
    </div>
  );
}
