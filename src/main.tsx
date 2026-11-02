import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { AuthProvider } from './auth/AuthContext';
import { ConfirmProvider } from './components/confirm';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/toast';
import { applyTheme } from './hooks/useTheme';
import './index.css';

// Se aplica el tema guardado antes del primer render para evitar un destello del tema equivocado.
applyTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
