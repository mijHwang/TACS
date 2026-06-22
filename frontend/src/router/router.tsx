import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import MainLayout from '../layouts/MainLayout';
import PrivateRoute from '../components/PrivateRoute';
import PublicRoute from '../components/PublicRoute';

// ── Páginas públicas ──────────────────────────────────────────────────────────
const LoginPage = lazy(() => import('../pages/login/LoginPage'));
const RegisterPage = lazy(() => import('../pages/registro/RegisterPage'));

// ── Páginas protegidas ────────────────────────────────────────────────────────
const DashboardPage = lazy(() => import('../pages/home/DashboardPage'));
const BuscarPage = lazy(() => import('../pages/buscar/BuscarPage'));
const SugerenciasPage = lazy(() => import('../pages/sugerencias/SugerenciasPage'));
const IntercambiosPage = lazy(() => import('../pages/intercambios/IntercambiosPage'));
const NotificacionesPage = lazy(() => import('../pages/notificaciones/NotificacionesPage'));
const PerfilPage = lazy(() => import('../pages/perfil/PerfilPage'));
const HistorialPage = lazy(() => import('../pages/perfil/HistorialPage'));

// Colección
const ColeccionPage = lazy(() => import('../pages/coleccion/ColeccionPage'));
const TodasPage = lazy(() => import('../pages/coleccion/TodasPage'));
const RepetidasPage = lazy(() => import('../pages/coleccion/RepetidasPage'));
const FaltantesPage = lazy(() => import('../pages/coleccion/FaltantesPage'));

// Propuestas
const PropuestasPage = lazy(() => import('../pages/propuestas/PropuestasPage'));
const PropNuevaPage = lazy(() => import('../pages/propuestas/NuevaPage'));
const PropRecibidasPage = lazy(() => import('../pages/propuestas/RecibidasPage'));
const PropEnviadasPage = lazy(() => import('../pages/propuestas/EnviadasPage'));

// Subastas
const SubastasPage = lazy(() => import('../pages/subastas/SubastasPage'));
const SubNuevaPage = lazy(() => import('../pages/subastas/NuevaPage'));
const SubActivasPage = lazy(() => import('../pages/subastas/ActivasPage'));
const SubMiasPage = lazy(() => import('../pages/subastas/MiasPage'));
const SubParticipandoPage = lazy(() => import('../pages/subastas/ParticipandoPage'));

// Admin (solo rol "admin")
const AdminPage = lazy(() => import('../pages/admin/AdminPage'));
const AdminGiftPage = lazy(() => import('../pages/admin/AdminGiftPage'));

// ── Router ────────────────────────────────────────────────────────────────────
const router = createBrowserRouter([
  // Rutas públicas — redirigen al dashboard si ya está autenticado
  {
    element: <PublicRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },

  // Rutas protegidas — cualquier usuario autenticado
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'buscar', element: <BuscarPage /> },
          { path: 'sugerencias', element: <SugerenciasPage /> },
          { path: 'intercambios', element: <IntercambiosPage /> },
          { path: 'notificaciones', element: <NotificacionesPage /> },
          { path: 'perfil', element: <PerfilPage /> },
          { path: 'perfil/historial', element: <HistorialPage /> },

          // Colección
          {
            path: 'coleccion',
            element: <ColeccionPage />,
            children: [
              { index: true, element: <TodasPage /> },
              { path: 'repetidas', element: <RepetidasPage /> },
              { path: 'faltantes', element: <FaltantesPage /> },
            ],
          },

          // Propuestas
          {
            path: 'propuestas',
            element: <PropuestasPage />,
            children: [
              { path: 'nueva', element: <PropNuevaPage /> },
              { path: 'recibidas', element: <PropRecibidasPage /> },
              { path: 'enviadas', element: <PropEnviadasPage /> },
            ],
          },

          // Subastas
          {
            path: 'subastas',
            element: <SubastasPage />,
            children: [
              { index: true, element: <Navigate to="activas" replace /> },
              { path: 'nueva', element: <SubNuevaPage /> },
              { path: 'activas', element: <SubActivasPage /> },
              { path: 'mias', element: <SubMiasPage /> },
              { path: 'participando', element: <SubParticipandoPage /> },
            ],
          },
        ],
      },
    ],
  },

  // Rutas protegidas — solo rol "admin"
  {
    element: <PrivateRoute requiredRole="admin" />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { path: 'admin', element: <AdminPage /> },
          { path: 'admin/gift', element: <AdminGiftPage /> },
        ],
      },
    ],
  },

  // Catch-all
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

export default router;
