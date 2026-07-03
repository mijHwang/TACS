import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CatalogoGrid from './CatalogoGrid';

describe('CatalogoGrid', () => {
  it('loading: muestra skeletons', () => {
    render(<CatalogoGrid loading isEmpty={false} emptyMessage="x"><div>hijo</div></CatalogoGrid>);
    expect(screen.getAllByTestId('skeleton-card').length).toBeGreaterThan(0);
    expect(screen.queryByText('hijo')).toBeNull();
  });

  it('empty: muestra el mensaje', () => {
    render(<CatalogoGrid loading={false} isEmpty emptyMessage="Sin resultados"><div>hijo</div></CatalogoGrid>);
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
  });

  it('con datos: renderiza los hijos', () => {
    render(<CatalogoGrid loading={false} isEmpty={false} emptyMessage="x"><div>hijo</div></CatalogoGrid>);
    expect(screen.getByText('hijo')).toBeInTheDocument();
  });
});
