import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { describeProvider, providerLabel } from '../api/providers';
import { ConfirmProvider, useConfirm } from './confirm';
import { Delta, TopicEvolution } from './evolution';
import { ThemeToggle } from './ThemeToggle';
import { ToastProvider, useToast } from './toast';

describe('describeProvider', () => {
  it('reconoce los modelos de lenguaje y el motor local', () => {
    expect(describeProvider('gemini:gemini-3.5-flash')).toEqual({ name: 'Gemini', model: 'gemini-3.5-flash', isLlm: true });
    expect(describeProvider('claude:claude-opus-5')).toMatchObject({ name: 'Claude', isLlm: true });
    expect(describeProvider('heuristico:lexico-es-v1')).toEqual({ name: 'Léxico local', model: null, isLlm: false });
    expect(providerLabel('gemini:gemini-3.5-flash')).toBe('Gemini · gemini-3.5-flash');
  });
});

describe('Delta', () => {
  it('menos quejas se muestra como mejora (verde) y con flecha y signo, no solo con color', () => {
    render(<Delta value={-3.2} goodWhen="down" />);
    const delta = screen.getByText(/3,2 pts/);
    expect(delta).toHaveTextContent('−3,2 pts');
    expect(delta).toHaveClass('text-good');
  });

  it('más reseñas negativas es un empeoramiento (rojo) y un cambio mínimo se informa como "sin cambios"', () => {
    const { rerender } = render(<Delta value={6.8} goodWhen="down" />);
    expect(screen.getByText(/6,8 pts/)).toHaveClass('text-critical');
    rerender(<Delta value={0.01} goodWhen="up" />);
    expect(screen.getByText(/Sin cambios/)).toBeInTheDocument();
  });
});

describe('TopicEvolution', () => {
  it('lista primero lo que empeoró, porque es lo que hay que atender', () => {
    render(
      <TopicEvolution
        comparison={{
          previousTotalReviews: 40,
          positiveShareDelta: 0,
          negativeShareDelta: 0,
          averageScoreDelta: 0,
          topics: [
            { key: 'precio', name: 'Precio', complaintShare: 5, previousComplaintShare: 10, complaintDelta: -5, trend: 'improved' },
            { key: 'espera', name: 'Espera', complaintShare: 20, previousComplaintShare: 10, complaintDelta: 10, trend: 'worsened' },
            { key: 'pagos', name: 'Pagos', complaintShare: 2, previousComplaintShare: null, complaintDelta: null, trend: 'new' },
          ],
        }}
      />,
    );
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getByRole('rowheader').textContent)).toEqual(['Espera', 'Pagos', 'Precio']);
    expect(within(rows[0]!).getByText(/Empeoró/)).toBeInTheDocument();
  });
});

describe('ThemeToggle', () => {
  it('es un grupo de radios accesible y aplica el tema elegido al documento', async () => {
    render(<ThemeToggle />);
    const group = screen.getByRole('group', { name: 'Tema de la interfaz' });
    await userEvent.click(within(group).getByRole('radio', { name: 'Tema oscuro' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(within(group).getByRole('radio', { name: 'Tema oscuro' })).toBeChecked();

    await userEvent.click(within(group).getByRole('radio', { name: 'Tema claro' }));
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});

/** Botones que disparan notificaciones (a nivel de módulo, como exige React). */
function Trigger() {
  const toast = useToast();
  return (
    <>
      <button type="button" onClick={() => toast.success('Guardado')}>
        ok
      </button>
      <button type="button" onClick={() => toast.error('Falló')}>
        error
      </button>
    </>
  );
}

describe('Notificaciones', () => {
  it('se anuncian (status o alert), no se acumulan más de 3 y se cierran solas', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByText('ok'));
    fireEvent.click(screen.getByText('error'));

    expect(screen.getAllByRole('status').filter((n) => n.textContent?.includes('Guardado'))).toHaveLength(2);
    expect(screen.getByRole('alert')).toHaveTextContent('Falló');

    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByText('Guardado')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});

/** Pide confirmación y muestra el resultado (a nivel de módulo, como exige React). */
function AskToDelete({ requireText }: { requireText?: string }) {
  const confirm = useConfirm();
  const [answer, setAnswer] = useState('sin respuesta');
  return (
    <>
      <button
        type="button"
        onClick={async () =>
          setAnswer(String(await confirm({ title: '¿Eliminar?', message: 'No se puede deshacer', danger: true, requireText })))
        }
      >
        borrar
      </button>
      <output>{answer}</output>
    </>
  );
}

describe('Diálogo de confirmación', () => {
  it('resuelve true al confirmar y false al cancelar', async () => {
    render(
      <ConfirmProvider>
        <AskToDelete />
      </ConfirmProvider>,
    );
    await userEvent.click(screen.getByText('borrar'));
    expect(screen.getByRole('dialog', { name: '¿Eliminar?' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(screen.getByText('true')).toBeInTheDocument();

    await userEvent.click(screen.getByText('borrar'));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('false')).toBeInTheDocument();
  });

  it('para acciones irreversibles exige escribir el texto exacto', async () => {
    render(
      <ConfirmProvider>
        <AskToDelete requireText="Café Galeras" />
      </ConfirmProvider>,
    );
    await userEvent.click(screen.getByText('borrar'));
    const ok = screen.getByRole('button', { name: 'Confirmar' });
    expect(ok).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Escribe «Café Galeras»/), 'Café');
    expect(ok).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Escribe «Café Galeras»/), ' Galeras');
    expect(ok).toBeEnabled();
  });
});
