import { Suspense } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import router from './router/router';
import queryClient from './lib/queryClient';
import ErrorBoundary from './components/ErrorBoundary';

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen w-screen bg-bg text-primary text-sm tracking-widest">
      Cargando…
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <RouterProvider router={router} />
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
