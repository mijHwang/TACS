import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

function Boom(): never {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra el fallback cuando un hijo lanza', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Algo salió mal.')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeDefined();
  });

  it('renderiza los hijos cuando no hay error', () => {
    render(
      <ErrorBoundary>
        <p>contenido ok</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('contenido ok')).toBeDefined();
  });
});
