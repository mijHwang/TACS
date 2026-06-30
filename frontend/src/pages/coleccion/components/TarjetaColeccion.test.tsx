import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TarjetaColeccion from './TarjetaColeccion';

describe('TarjetaColeccion', () => {
  it('renderiza la imagen cuando hay imagenUrl', () => {
    render(
      <TarjetaColeccion
        seleccionNombre="Argentina" jugadorNombre="Lionel Messi"
        equipoNombre="Inter Miami" categoriaNombre="Oro"
        imagenUrl="https://img/messi.png"
      />,
    );
    const img = screen.getByRole('img', { name: 'Lionel Messi' });
    expect(img.getAttribute('src')).toBe('https://img/messi.png');
  });

  it('muestra el placeholder cuando no hay imagenUrl', () => {
    render(
      <TarjetaColeccion
        seleccionNombre="Argentina" jugadorNombre="Lionel Messi"
        equipoNombre="Inter Miami" categoriaNombre="Oro"
      />,
    );
    expect(screen.getByText('Imagen')).toBeDefined();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
