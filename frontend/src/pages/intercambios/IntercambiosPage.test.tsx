import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { PagedResponse } from '../../services/api';

// ── Mocks ───────────────────────────────────────────────────────────────────
const getMock = vi.fn();
vi.mock('../../services/api', async () => {
  const actual = await vi.importActual<typeof import('../../services/api')>('../../services/api');
  return {
    ...actual,
    default: { get: (...args: unknown[]) => getMock(...args), patch: vi.fn() },
  };
});

vi.mock('../../auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', username: 'matias' } }),
}));

import IntercambiosPage from './IntercambiosPage';

interface IntercambioDTO {
  id: string;
  usuarioGeneradorId: string;
  usuarioGeneradorUsername: string;
  usuarioIntercambiadorId: string;
  usuarioIntercambiadorUsername: string;
  figuritaId: string;
  figuritaNombre: string;
  figuritasIntercambiadasNombres: string[];
  fecha: string;
  puntajeGenerador: number | null;
  puntajeIntercambiador: number | null;
}

function makeIntercambio(id: string, otroUsername: string): IntercambioDTO {
  return {
    id,
    usuarioGeneradorId: 'u1',
    usuarioGeneradorUsername: 'matias',
    usuarioIntercambiadorId: 'u2',
    usuarioIntercambiadorUsername: otroUsername,
    figuritaId: 'f1',
    figuritaNombre: 'Messi #10',
    figuritasIntercambiadasNombres: ['Pedri #8'],
    fecha: '2026-06-01T00:00:00Z',
    puntajeGenerador: null,
    puntajeIntercambiador: 3,
  };
}

function page(content: IntercambioDTO[], pageNum: number, totalPages: number, totalElements: number): PagedResponse<IntercambioDTO> {
  return { content, page: pageNum, size: 10, totalElements, totalPages, last: pageNum >= totalPages - 1 };
}

describe('IntercambiosPage', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('requests page 0 with size and renders rows from .content', async () => {
    getMock.mockResolvedValueOnce({ data: page([makeIntercambio('i1', 'sofi')], 0, 3, 25) });

    render(<IntercambiosPage />);

    await waitFor(() => expect(screen.getByText('@sofi')).toBeInTheDocument());

    expect(getMock).toHaveBeenCalledWith(
      '/api/intercambios/usuario/u1',
      expect.objectContaining({ params: expect.objectContaining({ page: 0, size: 10 }) }),
    );
    // badge shows totalElements, not page length
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('renders the Paginador and fetches the next page on click', async () => {
    getMock
      .mockResolvedValueOnce({ data: page([makeIntercambio('i1', 'sofi')], 0, 3, 25) })
      .mockResolvedValueOnce({ data: page([makeIntercambio('i2', 'lucas')], 1, 3, 25) });

    render(<IntercambiosPage />);
    await waitFor(() => expect(screen.getByText('@sofi')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '2' }));

    await waitFor(() => expect(screen.getByText('@lucas')).toBeInTheDocument());
    expect(getMock).toHaveBeenLastCalledWith(
      '/api/intercambios/usuario/u1',
      expect.objectContaining({ params: expect.objectContaining({ page: 1, size: 10 }) }),
    );
  });
});
