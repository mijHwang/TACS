import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ColeccionPage from './ColeccionPage';

describe('ColeccionPage tabs', () => {
  it('muestra solo Mis repetidas y Mis faltantes (Todas oculta)', () => {
    render(
      <MemoryRouter>
        <ColeccionPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Mis repetidas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mis faltantes' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Todas' })).not.toBeInTheDocument();
  });
});
