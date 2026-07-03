import '@testing-library/jest-dom';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToastProvider } from './ToastProvider';
import { useToast } from './useToast';

function Trigger() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.success('Guardado')}>ok</button>
      <button onClick={() => toast.error('Falló')}>bad</button>
    </>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('muestra un toast de éxito y lo auto-descarta', () => {
    render(<ToastProvider><Trigger /></ToastProvider>);
    fireEvent.click(screen.getByText('ok'));
    expect(screen.getByText('Guardado')).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.queryByText('Guardado')).toBeNull();
  });

  it('el toast de error usa role="alert"', () => {
    render(<ToastProvider><Trigger /></ToastProvider>);
    fireEvent.click(screen.getByText('bad'));
    expect(screen.getByRole('alert')).toHaveTextContent('Falló');
  });
});
