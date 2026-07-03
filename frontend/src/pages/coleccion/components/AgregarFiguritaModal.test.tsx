import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../../../components/toast/ToastProvider';
import AgregarFiguritaModal from './AgregarFiguritaModal';

vi.mock('../../../auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u9', username: 'sofi' } }),
}));

const getMock = vi.fn();
const putMock = vi.fn();
const postMock = vi.fn();
const delMock = vi.fn();
vi.mock('../../../services/api', async () => {
  const actual = await vi.importActual<typeof import('../../../services/api')>('../../../services/api');
  return {
    ...actual,
    default: {
      get: (...a: unknown[]) => getMock(...a),
      put: (...a: unknown[]) => putMock(...a),
      post: (...a: unknown[]) => postMock(...a),
      delete: (...a: unknown[]) => delMock(...a),
    },
  };
});

function ui(node: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}><ToastProvider>{node}</ToastProvider></QueryClientProvider>);
}

const basePage = (over = {}) => ({ data: { content: [{
  id: 'b1', numero: 10, jugadorNombre: 'Messi', seleccionNombre: 'ARG', equipoNombre: 'x', categoriaNombre: 'y', imagenUrl: null,
}], page: 0, size: 10, totalElements: 1, totalPages: 1, last: true, ...over } });

function routeGet(url: string) {
  if (url === '/api/figuritas-base/search') return Promise.resolve(basePage());
  if (url === '/api/usuarios/sofi/figuritas') return Promise.resolve({ data: { content: [{ figuritaBaseId: 'b1', count: 2 }] } });
  if (url === '/api/usuarios/sofi/figuritas/faltantes') return Promise.resolve({ data: { content: [], last: true } });
  return Promise.resolve({ data: { content: [], last: true } });
}

describe('AgregarFiguritaModal', () => {
  beforeEach(() => {
    getMock.mockReset(); putMock.mockReset(); postMock.mockReset(); delMock.mockReset();
    getMock.mockImplementation((url: string) => routeGet(url));
  });

  it('poseida: muestra "Tenés 2", abre el configurador y guarda el total', async () => {
    putMock.mockResolvedValueOnce({ data: {} });
    ui(<AgregarFiguritaModal mode="poseida" onClose={() => {}} onDone={() => {}} />);

    await waitFor(() => expect(screen.getByText('×2')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('catalogo-card'));
    fireEvent.click(screen.getByLabelText('Sumar una copia'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(putMock).toHaveBeenCalledWith('/api/usuarios/sofi/figuritas/b1', { cantidad: 3 }));
    expect(await screen.findByText(/ahora tenés 3/i)).toBeInTheDocument();
  });

  it('faltante: un error de POST muestra toast de error', async () => {
    postMock.mockRejectedValueOnce({ response: { status: 409 } });
    ui(<AgregarFiguritaModal mode="faltante" onClose={() => {}} onDone={() => {}} />);

    await waitFor(() => expect(screen.getByRole('button', { name: /agregar/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /agregar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ya tenés esta figurita.');
  });
});
