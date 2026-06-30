import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NuevaPage from './NuevaPage';
import type { FiguritaResponseDTO } from '../../hooks/useFiguritas';

const figs: FiguritaResponseDTO[] = Array.from({ length: 12 }, (_, i) => ({
  id: `f${i + 1}`, figuritaBaseId: `b${i + 1}`, numero: i + 1, jugadorNombre: `Jugador ${i + 1}`,
  seleccionNombre: 'ARG', equipoNombre: 'x', categoriaNombre: 'y', count: 1,
  ownerId: 'me', ownerName: 'sofi', imagenUrl: null,
}));

vi.mock('../../hooks/useFiguritas', () => ({ useFiguritas: () => ({ data: figs }) }));
vi.mock('../../hooks/usePropuestas', () => ({ useCrearPropuesta: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock('../../auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'me', username: 'sofi' } }) }));

function renderPage() {
  render(<MemoryRouter><NuevaPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /Qué figuritas ofreces/ }));
}

describe('NuevaPage — selección paginada client-side', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('muestra 10 por página y un Paginador', () => {
    renderPage();
    expect(screen.getAllByRole('checkbox')).toHaveLength(10);
    expect(screen.getByLabelText('Página siguiente')).toBeInTheDocument();
  });

  it('la selección persiste al cambiar de página', () => {
    renderPage();
    const primera = screen.getAllByRole('checkbox')[0];
    fireEvent.click(primera);
    expect(primera).toBeChecked();

    fireEvent.click(screen.getByLabelText('Página siguiente'));   // página 2 (f11, f12)
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);

    fireEvent.click(screen.getByLabelText('Página anterior'));    // vuelve a página 1
    expect(screen.getAllByRole('checkbox')[0]).toBeChecked();
  });
});
