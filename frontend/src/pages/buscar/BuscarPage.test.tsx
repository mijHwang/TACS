import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BuscarPage from './BuscarPage';
import type { CatalogoParams } from '../../hooks/useCatalogoFiguritas';

let lastParams: CatalogoParams | undefined;
const useCatalogoMock = vi.fn();
vi.mock('../../hooks/useCatalogoFiguritas', () => ({
  useCatalogoFiguritas: (p: CatalogoParams) => { lastParams = p; return useCatalogoMock(p); },
}));
vi.mock('../../auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'me', username: 'sofi' } }) }));

const pageData = (pageNum: number) => ({
  data: {
    content: [{
      id: 'f1', figuritaBaseId: 'b1', numero: 10, jugadorNombre: 'Messi', seleccionNombre: 'ARG',
      equipoNombre: 'x', categoriaNombre: 'y', count: 1, ownerId: 'u9', ownerName: 'jorge', imagenUrl: null,
    }],
    page: pageNum, size: 10, totalElements: 25, totalPages: 3, last: false,
  },
  isLoading: false,
});

describe('BuscarPage', () => {
  beforeEach(() => {
    lastParams = undefined;
    useCatalogoMock.mockReset();
    useCatalogoMock.mockReturnValue(pageData(0));
  });

  it('renderiza el catálogo paginado y excluye lo propio vía usuarioId', () => {
    render(<MemoryRouter><BuscarPage /></MemoryRouter>);
    expect(screen.getByText('Messi')).toBeInTheDocument();
    expect(screen.getByLabelText('Página siguiente')).toBeInTheDocument();
    expect(lastParams?.usuarioId).toBe('me');
    expect(lastParams?.page).toBe(0);
  });

  it('pasar de página pide page:1 al hook', () => {
    render(<MemoryRouter><BuscarPage /></MemoryRouter>);
    fireEvent.click(screen.getByLabelText('Página siguiente'));
    expect(lastParams?.page).toBe(1);
  });
});
