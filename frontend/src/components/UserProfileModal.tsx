import { useQuery } from '@tanstack/react-query';
import StarRating from './StarRating';
import api from '../services/api';

const BLUE  = '#03BAE9';
const RED   = '#D82D31';
const GREEN = '#05B15A';

interface UsuarioPreview {
  id: string;
  username: string;
  avatar?: string;
}

interface Reputacion {
  score: number;
  total: number;
}

interface Props {
  username: string;
  onClose: () => void;
}

export default function UserProfileModal({ username, onClose }: Props) {

  // CHANGED:
  // Before:
  // const userData = MOCK_USERS[username] ?? { username, score: 0, totalReviews: 0 };
  //
  // Now:
  const { data: userData } = useQuery({
    queryKey: ['usuario', username],
    queryFn: async () =>
      (await api.get<UsuarioPreview>(`/api/usuarios/by-username/${username}`)).data,
  });

  // NEW:
  // Uses the same reputation endpoint that PerfilPage already uses
  const { data: reputacion } = useQuery({
    queryKey: ['reputacion', userData?.id],
    queryFn: async () =>
      (await api.get<Reputacion>(
        `/api/intercambios/usuario/${userData!.id}/reputacion`
      )).data,
    enabled: !!userData?.id,
  });

  const initials = username[0]?.toUpperCase() ?? '?';

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      {/* Modal */}
      <div
        className="bg-white rounded-2xl overflow-hidden shadow-2xl w-72"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con gradiente */}
        <div
          className="px-6 pt-6 pb-10 flex flex-col items-center relative"
          style={{ background: `linear-gradient(135deg, ${RED} 0%, ${BLUE} 100%)` }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center border-none cursor-pointer hover:bg-white/35 transition-all"
          >
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>

          {userData?.avatar ? (
            <img
              src={userData.avatar}
              alt={username}
              className="w-20 h-20 rounded-full object-cover border-4 border-white/50"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full border-4 border-white/50 flex items-center justify-center text-white text-3xl font-black"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              {initials}
            </div>
          )}
          <p className="text-white font-bold text-lg mt-3 leading-tight">{userData?.username ?? username}</p>
        </div>

        {/* Valoración */}
        <div className="px-6 py-5 flex flex-col items-center gap-2 -mt-4">
          <div
            className="flex flex-col items-center gap-2 bg-white rounded-xl px-6 py-4 shadow-md w-full"
            style={{ border: `1.5px solid ${GREEN}20` }}
          >
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Valoración</span>
            <span className="text-4xl font-black leading-none" style={{ color: GREEN }}>
              {reputacion ? reputacion.score.toFixed(1) : '—'}
            </span>
            {reputacion && (
                <StarRating score={reputacion.score} size={20} />
              )}
            <span className="text-xs text-gray-400">
              {reputacion?.total ?? 0} {reputacion?.total === 1 ? 'reseña' : 'reseñas'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
