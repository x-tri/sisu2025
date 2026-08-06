export interface BrazilianState {
  code: string
  name: string
}

/** All 26 Brazilian states plus the Federal District. */
export const BRAZILIAN_STATES = [
  { code: 'AC', name: 'Acre' },
  { code: 'AL', name: 'Alagoas' },
  { code: 'AP', name: 'Amapá' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'BA', name: 'Bahia' },
  { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Distrito Federal' },
  { code: 'ES', name: 'Espírito Santo' },
  { code: 'GO', name: 'Goiás' },
  { code: 'MA', name: 'Maranhão' },
  { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'PA', name: 'Pará' },
  { code: 'PB', name: 'Paraíba' },
  { code: 'PR', name: 'Paraná' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'PI', name: 'Piauí' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'RO', name: 'Rondônia' },
  { code: 'RR', name: 'Roraima' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'São Paulo' },
  { code: 'SE', name: 'Sergipe' },
  { code: 'TO', name: 'Tocantins' },
] as const satisfies readonly BrazilianState[]

/** Normalize Brazilian names and codes for accent- and case-insensitive matching. */
export function normalizeBrazilianState(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleUpperCase('pt-BR')
}

const STATE_CODE_BY_QUERY = new Map<string, string>()
const STATE_NAME_BY_CODE = new Map<string, string>()

for (const state of BRAZILIAN_STATES) {
  STATE_CODE_BY_QUERY.set(normalizeBrazilianState(state.code), state.code)
  STATE_CODE_BY_QUERY.set(normalizeBrazilianState(state.name), state.code)
  STATE_NAME_BY_CODE.set(state.code, state.name)
}

/** Resolve either a UF code or a full state name to its canonical UF code. */
export function resolveBrazilianStateCode(query: string | null | undefined): string | null {
  if (!query?.trim()) return null
  return STATE_CODE_BY_QUERY.get(normalizeBrazilianState(query)) ?? null
}

/** Return the full Portuguese state name for a UF code. */
export function getBrazilianStateName(code: string | null | undefined): string | null {
  if (!code?.trim()) return null
  const normalizedCode = resolveBrazilianStateCode(code)
  return normalizedCode ? STATE_NAME_BY_CODE.get(normalizedCode) ?? null : null
}
