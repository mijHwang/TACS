import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SeedDemoCard from './SeedDemoCard';

describe('SeedDemoCard', () => {
  it('habilita confirmar solo al tipear RESET y dispara onSeed', () => {
    const onSeed = vi.fn().mockResolvedValue({ mensaje: 'ok' });
    render(<SeedDemoCard onSeed={onSeed} />);

    fireEvent.click(screen.getByText('Resetear base y cargar datos de demo'));

    const confirmar = screen.getByRole('button', { name: 'Confirmar reset' }) as HTMLButtonElement;
    expect(confirmar.disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText('Escribí RESET'), { target: { value: 'RESET' } });
    expect(confirmar.disabled).toBe(false);

    fireEvent.click(confirmar);
    expect(onSeed).toHaveBeenCalledTimes(1);
  });
});
