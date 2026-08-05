export const MODALITY_OPTIONS = [
    { code: 'ampla', name: 'Ampla Concorrência', shortName: 'Ampla' },
    { code: 'L1', name: 'Escola Pública + Renda ≤ 1 salário mínimo per capita', shortName: 'EP + renda' },
    { code: 'L2', name: 'Escola Pública + Renda + PPI', shortName: 'L2 (EP+Renda+PPI)' },
    { code: 'L5', name: 'Escola Pública (Independente de Renda)', shortName: 'L5 (EP)' },
    { code: 'L6', name: 'Escola Pública + PPI (Independente de Renda)', shortName: 'L6 (EP+PPI)' },
    { code: 'L9', name: 'Escola Pública + Renda + PcD', shortName: 'L9 (EP+Renda+PcD)' },
    { code: 'L10', name: 'Escola Pública + Renda + PPI + PcD', shortName: 'L10 (EP+Renda+PPI+PcD)' },
    { code: 'L13', name: 'Escola Pública + PcD (Independente de Renda)', shortName: 'L13 (EP+PcD)' },
    { code: 'L14', name: 'Escola Pública + PPI + PcD (Independente de Renda)', shortName: 'L14 (EP+PPI+PcD)' },
    { code: 'quilombola', name: 'Quilombolas', shortName: 'Quilombolas' },
    { code: 'indigenas', name: 'Indígenas', shortName: 'Indígenas' },
    { code: 'ciganos', name: 'Ciganos', shortName: 'Ciganos' },
    { code: 'trans', name: 'Pessoas Trans', shortName: 'Trans' },
    { code: 'deficiencia', name: 'Pessoas com Deficiência (Geral)', shortName: 'PcD' },
    { code: 'rural', name: 'Educação do Campo', shortName: 'Rural' },
];

/**
 * Numeric identifiers currently emitted by the SISU source. They are kept as
 * the canonical identity; the aliases exist only to support legacy UI labels.
 * Unknown identifiers must never be interpreted as ampla concorrência.
 */
export const OFFICIAL_MODALITY_ALIASES: Record<string, string> = {
    '41': 'ampla',
    '682': 'L2',
    '683': 'L6',
    '684': 'L13',
    '685': 'L9',
    '686': 'L1',
    '687': 'L5',
    '689': 'quilombola',
};

export function canonicalModalityId(
    modalityCode: string | number | null | undefined,
    modalityName?: string,
): string {
    if (modalityCode !== null && modalityCode !== undefined && String(modalityCode).trim() !== '') {
        return String(modalityCode);
    }

    const derived = getModalityCode(modalityName || '');
    return derived === 'other' ? '' : derived;
}

export function getModalityAlias(modalityId: string): string {
    return OFFICIAL_MODALITY_ALIASES[modalityId] || modalityId;
}

export function getModalityCode(modalityName: string): string {
    if (!modalityName) return 'other';
    const name = modalityName.toLowerCase();

    // Check for explicit codes first (common in SISU data)
    // Note: Checking specific to generic to avoid false positives (e.g. L10 vs L1)
    if (name.includes('(l1 ')) return 'L1';
    if (name.includes(' l1 ')) return 'L1';
    if (name.includes('(l2 ')) return 'L2';
    if (name.includes(' l2 ')) return 'L2';
    if (name.includes('(l5 ')) return 'L5';
    if (name.includes(' l5 ')) return 'L5';
    if (name.includes('(l6 ')) return 'L6';
    if (name.includes(' l6 ')) return 'L6';
    if (name.includes('(l9 ')) return 'L9';
    if (name.includes(' l9 ')) return 'L9';
    if (name.includes('(l10')) return 'L10';
    if (name.includes(' l10')) return 'L10';
    if (name.includes('(l13')) return 'L13';
    if (name.includes(' l13')) return 'L13';
    if (name.includes('(l14')) return 'L14';
    if (name.includes(' l14')) return 'L14';

    if (name.includes('ampla')) return 'ampla';

    // PcD + PPI + Renda
    if (name.includes('deficiência') && name.includes('pretos') && name.includes('1,5')) return 'L10';
    if (name.includes('deficiência') && name.includes('pretos') && name.includes('1 salário')) return 'L10';

    // PcD + PPI (sem renda)
    if (name.includes('deficiência') && name.includes('pretos') && name.includes('independente')) return 'L14';

    // PcD + Renda
    if (name.includes('deficiência') && name.includes('1,5')) return 'L9';
    if (name.includes('deficiência') && name.includes('1 salário')) return 'L9';

    // PcD (sem renda)
    if (name.includes('deficiência') && name.includes('independente')) return 'L13';

    // PPI + Renda
    if (name.includes('pretos') && name.includes('1,5')) return 'L2';
    if (name.includes('pretos') && name.includes('1 salário')) return 'L2';

    // PPI (sem renda)
    if (name.includes('pretos') && name.includes('independente')) return 'L6';

    // Renda only
    if (name.includes('1,5') || name.includes('1 salário')) return 'L1';

    // Escola pública (sem renda)
    if (name.includes('independente')) return 'L5';

    // Quilombola
    if (name.includes('quilombola')) return 'quilombola';

    // Indígenas
    if (name.includes('indígena') || name.includes('indigena')) return 'indigenas';

    // Ciganos
    if (name.includes('cigano')) return 'ciganos';

    // Trans / Travestis
    if (name.includes('trans') || name.includes('travesti')) return 'trans';

    // Deficiência (Generico/Outros) - if not matched by specific L-codes
    if (name.includes('deficiência')) return 'deficiencia';

    // Rural / Campo
    if (name.includes('campo') || name.includes('rural')) return 'rural';

    return 'other';
}

// Function to match user-selected modality to database modality
export function matchModality<T extends { modality_name: string; modality_code?: string | number }>(selectedCode: string, availableModalities: T[]): T | null {
    if (!selectedCode) return null;

    const exactMatch = availableModalities.find((modality) =>
        modality.modality_code !== undefined &&
        modality.modality_code !== null &&
        String(modality.modality_code) === selectedCode
    );
    if (exactMatch) return exactMatch;

    // An official numeric id is an exact identity, never a category alias.
    if (/^\d+$/.test(selectedCode)) return null;

    const selectedAlias = getModalityAlias(selectedCode);

    if (selectedAlias === 'ampla') {
        return availableModalities.find(m => m.modality_name?.toLowerCase().includes('ampla')) || null;
    }

    // Generic PCD wildcard: if user selects 'deficiencia', match any specific PCD quota
    if (selectedAlias === 'deficiencia') {
        return availableModalities.find(m => {
            const derivedCode = getModalityCode(m.modality_name);
            return ['L9', 'L10', 'L13', 'L14', 'deficiencia'].includes(derivedCode);
        }) || null;
    }

    // Try to match by derived code
    for (const mod of availableModalities) {
        const derivedCode = getModalityCode(mod.modality_name);
        if (derivedCode === selectedAlias) {
            return mod;
        }
    }

    return null;
}
