interface InstitutionIdentity {
  officialName: string
  acronym: string
  aliases?: readonly string[]
}

/**
 * Explicit institution identities used by the SISU catalog.
 *
 * Acronyms are curated instead of generated from initials. This avoids false
 * identities such as "UFRGN" while allowing the search to cover every federal
 * university and federal institute currently present in the database.
 */
const INSTITUTION_IDENTITIES = [
  ['Centro Federal de Educação Tecnológica Celso Suckow da Fonseca', 'CEFET/RJ', ['CEFETRJ', 'CEFET-RJ']],
  ['Centro Federal de Educação Tecnológica de Minas Gerais', 'CEFET-MG', ['CEFETMG']],
  ['Colégio Pedro II', 'CPII'],
  ['Escola Nacional de Ciências Estatísticas', 'ENCE'],
  ['Escola Superior de Ciências da Saúde', 'ESCS'],
  ['Faculdade de Educação Tecnológica do Estado do Rio de Janeiro', 'FAETERJ'],
  ['Faculdade de Educação Tecnológica do Estado do Rio de Janeiro - Faeterj', 'FAETERJ'],
  ['Faculdade de Medicina de Marília', 'FAMEMA'],
  ['Fundação Universidade Federal da Grande Dourados', 'UFGD'],
  ['Fundação Universidade Federal de Ciências da Saúde de Porto Alegre', 'UFCSPA'],
  ['Fundação Universidade Federal do Abc', 'UFABC'],
  ['Fundação Universidade Federal do Pampa - Unipampa', 'UNIPAMPA'],
  ['Fundação Universidade Federal do Tocantins', 'UFT'],
  ['Fundação Universidade Federal do Vale do São Francisco', 'UNIVASF'],
  ['Fundação Universidade do Estado de Santa Catarina', 'UDESC'],
  ['Instituto Federal de Educação, Ciencia e Tecnologia de Brasilia', 'IFB'],
  ['Instituto Federal de Educação, Ciência e Tecnologia  da Paraíba', 'IFPB'],
  ['Instituto Federal de Educação, Ciência e Tecnologia  de Santa Catarina', 'IFSC'],
  ['Instituto Federal de Educação, Ciência e Tecnologia  do Amazonas', 'IFAM'],
  ['Instituto Federal de Educação, Ciência e Tecnologia  do Triângulo Mineiro', 'IFTM'],
  ['Instituto Federal de Educação, Ciência e Tecnologia Baiano', 'IFBAIANO', ['IF BAIANO']],
  ['Instituto Federal de Educação, Ciência e Tecnologia Catarinense', 'IFC'],
  ['Instituto Federal de Educação, Ciência e Tecnologia Fluminense', 'IFF', ['IFFLUMINENSE']],
  ['Instituto Federal de Educação, Ciência e Tecnologia Goiano', 'IFGOIANO', ['IF GOIANO']],
  ['Instituto Federal de Educação, Ciência e Tecnologia Sul-RioGrandense', 'IFSUL'],
  ['Instituto Federal de Educação, Ciência e Tecnologia da Bahia', 'IFBA'],
  ['Instituto Federal de Educação, Ciência e Tecnologia de Alagoas', 'IFAL'],
  ['Instituto Federal de Educação, Ciência e Tecnologia de Goiás', 'IFG'],
  ['Instituto Federal de Educação, Ciência e Tecnologia de Mato Grosso do Sul', 'IFMS'],
  ['Instituto Federal de Educação, Ciência e Tecnologia de Minas Gerais', 'IFMG'],
  ['Instituto Federal de Educação, Ciência e Tecnologia de Pernambuco', 'IFPE'],
  ['Instituto Federal de Educação, Ciência e Tecnologia de Roraima', 'IFRR'],
  ['Instituto Federal de Educação, Ciência e Tecnologia de Sergipe', 'IFS'],
  ['Instituto Federal de Educação, Ciência e Tecnologia de São Paulo', 'IFSP'],
  ['Instituto Federal de Educação, Ciência e Tecnologia do Amapá', 'IFAP'],
  ['Instituto Federal de Educação, Ciência e Tecnologia do Ceará', 'IFCE'],
  ['Instituto Federal de Educação, Ciência e Tecnologia do Espírito Santo', 'IFES'],
  ['Instituto Federal de Educação, Ciência e Tecnologia do Maranhão', 'IFMA'],
  ['Instituto Federal de Educação, Ciência e Tecnologia do Norte de Minas Gerais', 'IFNMG'],
  ['Instituto Federal de Educação, Ciência e Tecnologia do Piauí', 'IFPI'],
  ['Instituto Federal de Educação, Ciência e Tecnologia do Rio Grande do Norte', 'IFRN'],
  ['Instituto Federal de Educação, Ciência e Tecnologia do Rio de Janeiro', 'IFRJ'],
  ['Instituto Federal de Educação, Ciência e Tecnologia do Sertão Pernambucano', 'IFSERTAOPE', ['IFSERTÃOPE']],
  ['Instituto Federal de Educação, Ciência e Tecnologia do Sudeste de Minas Gerais', 'IFSUDESTEMG', ['IF SUDESTE MG', 'IFSUDMG']],
  ['Instituto Federal de Educação, Ciência e Tecnologia do Sul de Minas Gerais', 'IFSULDEMINAS'],
  ['Instituto Federal de Educação, Ciência e Tecnologia do Tocantins', 'IFTO'],
  ['Universidade Estadual da Paraíba', 'UEPB'],
  ['Universidade Estadual de Alagoas - Uneal', 'UNEAL'],
  ['Universidade Estadual de Feira de Santana', 'UEFS'],
  ['Universidade Estadual de Londrina', 'UEL'],
  ['Universidade Estadual de Maringá', 'UEM'],
  ['Universidade Estadual de Mato Grosso do Sul', 'UEMS'],
  ['Universidade Estadual de Montes Claros', 'UNIMONTES'],
  ['Universidade Estadual de Santa Cruz', 'UESC'],
  ['Universidade Estadual do Centro Oeste', 'UNICENTRO'],
  ['Universidade Estadual do Norte Fluminense Darcy Ribeiro', 'UENF'],
  ['Universidade Estadual do Norte do Paraná', 'UENP'],
  ['Universidade Estadual do Oeste do Paraná', 'UNIOESTE'],
  ['Universidade Estadual do Paraná', 'UNESPAR'],
  ['Universidade Estadual do Piauí', 'UESPI'],
  ['Universidade Estadual do Rio Grande do Sul', 'UERGS'],
  ['Universidade Estadual do Sudoeste da Bahia', 'UESB'],
  ['Universidade Federal Fluminense', 'UFF'],
  ['Universidade Federal Rural da Amazônia', 'UFRA'],
  ['Universidade Federal Rural de Pernambuco', 'UFRPE'],
  ['Universidade Federal Rural do Rio de Janeiro', 'UFRRJ'],
  ['Universidade Federal Rural do Semi-Árido', 'UFERSA'],
  ['Universidade Federal da Bahia', 'UFBA'],
  ['Universidade Federal da Fronteira Sul', 'UFFS'],
  ['Universidade Federal da Integração Latino-Americana', 'UNILA'],
  ['Universidade Federal da Paraíba', 'UFPB'],
  ['Universidade Federal de Alagoas', 'UFAL'],
  ['Universidade Federal de Alfenas', 'UNIFAL-MG', ['UNIFAL', 'UNIFALMG']],
  ['Universidade Federal de Campina Grande', 'UFCG'],
  ['Universidade Federal de Catalão', 'UFCAT'],
  ['Universidade Federal de Goiás', 'UFG'],
  ['Universidade Federal de Itajubá - Unifei', 'UNIFEI'],
  ['Universidade Federal de Jataí', 'UFJ'],
  ['Universidade Federal de Juiz de Fora', 'UFJF'],
  ['Universidade Federal de Lavras', 'UFLA'],
  ['Universidade Federal de Mato Grosso', 'UFMT'],
  ['Universidade Federal de Mato Grosso do Sul', 'UFMS'],
  ['Universidade Federal de Minas Gerais', 'UFMG'],
  ['Universidade Federal de Ouro Preto', 'UFOP'],
  ['Universidade Federal de Pelotas', 'UFPEL'],
  ['Universidade Federal de Pernambuco', 'UFPE'],
  ['Universidade Federal de Rondonópolis', 'UFR'],
  ['Universidade Federal de Roraima', 'UFRR'],
  ['Universidade Federal de Santa Catarina', 'UFSC'],
  ['Universidade Federal de Santa Maria', 'UFSM'],
  ['Universidade Federal de Sergipe', 'UFS'],
  ['Universidade Federal de São Carlos', 'UFSCAR'],
  ['Universidade Federal de São João del Rei', 'UFSJ'],
  ['Universidade Federal de São Paulo', 'UNIFESP'],
  ['Universidade Federal de Uberlândia', 'UFU'],
  ['Universidade Federal de Viçosa', 'UFV'],
  ['Universidade Federal do Acre', 'UFAC'],
  ['Universidade Federal do Agreste de Pernambuco', 'UFAPE'],
  ['Universidade Federal do Amazonas', 'UFAM'],
  ['Universidade Federal do Cariri', 'UFCA'],
  ['Universidade Federal do Ceará', 'UFC'],
  ['Universidade Federal do Delta do Parnaiba', 'UFDPAR'],
  ['Universidade Federal do Espírito Santo', 'UFES'],
  ['Universidade Federal do Estado do Rio de Janeiro', 'UNIRIO'],
  ['Universidade Federal do Maranhão', 'UFMA'],
  ['Universidade Federal do Norte do Tocantins', 'UFNT'],
  ['Universidade Federal do Oeste da Bahia', 'UFOB'],
  ['Universidade Federal do Paraná', 'UFPR'],
  ['Universidade Federal do Piauí', 'UFPI'],
  ['Universidade Federal do Recôncavo da Bahia', 'UFRB'],
  ['Universidade Federal do Rio Grande', 'FURG'],
  ['Universidade Federal do Rio Grande do Norte', 'UFRN'],
  ['Universidade Federal do Rio Grande do Sul', 'UFRGS'],
  ['Universidade Federal do Rio de Janeiro', 'UFRJ'],
  ['Universidade Federal do Sul da Bahia', 'UFSB'],
  ['Universidade Federal do Sul e Sudeste do Pará', 'UNIFESSPA'],
  ['Universidade Federal do Triângulo Mineiro', 'UFTM'],
  ['Universidade Federal dos Vales do Jequitinhonha e Mucuri', 'UFVJM'],
  ['Universidade Tecnológica Federal do Paraná', 'UTFPR'],
  ['Universidade da Integração Internacional da Lusofonia Afro-Brasileira', 'UNILAB'],
  ['Universidade de Brasília', 'UNB'],
  ['Universidade de Pernambuco', 'UPE'],
  ['Universidade do Estado da Bahia', 'UNEB'],
  ['Universidade do Estado de Mato Grosso Carlos Alberto Reyes Maldonado - Unemat', 'UNEMAT'],
  ['Universidade do Estado de Minas Gerais', 'UEMG'],
  ['Universidade do Estado do Rio Grande do Norte', 'UERN'],
] as const satisfies readonly (
  readonly [string, string] | readonly [string, string, readonly string[]]
)[]

function normalizeInstitutionName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleUpperCase('pt-BR')
}

const identities: InstitutionIdentity[] = INSTITUTION_IDENTITIES.map(
  ([officialName, acronym, aliases]) => ({ officialName, acronym, aliases })
)

const IDENTITY_BY_OFFICIAL_NAME = new Map<string, InstitutionIdentity>(
  identities.map(identity => [normalizeInstitutionName(identity.officialName), identity])
)

const IDENTITIES_BY_ALIAS = new Map<string, InstitutionIdentity[]>()
for (const identity of identities) {
  for (const alias of [identity.acronym, ...(identity.aliases || [])]) {
    const normalizedAlias = normalizeInstitutionName(alias)
    const existing = IDENTITIES_BY_ALIAS.get(normalizedAlias) || []
    existing.push(identity)
    IDENTITIES_BY_ALIAS.set(normalizedAlias, existing)
  }
}

export function resolveUniversityAcronym(name: string | null): string | null {
  if (!name?.trim()) return null
  return IDENTITY_BY_OFFICIAL_NAME.get(normalizeInstitutionName(name))?.acronym ?? null
}

export function resolveOfficialInstitutionNameByAcronym(
  acronym: string | null
): string | null {
  return resolveOfficialInstitutionNamesByAcronym(acronym)[0] ?? null
}

export function resolveOfficialInstitutionNamesByAcronym(
  acronym: string | null
): string[] {
  if (!acronym?.trim()) return []
  return (IDENTITIES_BY_ALIAS.get(normalizeInstitutionName(acronym)) || [])
    .map(identity => identity.officialName)
}

export function getInstitutionSearchAliases(name: string | null): string[] {
  if (!name?.trim()) return []
  const identity = IDENTITY_BY_OFFICIAL_NAME.get(normalizeInstitutionName(name))
  return identity ? [identity.acronym, ...(identity.aliases || [])] : []
}
