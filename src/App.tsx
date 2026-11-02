import { Route, Routes } from 'react-router';
import { RequireAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { AccountPage } from './pages/AccountPage';
import { AuthPage } from './pages/AuthPage';
import { BusinessesPage } from './pages/BusinessesPage';
import { DashboardPage } from './pages/DashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';

/** Mapa de rutas de la aplicación. Las privadas comparten el Layout y exigen sesión. */
export function App() {
  return (
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
  );
}
