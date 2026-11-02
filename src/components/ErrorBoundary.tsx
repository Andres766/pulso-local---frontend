import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Icon } from './icons';
import { Button } from './ui';

interface Props {
  children: ReactNode;
  /** Al cambiar (p. ej. la ruta), el límite se reinicia y vuelve a intentar mostrar el contenido. */
  resetKey?: string;
}

interface State {
  error: Error | null;
}

/**
 * Límite de errores: si un componente falla al renderizar, se muestra un mensaje amable en lugar
 * de una pantalla en blanco. Debe ser una clase: React solo ofrece getDerivedStateFromError y
 * componentDidCatch a componentes de clase.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Solo en la consola del navegador: no se envía a ningún servicio externo.
    console.error('Error de interfaz:', error, info.componentStack);
  }

  override componentDidUpdate(prev: Props): void {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-critical-soft text-critical">
          <Icon name="alert" className="h-7 w-7" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold text-ink">Algo salió mal en esta pantalla</h1>
        <p className="mt-2 text-sm text-ink-2">Tus datos están a salvo. Recarga la página; si el problema sigue, vuelve al inicio.</p>
        <div className="mt-6 flex gap-2">
          <Button variant="secondary" onClick={() => window.location.assign('/')}>
            Ir al inicio
          </Button>
          <Button onClick={() => window.location.reload()}>Recargar</Button>
        </div>
      </div>
    );
  }
}
