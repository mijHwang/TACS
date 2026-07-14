import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ColeccionPage from './ColeccionPage';

describe('ColeccionPage tabs', () => {
  it('muestra Todas, Mis repetidas y Mis faltantes', () => {
    render(
      <MemoryRouter>
        <ColeccionPage />
      </MemoryRouter>,
    );
    // Now we expect all three to be in the document
    expect(screen.getByRole('link', { name: 'Todas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mis repetidas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mis faltantes' })).toBeInTheDocument();
  });
});
