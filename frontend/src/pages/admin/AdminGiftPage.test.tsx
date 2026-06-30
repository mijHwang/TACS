import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminGiftPage from './AdminGiftPage';

vi.mock('../../hooks/useBaseSearch', () => ({
  useBaseSearch: () => ({
    data: {
      content: [{ id: 'b10', numero: 10, jugadorNombre: 'Messi', seleccionNombre: 'ARG', equipoNombre: 'x', categoriaNombre: 'y', imagenUrl: null }],
      page: 0, size: 10, totalElements: 1, totalPages: 1, last: true,
    },
    isFetching: false,
  }),
}));

describe('AdminGiftPage — typeahead de figurita-base', () => {
  it('reemplaza el <select> por un buscador con resultados y permite seleccionar', () => {
    render(<MemoryRouter><AdminGiftPage /></MemoryRouter>);

    // Ya no existe el dropdown gigante.
    expect(screen.queryByText('-- Elige una figurita --')).not.toBeInTheDocument();

    // El resultado del typeahead aparece y se puede elegir.
    fireEvent.click(screen.getByRole('button', { name: /#10 - Messi/ }));
    expect(screen.getByText('✓ #10 - Messi (ARG)')).toBeInTheDocument();
  });
});
