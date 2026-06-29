import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('muestra título y subtítulo', () => {
    render(<EmptyState title="Nada acá" subtitle="Volvé más tarde." />);
    expect(screen.getByText('Nada acá')).toBeDefined();
    expect(screen.getByText('Volvé más tarde.')).toBeDefined();
  });

  it('usa el icon provisto en lugar del fallback', () => {
    render(<EmptyState title="T" icon={<span data-testid="custom-icon" />} />);
    expect(screen.getByTestId('custom-icon')).toBeDefined();
  });

  it('renderiza un ícono fallback cuando no se pasa icon', () => {
    const { container } = render(<EmptyState title="T" />);
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
