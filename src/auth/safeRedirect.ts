/**
 * Destino seguro tras iniciar sesión (previene open redirect). Solo se aceptan rutas internas:
 * deben empezar por "/" y no por "//" ni "/\" (los navegadores tratan la barra invertida como "/",
 * así que "/\evil.com" equivale a "//evil.com", otro dominio). Tampoco caracteres de control.
 */
export function safeRedirect(from: unknown, fallback = '/'): string {
  if (typeof from !== 'string' || from.length > 512) return fallback;
  // biome-ignore lint/suspicious/noControlCharactersInRegex: justamente se buscan caracteres de control para rechazarlos
  if (!from.startsWith('/') || from.startsWith('//') || from.startsWith('/\\') || /[\u0000-\u001f\u007f]/.test(from)) {
    return fallback;
  }
  return from;
}
