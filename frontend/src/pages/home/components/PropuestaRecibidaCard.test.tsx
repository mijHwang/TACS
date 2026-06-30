import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PropuestaRecibidaCard from './PropuestaRecibidaCard';
import type { PropuestaVM } from '../../../types/dashboard';

const vm: PropuestaVM = {
  id: 's1', tipo: 'recibida', contraparte: 'sofi',
  ofrece: ['Pedri #8'], pide: 'Messi #10', estado: 'PENDIENTE',
};

describe('PropuestaRecibidaCard', () => {
  it('muestra contraparte y dispara onAceptar', () => {
    const onAceptar = vi.fn();
    render(<PropuestaRecibidaCard propuesta={vm} onAceptar={onAceptar} onRechazar={vi.fn()} />);
    expect(screen.getByText('@sofi')).toBeDefined();
    fireEvent.click(screen.getByText('Aceptar'));
    expect(onAceptar).toHaveBeenCalledWith('s1');
  });

  it('sin botones si no esta pendiente', () => {
    render(<PropuestaRecibidaCard propuesta={{ ...vm, estado: 'ACEPTADO' }} onAceptar={vi.fn()} onRechazar={vi.fn()} />);
    expect(screen.queryByText('Aceptar')).toBeNull();
  });
});
