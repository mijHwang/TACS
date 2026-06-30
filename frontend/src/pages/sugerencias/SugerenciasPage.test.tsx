import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { PagedResponse } from '../../services/api';
import type { SugerenciaResponseDTO } from '../../hooks/useSugerencias';
import type { FiguritaResponseDTO } from '../../hooks/useFiguritas';

// Mock router + auth so the page renders standalone.
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../../auth/useAuth', () => ({ useAuth: () => ({ user: { username: 'lio' } }) }));

// Mock the data hook; capture the page argument it is called with.
const useSugerencias = vi.fn();
vi.mock('../../hooks/useSugerencias', () => ({
  useSugerencias: (...args: unknown[]) => useSugerencias(...args),
}));

import SugerenciasPage from './SugerenciasPage';

const messi: FiguritaResponseDTO = {
  id: 'f1', figuritaBaseId: 'b1', numero: 10,
  jugadorNombre: 'Messi', seleccionNombre: 'Argentina', equipoNombre: 'PSG',
  categoriaNombre: 'normal', count: 1, ownerId: 'c1', ownerName: 'sofi',
};

const sugerencia: SugerenciaResponseDTO = {
  contraparteId: 'c1',
  contraparteNombre: 'sofi',
  figuritasARecibir: [messi],
  figuritasAOfrecer: [],
};

function page(content: SugerenciaResponseDTO[], totalPages: number): PagedResponse<SugerenciaResponseDTO> {
  return { content, page: 0, size: 10, totalElements: content.length, totalPages, last: totalPages <= 1 };
}

describe('SugerenciasPage', () => {
  beforeEach(() => useSugerencias.mockReset());

  it('renderiza las sugerencias del content paginado', () => {
    useSugerencias.mockReturnValue({ data: page([sugerencia], 1), isLoading: false, isError: false, refetch: vi.fn() });
    render(<SugerenciasPage />);
    expect(screen.getByText('Con @sofi')).toBeInTheDocument();
    expect(screen.getByText(/Messi/)).toBeInTheDocument();
  });

  it('al pasar de página vuelve a pedir el hook con la página 0-based destino', () => {
    useSugerencias.mockReturnValue({ data: page([sugerencia], 3), isLoading: false, isError: false, refetch: vi.fn() });
    render(<SugerenciasPage />);
    // arranca en página 0
    expect(useSugerencias).toHaveBeenLastCalledWith('lio', 0, 10);
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(useSugerencias).toHaveBeenLastCalledWith('lio', 1, 10);
  });
});
