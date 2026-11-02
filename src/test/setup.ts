import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// jsdom no implementa matchMedia: se simula un sistema en tema claro.
vi.stubGlobal(
  'matchMedia',
  vi.fn((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
);

// Cada prueba empieza con el DOM y el almacenamiento limpios.
afterEach(() => {
  cleanup();
  localStorage.clear();
});
