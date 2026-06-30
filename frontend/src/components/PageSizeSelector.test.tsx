import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PageSizeSelector from './PageSizeSelector';

describe('PageSizeSelector', () => {
  it('renders every option and reflects the current value', () => {
    render(<PageSizeSelector value={20} options={[10, 20, 50, 100]} onChange={() => {}} />);
    const select = screen.getByLabelText('Cantidad por página') as HTMLSelectElement;
    expect(select.value).toBe('20');
    [10, 20, 50, 100].forEach((n) =>
      expect(screen.getByRole('option', { name: String(n) })).toBeInTheDocument(),
    );
  });

  it('emits the chosen size as a number', () => {
    const onChange = vi.fn();
    render(<PageSizeSelector value={10} options={[10, 20, 50, 100]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Cantidad por página'), { target: { value: '50' } });
    expect(onChange).toHaveBeenCalledWith(50);
  });
});
