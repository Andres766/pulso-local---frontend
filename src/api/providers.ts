/** Traduce el identificador que guarda el backend ("gemini:gemini-3.5-flash") a algo legible. */
export interface ProviderInfo {
  name: string;
  model: string | null;
  /** true si el reporte lo produjo un modelo de lenguaje (y no el analizador léxico local). */
  isLlm: boolean;
}

const LLM_NAMES: Record<string, string> = { claude: 'Claude', gemini: 'Gemini' };

export function describeProvider(id: string): ProviderInfo {
  const [vendor = '', ...rest] = id.split(':');
  const name = LLM_NAMES[vendor];
  if (!name) return { name: 'Léxico local', model: null, isLlm: false };
  return { name, model: rest.join(':') || null, isLlm: true };
}

export const providerLabel = (id: string): string => {
  const p = describeProvider(id);
  return p.isLlm ? `${p.name}${p.model ? ` · ${p.model}` : ''}` : 'Analizador léxico local';
};
