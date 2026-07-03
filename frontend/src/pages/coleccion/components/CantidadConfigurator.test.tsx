import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CantidadConfigurator from './CantidadConfigurator';
import type { FiguritaBaseDTO } from '../../../hooks/useFiguritas';

const base: FiguritaBaseDTO = {
  id: 'b1', numero: 10, jugadorNombre: 'Messi', seleccionNombre: 'ARG',
  equipoNombre: 'x', categoriaNombre: 'y', imagenUrl: null,
};

describe('CantidadConfigurator', () => {
  it('subir habilita Guardar y emite el nuevo total', () => {
    const onSave = vi.fn();
    render(<CantidadConfigurator base={base} current={2} onSave={onSave} onCancel={() => {}} />);
    fireEvent.click(screen.getByLabelText('Sumar una copia'));
    const guardar = screen.getByRole('button', { name: 'Guardar' });
    expect(guardar).not.toBeDisabled();
    fireEvent.click(guardar);
    expect(onSave).toHaveBeenCalledWith(3);
  });

  it('sin cambios: Guardar deshabilitado', () => {
    render(<CantidadConfigurator base={base} current={2} onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('bajar muestra el aviso y el botón de liberar', () => {
    const onSave = vi.fn();
    render(<CantidadConfigurator base={base} current={3} onSave={onSave} onCancel={() => {}} />);
    fireEvent.click(screen.getByLabelText('Restar una copia'));
    fireEvent.click(screen.getByLabelText('Restar una copia'));
    expect(screen.getByRole('alert')).toHaveTextContent(/se liberan 2 copias/i);
    const liberar = screen.getByRole('button', { name: 'Liberar 2 copias' });
    fireEvent.click(liberar);
    expect(onSave).toHaveBeenCalledWith(1);
  });
});
