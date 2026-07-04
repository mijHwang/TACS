import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import { Suspense, lazy } from 'react';
import type { ComponentType } from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import SubastasPage from './subastas/SubastasPage';
import ColeccionPage from './coleccion/ColeccionPage';
import PropuestasPage from './propuestas/PropuestasPage';

// Simula el chunk de una sub-página que aún no terminó de descargarse: queda suspendido.
const SubPaginaQueNuncaCarga = lazy(
  () => new Promise<{ default: ComponentType }>(() => {}),
);

const casos = [
  { nombre: 'Subastas',  Layout: SubastasPage,  path: '/subastas',  entry: '/subastas',           child: { index: true },          conserva: ['Subastas', 'Activas'] },
  { nombre: 'Colección', Layout: ColeccionPage, path: '/coleccion', entry: '/coleccion',          child: { index: true },          conserva: ['Mi Colección', 'Mis repetidas'] },
  { nombre: 'Propuestas', Layout: PropuestasPage, path: '/propuestas', entry: '/propuestas/enviadas', child: { path: 'enviadas' }, conserva: ['Propuestas', 'Enviadas'] },
] as const;

describe('Layouts anidados — la cabecera y los tabs no se desmontan mientras carga una sub-página lazy', () => {
  it.each(casos)('$nombre conserva cabecera y tabs aunque el Outlet esté suspendido', ({ Layout, path, entry, child, conserva }) => {
    const router = createMemoryRouter(
      [{ path, element: <Layout />, children: [{ ...child, element: <SubPaginaQueNuncaCarga /> }] }],
      { initialEntries: [entry] },
    );

    // Un único Suspense externo (como el de MainLayout): si el layout anidado no tiene
    // su propio límite, este fallback reemplaza la sección entera (cabecera + tabs).
    render(
      <Suspense fallback={<div data-testid="outer-loader">Cargando…</div>}>
        <RouterProvider router={router} />
      </Suspense>,
    );

    for (const texto of conserva) {
      expect(screen.queryByText(texto)).toBeInTheDocument();
    }
    expect(screen.queryByTestId('outer-loader')).not.toBeInTheDocument();
  });
});
