import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DEFAULT_PAGE_SIZE, type PagedResponse } from '../../services/api';
import BuscarPage from './BuscarPage';

// Mock del cliente axios: la página sólo usa api.get.
const getMock = vi.fn();
vi.mock('../../services/api', async () => {
  const actual = await vi.importActual<typeof import('../../services/api')>('../../services/api');
  return { ...actual, default: { get: (...args: unknown[]) => getMock(...args) } };
});
vi.mock('../../auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'me', username: 'sofi' } }) }));

interface Publicacion {
  id: string;
  figuritaBaseId: string;
  figuritaNumero: number;
  figuritaJugadorNombre: string;
  figuritaSeleccionNombre: string;
  figuritaEquipoNombre: string;
  figuritaCategoriaNombre: string;
  figuritaIds: string[];
  cantidad: number;
  usuarioId: string;
  usuarioUsername: string;
  fechaPublicacion: string;
  estado: string;
}

const pub = (id: string, jugador: string): Publicacion => ({
  id, figuritaBaseId: 'b1', figuritaNumero: 10, figuritaJugadorNombre: jugador,
  figuritaSeleccionNombre: 'ARG', figuritaEquipoNombre: 'x', figuritaCategoriaNombre: 'y',
  figuritaIds: ['f1'], cantidad: 2, usuarioId: 'u9', usuarioUsername: 'jorge',
  fechaPublicacion: '2026-06-28T11:00:00Z', estado: 'DISPONIBLE',
});

const pageData = (content: Publicacion[], pageNum: number): PagedResponse<Publicacion> => ({
  content, page: pageNum, size: 10, totalElements: 25, totalPages: 3, last: false,
});

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <BuscarPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('BuscarPage', () => {
  beforeEach(() => { getMock.mockReset(); });

  it('pide las publicaciones disponibles del usuario (by-id) y las renderiza', async () => {
    getMock.mockResolvedValue({ data: pageData([pub('p1', 'Messi')], 0) });

    renderPage();

    // El backend ya excluye lo propio: el front sólo pide /disponibles/{userId} con el id real.
    expect(await screen.findByText('Messi')).toBeInTheDocument();
    expect(screen.getByLabelText('Página siguiente')).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith(
      '/api/publicaciones/disponibles/me',
      { params: { page: 0, size: DEFAULT_PAGE_SIZE } },
    );
  });

  it('pasar de página vuelve a pedir con page:1', async () => {
    getMock.mockResolvedValue({ data: pageData([pub('p1', 'Messi')], 0) });

    renderPage();
    await screen.findByText('Messi');

    fireEvent.click(screen.getByLabelText('Página siguiente'));

    await waitFor(() =>
      expect(getMock).toHaveBeenLastCalledWith(
        '/api/publicaciones/disponibles/me',
        { params: { page: 1, size: DEFAULT_PAGE_SIZE } },
      ),
    );
  });
});
