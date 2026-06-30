import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ListToolbar from './ListToolbar';

describe('ListToolbar', () => {
  it('shows the pluralized result count and renders children', () => {
    render(
      <ListToolbar total={25}>
        <span>child</span>
      </ListToolbar>,
    );
    expect(screen.getByText('25 resultados')).toBeInTheDocument();
    expect(screen.getByText('child')).toBeInTheDocument();
  });

  it('uses the singular for exactly one result', () => {
    render(
      <ListToolbar total={1}>
        <span />
      </ListToolbar>,
    );
    expect(screen.getByText('1 resultado')).toBeInTheDocument();
  });

  it('omits the counter when total is undefined', () => {
    render(
      <ListToolbar>
        <span>only child</span>
      </ListToolbar>,
    );
    expect(screen.queryByText(/resultado/)).not.toBeInTheDocument();
  });
});
