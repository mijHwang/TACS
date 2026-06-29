import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import type { JSX } from 'react';

// ── Icons (inline SVG, zero deps) ────────────────────────────────────────────
const icons: Record<string, JSX.Element> = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  coleccion: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M19 11H5M19 11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2M19 11V9a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2" />
    </svg>
  ),
  buscar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" />
    </svg>
  ),
  intercambios: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" />
    </svg>
  ),
  propuestas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  sugerencias: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9.663 17h4.673M12 3v1M5.6 6.6l.7.7M18.4 6.6l-.7.7M4 12H3m18 0h-1M7 12a5 5 0 1 1 10 0c0 2-1.5 3-2 4H9c-.5-1-2-2-2-4z" />
    </svg>
  ),
  subastas: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /><path d="m13 13 6 6" />
    </svg>
  ),
  notificaciones: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  perfil: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
};

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/coleccion', label: 'Mi Colección', icon: 'coleccion' },
  { to: '/buscar', label: 'Buscar', icon: 'buscar' },
  { to: '/intercambios', label: 'Intercambios', icon: 'intercambios' },
  { to: '/propuestas', label: 'Propuestas', icon: 'propuestas' },
  { to: '/sugerencias', label: 'Sugerencias', icon: 'sugerencias' },
  { to: '/subastas', label: 'Subastas', icon: 'subastas' },
  { to: '/notificaciones', label: 'Notificaciones', icon: 'notificaciones' },
  { to: '/perfil', label: 'Perfil', icon: 'perfil' },
];

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex w-screen h-screen overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        className="w-60 min-w-60 h-screen flex flex-col overflow-hidden shrink-0"
        style={{ background: 'linear-gradient(160deg, #D82D31 0%, #8B1518 100%)' }}
      >
        <div className="flex items-center gap-2.5 px-5 h-[52px] text-sm font-black tracking-[0.15em] text-white uppercase shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
          <span className="w-2 h-2 rounded-full bg-white shrink-0" />
          TACS
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto overflow-x-hidden">
          {navLinks.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                'flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium no-underline transition-all duration-150 ' +
                (isActive ? 'font-semibold text-white' : 'text-red-200 hover:text-white hover:bg-[rgba(255,255,255,0.08)]')
              }
              style={({ isActive }) => isActive
                ? { background: 'rgba(255,255,255,0.18)' }
                : { }}
            >
              <span className="w-[18px] h-[18px] shrink-0 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full">
                {icons[icon]}
              </span>
              <span className="text-[0.85rem] overflow-hidden text-ellipsis whitespace-nowrap">{label}</span>
            </NavLink>
          ))}

          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                'flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium no-underline transition-all duration-150 mt-2 pt-4 ' +
                (isActive ? 'font-semibold text-white' : 'text-red-200 hover:text-white')
              }
              style={({ isActive }) => ({ borderTop: '1px solid rgba(255,255,255,0.15)', ...(isActive ? { background: 'rgba(255,255,255,0.18)' } : {}) })}
            >
              <span className="w-[18px] h-[18px] shrink-0 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full">
                {icons.admin}
              </span>
              <span className="text-[0.85rem] overflow-hidden text-ellipsis whitespace-nowrap">Admin</span>
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-3 px-4 py-4 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          {user?.avatar ? (
            <img src={user.avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover shrink-0" style={{ border: '1.5px solid rgba(255,255,255,0.6)' }} />
          ) : (
            <div className="w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1.5px solid rgba(255,255,255,0.4)' }}>
              {user?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div className="flex-1 flex flex-col overflow-hidden">
            <span className="text-xs font-semibold text-white overflow-hidden text-ellipsis whitespace-nowrap">
              {user?.username ?? 'Invitado'}
            </span>
            <span className="text-[0.7rem] capitalize" style={{ color: 'rgba(255,255,255,0.6)' }}>{user?.role ?? '—'}</span>
          </div>
          <button
            className="bg-transparent border-none cursor-pointer w-[22px] h-[22px] flex items-center justify-center shrink-0 rounded p-0 transition-all duration-150 [&>svg]:w-4 [&>svg]:h-4 text-white/70 hover:text-white"
            onClick={logout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-[52px] flex items-center justify-end px-6 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <button
              className="bg-transparent border border-gray-200 rounded-lg text-gray-400 w-8 h-8 flex items-center justify-center cursor-pointer transition-all duration-150 hover:border-[#03BAE9] hover:text-[#03BAE9] [&>svg]:w-4 [&>svg]:h-4"
              title="Notificaciones"
              aria-label="Notificaciones"
              onClick={() => navigate('/notificaciones')}
            >
              {icons.notificaciones}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-7 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
