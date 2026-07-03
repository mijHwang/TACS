import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PublicarCantidadModal from './PublicarCantidadModal';

describe('PublicarCantidadModal', () => {
  it('confirma con la cantidad 1 por defecto', () => {
    const onConfirm = vi.fn();
    render(<PublicarCantidadModal jugadorNombre="Messi" max={3} onConfirm={onConfirm} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Publicar 1 copia/i }));
    expect(onConfirm).toHaveBeenCalledWith(1);
  });

  it('sube la cantidad y la clampea en max', () => {
    const onConfirm = vi.fn();
    render(<PublicarCantidadModal jugadorNombre="Messi" max={2} onConfirm={onConfirm} onClose={() => {}} />);
    const sumar = screen.getByLabelText('Sumar una copia');
    fireEvent.click(sumar);
    expect(screen.getByTestId('cantidad')).toHaveTextContent('2');
    expect(sumar).toBeDisabled(); // no pasa de max=2
    fireEvent.click(screen.getByRole('button', { name: /Publicar 2 copias/i }));
    expect(onConfirm).toHaveBeenCalledWith(2);
  });

  it('no baja de 1', () => {
    render(<PublicarCantidadModal jugadorNombre="Messi" max={3} onConfirm={() => {}} onClose={() => {}} />);
    expect(screen.getByLabelText('Restar una copia')).toBeDisabled();
    expect(screen.getByTestId('cantidad')).toHaveTextContent('1');
  });

  it('Cancelar dispara onClose sin confirmar', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(<PublicarCantidadModal jugadorNombre="Messi" max={3} onConfirm={onConfirm} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('mientras publica deshabilita el confirmar', () => {
    const onConfirm = vi.fn();
    render(<PublicarCantidadModal jugadorNombre="Messi" max={3} busy onConfirm={onConfirm} onClose={() => {}} />);
    const confirmar = screen.getByRole('button', { name: /Publicando/i });
    expect(confirmar).toBeDisabled();
    fireEvent.click(confirmar);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
