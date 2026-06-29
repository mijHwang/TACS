import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StarRating from './StarRating';

describe('StarRating', () => {
  it('renderiza 5 estrellas y expone el score por aria-label', () => {
    const { container } = render(<StarRating score={3.5} />);
    expect(container.querySelectorAll('svg').length).toBe(5);
    expect(screen.getByRole('img', { name: /3\.5/ })).toBeDefined();
  });

  it('aplica el prop size como atributo width/height del svg', () => {
    const { container } = render(<StarRating score={3} size={20} />);
    expect(container.querySelector('svg')?.getAttribute('width')).toBe('20');
  });

  it('usa emptyColor como stop-color del segundo stop del gradiente', () => {
    const { container } = render(<StarRating score={0} emptyColor="#D1FAE5" />);
    expect(container.querySelector('stop[stop-color="#D1FAE5"]')).not.toBeNull();
  });
});
