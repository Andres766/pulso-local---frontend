import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { RequireAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { FullPageSpinner } from './components/ui';
import { AuthPage } from './pages/AuthPage';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * Carga diferida: cada página privada es un archivo JavaScript aparte que se descarga al entrar
 * a ella. El login (lo primero que se ve) no arrastra el dashboard, sus gráficos ni sus tablas.
 */
const BusinessesPage = lazy(() => import('./pages/BusinessesPage').then((m) => ({ default: m.BusinessesPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const AccountPage = lazy(() => import('./pages/AccountPage').then((m) => ({ default: m.AccountPage })));

/** Mapa de rutas de la aplicación. Las privadas comparten el Layout y exigen sesión. */
export function App() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/registro" element={<AuthPage mode="register" />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<BusinessesPage />} />
          <Route path="/negocios/:id" element={<DashboardPage />} />
          <Route path="/cuenta" element={<AccountPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
