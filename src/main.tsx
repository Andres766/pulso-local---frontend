import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { AuthProvider } from './auth/AuthContext';
import { ConfirmProvider } from './components/confirm';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/toast';
import { applyTheme } from './hooks/useTheme';
import { applyLang, I18nProvider } from './i18n/I18nContext';
import './index.css';

// Se aplica el tema guardado antes del primer render para evitar un destello del tema equivocado.
applyTheme();
applyLang();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
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
    </I18nProvider>
  </StrictMode>,
);
