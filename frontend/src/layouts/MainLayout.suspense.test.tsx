import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { Suspense, lazy } from 'react';
import type { ComponentType } from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import MainLayout from './MainLayout';

// MainLayout sólo necesita { user, logout } del contexto de auth.
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', username: 'ana', role: 'user' }, logout: vi.fn() }),
}));

// Simula un chunk de página que todavía no terminó de descargarse: queda suspendido.
const PaginaQueNuncaCarga = lazy(
  () => new Promise<{ default: ComponentType }>(() => {}),
);

describe('MainLayout — el sidebar no se desmonta mientras carga una página lazy', () => {
  it('mantiene el sidebar montado aunque la página del Outlet esté suspendida', () => {
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: <MainLayout />,
          children: [{ index: true, element: <PaginaQueNuncaCarga /> }],
        },
      ],
      { initialEntries: ['/'] },
    );

    // Mismo patrón que App.tsx: un Suspense a pantalla completa envolviendo el router.
    render(
      <Suspense fallback={<div data-testid="fullscreen-loader">Cargando…</div>}>
        <RouterProvider router={router} />
      </Suspense>,
    );

    // El contenido suspende, pero la barra lateral (marca "TACS" + navegación) debe seguir presente.
    expect(screen.queryByText('TACS')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).toBeInTheDocument();
    // Y el fallback de pantalla completa NO debe haber reemplazado al shell.
    expect(screen.queryByTestId('fullscreen-loader')).not.toBeInTheDocument();
  });
});
