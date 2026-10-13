import { applyTheme } from './useTheme';

/** Dispara la descarga de un blob con un nombre de archivo, sin abrir pestañas nuevas. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Imprime el reporte (el usuario elige "Guardar como PDF"). El papel siempre va en tema claro:
 * se fuerza durante la impresión y luego se restaura la preferencia del usuario.
 */
export function printReport(): void {
  const previous = document.documentElement.dataset.theme;
  document.documentElement.dataset.theme = 'light';
  const restore = () => {
    if (previous) document.documentElement.dataset.theme = previous;
    else applyTheme();
    window.removeEventListener('afterprint', restore);
  };
  window.addEventListener('afterprint', restore);
  window.print();
}
