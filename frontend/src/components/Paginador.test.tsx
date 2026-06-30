import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Paginador from './Paginador';

describe('Paginador', () => {
  it('renders nothing when there is a single page', () => {
    const { container } = render(<Paginador page={0} totalPages={1} onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows 1-based labels for 0-based pages and marks the current one', () => {
    render(<Paginador page={0} totalPages={3} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
  });

  it('calls onChange with the 0-based target page', () => {
    const onChange = vi.fn();
    render(<Paginador page={0} totalPages={3} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('disables prev on first and next on last page', () => {
    const { rerender } = render(<Paginador page={0} totalPages={3} onChange={() => {}} />);
    expect(screen.getByLabelText('Página anterior')).toBeDisabled();
    rerender(<Paginador page={2} totalPages={3} onChange={() => {}} />);
    expect(screen.getByLabelText('Página siguiente')).toBeDisabled();
  });

  it('windows the number buttons for large totalPages', () => {
    render(<Paginador page={10} totalPages={50} onChange={() => {}} />);
    // current page label is 11; window of 7 around it
    expect(screen.getByRole('button', { name: '11' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('button', { name: '1' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '50' })).not.toBeInTheDocument();
  });
});
