import { useNavigate } from 'react-router-dom';

const RED = '#D82D31';
const BLUE = '#03BAE9';
const GREEN = '#05B15A';

const ACTIONS = [
  { label: 'Buscar figuritas', to: '/buscar', color: BLUE,
    icon: <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></> },
  { label: 'Mi colección', to: '/coleccion', color: GREEN,
    icon: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></> },
  { label: 'Publicar subasta', to: '/subastas/nueva', color: RED,
    icon: <><path d="m14 13-7.5 7.5a2.12 2.12 0 0 1-3-3L11 10"/><path d="m16 16 6-6M8 8l6-6M9 7l8 8"/></> },
];

export default function QuickActions() {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-3 gap-3">
      {ACTIONS.map((a) => (
        <button
          key={a.to}
          type="button"
          onClick={() => navigate(a.to)}
          className="flex items-center justify-center gap-2 rounded-2xl p-3 bg-white text-sm font-semibold text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
          style={{ border: `1.5px solid ${a.color}30` }}
        >
          <svg className="w-4 h-4" style={{ color: a.color }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            {a.icon}
          </svg>
          {a.label}
        </button>
      ))}
    </div>
  );
}
