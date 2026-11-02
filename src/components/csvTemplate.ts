/**
 * Plantilla de importación: las mismas columnas que reconoce el backend, separador ";" y BOM para
 * que Excel (configuración regional es-CO) la abra con las tildes bien y en columnas separadas.
 */
const ROWS = [
  ['fecha', 'comentario', 'calificacion'],
  ['15/10/2026', 'El café delicioso y la atención muy amable', '5'],
  ['16/10/2026', 'Se demoraron 30 minutos con el pedido', '2'],
  ['17/10/2026', 'Buen precio, aunque el local estaba lleno', '4'],
];

export function buildCsvTemplate(): Blob {
  const body = ROWS.map((r) => r.join(';')).join('\r\n');
  return new Blob([`﻿${body}\r\n`], { type: 'text/csv;charset=utf-8' });
}
