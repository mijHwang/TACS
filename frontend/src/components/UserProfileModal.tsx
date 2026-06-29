import StarRating from './StarRating';

const BLUE  = '#03BAE9';
const RED   = '#D82D31';
const GREEN = '#05B15A';

export interface UserPreview {
  username: string;
  avatar?: string;
  score: number;
  totalReviews: number;
}

// Mock: en producción esto vendría de una API por username
const MOCK_USERS: Record<string, UserPreview> = {
  carlitos99:   { username: 'carlitos99',   score: 4.8, totalReviews: 32 },
  'lauti_fútbol': { username: 'lauti_fútbol', score: 3.5, totalReviews: 12 },
  manu_col:     { username: 'manu_col',     score: 5.0, totalReviews: 7  },
  sofi_fig:     { username: 'sofi_fig',     score: 4.2, totalReviews: 21 },
  pepe_crack:   { username: 'pepe_crack',   score: 2.8, totalReviews: 5  },
  nico_world:   { username: 'nico_world',   score: 4.6, totalReviews: 44 },
  vale_sticker: { username: 'vale_sticker', score: 3.9, totalReviews: 18 },
  juanma_f:     { username: 'juanma_f',     score: 4.1, totalReviews: 9  },
};


interface Props {
  username: string;
  onClose: () => void;
}

export default function UserProfileModal({ username, onClose }: Props) {
  const userData = MOCK_USERS[username] ?? { username, score: 0, totalReviews: 0 };
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

          {userData.avatar ? (
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
          <p className="text-white font-bold text-lg mt-3 leading-tight">{userData.username}</p>
        </div>

        {/* Valoración */}
        <div className="px-6 py-5 flex flex-col items-center gap-2 -mt-4">
          <div
            className="flex flex-col items-center gap-2 bg-white rounded-xl px-6 py-4 shadow-md w-full"
            style={{ border: `1.5px solid ${GREEN}20` }}
          >
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Valoración</span>
            <span className="text-4xl font-black leading-none" style={{ color: GREEN }}>
              {userData.score.toFixed(1)}
            </span>
            <StarRating score={userData.score} size={20} />
            <span className="text-xs text-gray-400">
              {userData.totalReviews} {userData.totalReviews === 1 ? 'reseña' : 'reseñas'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
