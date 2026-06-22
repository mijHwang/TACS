import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { to: '', label: 'Todas', end: true },
  { to: 'repetidas', label: 'Mis repetidas', end: false },
  { to: 'faltantes', label: 'Mis faltantes', end: false },
];

/** Layout de "Mi Colección": título + tabs (Todas / Mis repetidas / Mis faltantes) + <Outlet/>. */
export default function ColeccionPage() {
  return (
    <div className="page-enter">
      <h1 className="text-2xl font-bold text-text mb-1">Mi Colección</h1>
      <p className="text-sm text-muted mb-6">Administrá tus figuritas</p>

      <nav className="flex gap-2 mb-8 flex-wrap">
        {tabs.map(({ to, label, end }) => (
          <NavLink
            key={to || 'todas'}
            to={to}
            end={end}
            className={({ isActive }) =>
              'px-4 py-1.5 rounded-md text-sm font-medium border transition-all duration-150 no-underline ' +
              (isActive
                ? 'bg-primary/15 text-primary border-primary/50 font-semibold'
                : 'text-muted border-border hover:bg-surface2 hover:text-text')
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
