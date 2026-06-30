import { useNavigate } from 'react-router-dom';

const BLUE = '#03BAE9';

interface Props {
  owned: number;
  total: number;
  faltan: number;
}

export default function CollectionProgress({ owned, total, faltan }: Props) {
  const navigate = useNavigate();
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
  return (
    <div className="rounded-2xl p-4 bg-white" style={{ border: `1.5px solid ${BLUE}30` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-gray-900">Progreso de tu colección</span>
        <button
          type="button"
          onClick={() => navigate('/coleccion/faltantes')}
          className="text-xs font-semibold bg-transparent border-none cursor-pointer hover:opacity-70"
          style={{ color: BLUE }}
        >
          Ver faltantes →
        </button>
      </div>
      {total > 0 ? (
        <>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-bold text-gray-900">{owned}</span>
            <span className="text-sm text-gray-400">/ {total} figuritas</span>
            <span className="text-xs text-gray-500 ml-auto">te faltan {faltan}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: `${BLUE}20` }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: BLUE }} />
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-400">Cargá tus figuritas para ver tu progreso.</p>
      )}
    </div>
  );
}
