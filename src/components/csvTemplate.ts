/**
 * Plantilla de importación: las mismas columnas que reconoce el backend, separador ";" y BOM para
 * que Excel (configuración regional es-CO) la abra con las tildes bien y en columnas separadas.
 */
const ROWS = {
  es: [
    ['fecha', 'comentario', 'calificacion'],
    ['15/10/2026', 'El café delicioso y la atención muy amable', '5'],
    ['16/10/2026', 'Se demoraron 30 minutos con el pedido', '2'],
    ['17/10/2026', 'Buen precio, aunque el local estaba lleno', '4'],
  ],
  // Encabezados en inglés que el backend también reconoce (date, review, rating).
  en: [
    ['date', 'review', 'rating'],
    ['15/10/2026', 'Delicious coffee and very friendly service', '5'],
    ['16/10/2026', 'They took 30 minutes with the order', '2'],
    ['17/10/2026', 'Good price, although the place was packed', '4'],
  ],
};

export function buildCsvTemplate(lang: 'es' | 'en' = 'es'): Blob {
  const body = ROWS[lang].map((r) => r.join(';')).join('\r\n');
  return new Blob([`﻿${body}\r\n`], { type: 'text/csv;charset=utf-8' });
}
