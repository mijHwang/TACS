import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TodasPage from './TodasPage';
import type { FiltrosColeccion, FiguritaResponseDTO } from '../../hooks/useFiguritas';

let lastParams: FiltrosColeccion | undefined;
const hookMock = vi.fn();
vi.mock('../../hooks/useFiguritas', () => ({
  useFiguritasPaginadas: (_u: string | undefined, p: FiltrosColeccion) => { lastParams = p; return hookMock(p); },
}));
vi.mock('../../auth/useAuth', () => ({ useAuth: () => ({ user: { username: 'sofi', id: 'me' } }) }));

const fig = (id: string, nombre: string): FiguritaResponseDTO => ({
  id, figuritaBaseId: id, numero: 1, jugadorNombre: nombre, seleccionNombre: 'ARG',
  equipoNombre: 'x', categoriaNombre: 'y', count: 2, ownerId: 'me', ownerName: 'sofi', imagenUrl: null,
});

const pageData = (pageNum: number) => ({
  data: { content: [fig('b1', 'Messi'), fig('b2', 'Dibu')], page: pageNum, size: 10, totalElements: 25, totalPages: 3, last: false },
  isLoading: false,
});

describe('TodasPage', () => {
  beforeEach(() => { lastParams = undefined; hookMock.mockReset(); hookMock.mockReturnValue(pageData(0)); });

  it('renderiza la colección paginada con <Paginador>', () => {
    render(<MemoryRouter><TodasPage /></MemoryRouter>);
    expect(screen.getByText('Messi')).toBeInTheDocument();
    expect(screen.getByText('Dibu')).toBeInTheDocument();
    expect(screen.getByLabelText('Página siguiente')).toBeInTheDocument();
    expect(lastParams?.page).toBe(0);
  });

  it('cambiar de página re-pide con page:1', () => {
    render(<MemoryRouter><TodasPage /></MemoryRouter>);
    fireEvent.click(screen.getByLabelText('Página siguiente'));
    expect(lastParams?.page).toBe(1);
  });
});
