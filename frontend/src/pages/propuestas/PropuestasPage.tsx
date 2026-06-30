import { NavLink, Outlet, useMatch } from 'react-router-dom';
import { Suspense } from 'react';


const subLinks = [
  { to: 'nueva',     label: 'Nueva' },
  { to: 'recibidas', label: 'Recibidas' },
  { to: 'enviadas',  label: 'Enviadas' },
];

export default function PropuestasPage() {
  const isIndex = useMatch('/propuestas');
  return (
    <div className="page-enter">
      <h1 className="text-2xl font-bold text-text mb-1">Propuestas</h1>
      <p className="text-sm text-muted mb-6">Gestioná tus propuestas de intercambio</p>

      <nav className="flex gap-2 mb-8 flex-wrap">
        {subLinks.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
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

      {isIndex
        ? <p className="text-sm text-muted">Seleccioná una sección.</p>
        : (
          /* Suspense propio: la sub-página lazy carga sin desmontar el título ni los tabs. */
          <Suspense fallback={<div className="py-10 text-center text-muted text-sm tracking-widest">Cargando…</div>}>
            <Outlet />
          </Suspense>
        )}
    </div>
  );
}
