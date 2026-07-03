import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CatalogoCard from './CatalogoCard';
import type { FiguritaBaseDTO } from '../../../hooks/useFiguritas';

const base: FiguritaBaseDTO = {
  id: 'b1', numero: 10, jugadorNombre: 'Messi', seleccionNombre: 'ARG',
  equipoNombre: 'x', categoriaNombre: 'y', imagenUrl: null,
};

describe('CatalogoCard', () => {
  it('poseida: muestra el chip "×N" y selecciona al click', () => {
    const onSelect = vi.fn();
    render(<CatalogoCard base={base} mode="poseida" owned={2} onSelect={onSelect} />);
    expect(screen.getByText('×2')).toBeInTheDocument();
    expect(screen.getByLabelText('Tenés 2')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('catalogo-card'));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('poseida: muestra "Nueva" cuando owned=0', () => {
    render(<CatalogoCard base={base} mode="poseida" owned={0} onSelect={() => {}} />);
    expect(screen.getByText('Nueva')).toBeInTheDocument();
  });

  it('faltante: agregable dispara onAdd', () => {
    const onAdd = vi.fn();
    render(<CatalogoCard base={base} mode="faltante" inWishlist={false} onAdd={onAdd} onRemove={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /agregar/i }));
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it('faltante: en wishlist dispara onRemove', () => {
    const onRemove = vi.fn();
    render(<CatalogoCard base={base} mode="faltante" inWishlist onAdd={() => {}} onRemove={onRemove} />);
    fireEvent.click(screen.getByRole('button', { name: /quitar/i }));
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
