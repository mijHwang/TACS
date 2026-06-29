import { useNavigate } from 'react-router-dom';

interface Props {
  label: string;
  value: number;
  sub?: string;
  color: string;
  to: string;
}

export default function StatCard({ label, value, sub, color, to }: Props) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="text-left rounded-2xl p-4 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
      style={{ border: `1.5px solid ${color}30` }}
    >
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color }}>{Math.round(value)}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </button>
  );
}
