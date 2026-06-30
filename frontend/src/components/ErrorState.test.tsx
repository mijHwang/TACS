import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorState from './ErrorState';

describe('ErrorState', () => {
  it('muestra el mensaje y dispara onRetry', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Falló la carga." onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Falló la carga.')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('sin botón si no se pasa onRetry', () => {
    render(<ErrorState message="Solo mensaje." />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('muestra el mensaje por defecto cuando no se pasa message', () => {
    render(<ErrorState onRetry={() => {}} />);
    expect(screen.getByText('No se pudo cargar la información.')).toBeDefined();
  });
});
