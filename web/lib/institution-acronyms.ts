interface VerifiedInstitutionAcronym {
  officialName: string
  acronym: string
  sourceUrl: string
}

/**
 * Institution acronyms are identities, not mechanically derived labels.
 *
 * Keep this registry explicit and only add an entry after checking the
 * institution's official publication. Unknown institutions intentionally
 * resolve to `null`, so callers display the complete name instead of an
 * invented acronym.
 */
const VERIFIED_INSTITUTION_ACRONYMS = [
  {
    officialName: 'Universidade Federal do Rio Grande do Norte',
    acronym: 'UFRN',
    sourceUrl: 'https://www.ufrn.br/',
  },
] as const satisfies readonly VerifiedInstitutionAcronym[]

function normalizeInstitutionName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleUpperCase('pt-BR')
}

const ACRONYM_BY_OFFICIAL_NAME = new Map<string, string>(
  VERIFIED_INSTITUTION_ACRONYMS.map(institution => [
    normalizeInstitutionName(institution.officialName),
    institution.acronym,
  ])
)

export function resolveUniversityAcronym(name: string | null): string | null {
  if (!name?.trim()) return null
  return ACRONYM_BY_OFFICIAL_NAME.get(normalizeInstitutionName(name)) ?? null
}
