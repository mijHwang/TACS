import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StarRating from './StarRating';

describe('StarRating', () => {
  it('renderiza 5 estrellas y expone el score por aria-label', () => {
    const { container } = render(<StarRating score={3.5} />);
    expect(container.querySelectorAll('svg').length).toBe(5);
    expect(screen.getByRole('img', { name: /3\.5/ })).toBeDefined();
  });
});
