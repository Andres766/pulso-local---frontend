import type { CSSProperties } from 'react';
import type { BusinessCategory } from '../api/types';

/**
 * Color de identidad de cada rubro: le da personalidad a cada negocio (su franja, su monograma,
 * sus íconos) sin tocar los colores de los DATOS, que siguen siendo azul = satisfechos y
 * rojo = quejas. Todos tienen contraste ≥ 4,5:1 con texto blanco.
 */
export const CATEGORY_COLOR: Record<BusinessCategory, string> = {
  cafeteria: '#7a4426', // café tostado
  restaurante: '#c2410c', // brasa del fogón
  belleza: '#be185d', // magenta
  tienda: '#047857', // verde del barniz de Pasto
  servicios: '#4338ca', // índigo
  salud: '#0f766e', // verde azulado
  otro: '#334155', // pizarra
};

/** Azul del logo: color de la marca para lo que no pertenece a un negocio en particular. */
export const BRAND_COLOR = '#1c5cab';

/** Variable CSS --biz que leen las clases .biz-band, .biz-soft, .biz-ink y .biz-icon. */
export const bizStyle = (category?: BusinessCategory): CSSProperties =>
  ({ '--biz': category ? CATEGORY_COLOR[category] : BRAND_COLOR }) as CSSProperties;

/**
 * Motivo de la línea de pulso del logo, ampliado como textura de las franjas de color.
 * Decorativo: oculto para lectores de pantalla.
 */
export function PulseMotif({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 120" preserveAspectRatio="none" className={`pointer-events-none absolute ${className}`} aria-hidden>
      <path
        d="M0 70h120l18-34 26 78 22-62 14 18h90l18-40 24 70 20-48 12 18h236"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
