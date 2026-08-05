export const SCORE_SUBJECTS = [
    'redacao',
    'linguagens',
    'humanas',
    'natureza',
    'matematica',
] as const;

export type ScoreSubject = typeof SCORE_SUBJECTS[number];

export interface Scores {
    redacao: number;
    linguagens: number;
    humanas: number;
    natureza: number;
    matematica: number;
}

export const DEFAULT_SCORES: Readonly<Scores> = Object.freeze({
    redacao: 0,
    linguagens: 0,
    humanas: 0,
    natureza: 0,
    matematica: 0,
});

export interface CourseWeights {
    peso_red?: number | null;
    peso_ling?: number | null;
    peso_ch?: number | null;
    peso_cn?: number | null;
    peso_mat?: number | null;
    min_red?: number | null;
    min_ling?: number | null;
    min_ch?: number | null;
    min_cn?: number | null;
    min_mat?: number | null;
    min_enem?: number | null;
}

export interface ScoreValidationIssue {
    subject: ScoreSubject;
    reason: 'missing' | 'not_finite' | 'out_of_range';
    value: unknown;
}

export type ScoreValidationResult =
    | { valid: true; scores: Scores; issues: [] }
    | { valid: false; scores: null; issues: ScoreValidationIssue[] };

export type WeightStatus = 'provided' | 'null' | 'missing' | 'invalid';

export interface ResolvedWeight {
    key: keyof CourseWeights;
    rawValue: unknown;
    value: number | null;
    status: WeightStatus;
}

export interface MinimumViolation {
    subject: ScoreSubject | 'enem';
    actual: number;
    required: number;
}

export interface MinimumCheck {
    status: 'passed' | 'failed' | 'not_evaluated' | 'not_applicable';
    violations: MinimumViolation[];
    unevaluated: Array<ScoreSubject | 'enem'>;
}

export interface WeightedScoreResult {
    average: number | null;
    totalWeight: number;
    weights: Record<ScoreSubject, ResolvedWeight>;
    scoreValidation: ScoreValidationResult;
    minimums: MinimumCheck;
}

const WEIGHT_KEYS: Record<ScoreSubject, keyof CourseWeights> = {
    redacao: 'peso_red',
    linguagens: 'peso_ling',
    humanas: 'peso_ch',
    natureza: 'peso_cn',
    matematica: 'peso_mat',
};

const MINIMUM_KEYS: Record<ScoreSubject, keyof CourseWeights> = {
    redacao: 'min_red',
    linguagens: 'min_ling',
    humanas: 'min_ch',
    natureza: 'min_cn',
    matematica: 'min_mat',
};

export const SCORE_STORAGE_KEY = 'sisu_scores';
export const SCORE_STORAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SCORE_STORAGE_VERSION = 1;

export function isValidScore(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000;
}

export function validateScores(value: unknown): ScoreValidationResult {
    const candidate = value && typeof value === 'object'
        ? value as Record<string, unknown>
        : {};
    const issues: ScoreValidationIssue[] = [];
    const validated: Partial<Scores> = {};

    for (const subject of SCORE_SUBJECTS) {
        const score = candidate[subject];
        if (score === undefined) {
            issues.push({ subject, reason: 'missing', value: score });
        } else if (typeof score !== 'number' || !Number.isFinite(score)) {
            issues.push({ subject, reason: 'not_finite', value: score });
        } else if (score < 0 || score > 1000) {
            issues.push({ subject, reason: 'out_of_range', value: score });
        } else {
            validated[subject] = score;
        }
    }

    if (issues.length > 0) {
        return { valid: false, scores: null, issues };
    }

    return { valid: true, scores: validated as Scores, issues: [] };
}

function resolveWeight(
    weights: CourseWeights | null | undefined,
    subject: ScoreSubject,
): ResolvedWeight {
    const key = WEIGHT_KEYS[subject];
    const hasKey = weights !== null
        && weights !== undefined
        && Object.prototype.hasOwnProperty.call(weights, key);

    if (!hasKey || weights?.[key] === undefined) {
        return { key, rawValue: undefined, value: null, status: 'missing' };
    }

    const rawValue = weights[key];
    if (rawValue === null) {
        return { key, rawValue, value: null, status: 'null' };
    }

    if (typeof rawValue !== 'number' || !Number.isFinite(rawValue) || rawValue < 0) {
        return { key, rawValue, value: null, status: 'invalid' };
    }

    return { key, rawValue, value: rawValue, status: 'provided' };
}

function checkMinimums(
    scores: Scores | null,
    weights: CourseWeights | null | undefined,
    average: number | null,
): MinimumCheck {
    if (!weights) {
        return { status: 'not_applicable', violations: [], unevaluated: [] };
    }

    const violations: MinimumViolation[] = [];
    const unevaluated: Array<ScoreSubject | 'enem'> = [];
    let requirementCount = 0;

    for (const subject of SCORE_SUBJECTS) {
        const minimum = weights[MINIMUM_KEYS[subject]];
        if (minimum === null || minimum === undefined) continue;

        requirementCount += 1;
        if (!isValidScore(minimum) || !scores) {
            unevaluated.push(subject);
        } else if (scores[subject] < minimum) {
            violations.push({ subject, actual: scores[subject], required: minimum });
        }
    }

    const enemMinimum = weights.min_enem;
    if (enemMinimum !== null && enemMinimum !== undefined) {
        requirementCount += 1;
        if (!isValidScore(enemMinimum) || average === null) {
            unevaluated.push('enem');
        } else if (average < enemMinimum) {
            violations.push({ subject: 'enem', actual: average, required: enemMinimum });
        }
    }

    if (requirementCount === 0) {
        return { status: 'not_applicable', violations, unevaluated };
    }
    if (violations.length > 0) {
        return { status: 'failed', violations, unevaluated };
    }
    if (unevaluated.length > 0) {
        return { status: 'not_evaluated', violations, unevaluated };
    }
    return { status: 'passed', violations, unevaluated };
}

/**
 * Calculates a weighted ENEM score without inventing missing data.
 *
 * A weight of zero is valid and stays zero. A null or absent weight makes the
 * result unavailable, and the diagnostic metadata preserves which case occurred.
 */
export function calculateWeightedScore(
    scoresInput: unknown,
    weightsInput: CourseWeights | null | undefined,
): WeightedScoreResult {
    const scoreValidation = validateScores(scoresInput);
    const resolvedWeights = {} as Record<ScoreSubject, ResolvedWeight>;

    for (const subject of SCORE_SUBJECTS) {
        resolvedWeights[subject] = resolveWeight(weightsInput, subject);
    }

    const allWeightsProvided = SCORE_SUBJECTS.every(
        subject => resolvedWeights[subject].status === 'provided',
    );
    const totalWeight = SCORE_SUBJECTS.reduce(
        (total, subject) => total + (resolvedWeights[subject].value ?? 0),
        0,
    );

    let average: number | null = null;
    if (scoreValidation.valid && allWeightsProvided && totalWeight > 0) {
        const weightedSum = SCORE_SUBJECTS.reduce(
            (total, subject) => total
                + scoreValidation.scores[subject] * (resolvedWeights[subject].value as number),
            0,
        );
        average = weightedSum / totalWeight;
    }

    return {
        average,
        totalWeight,
        weights: resolvedWeights,
        scoreValidation,
        minimums: checkMinimums(
            scoreValidation.valid ? scoreValidation.scores : null,
            weightsInput,
            average,
        ),
    };
}

interface PersistedScoresEnvelope {
    version: number;
    consent: true;
    savedAt: number;
    expiresAt: number;
    scores: Scores;
}

export type PersistedScoresReadResult =
    | { status: 'valid'; scores: Scores; expiresAt: number }
    | { status: 'empty' | 'invalid' | 'expired'; scores: null; expiresAt: null };

export function serializePersistedScores(scoresInput: unknown, now = Date.now()): string {
    const validation = validateScores(scoresInput);
    if (!validation.valid || !Number.isFinite(now)) {
        throw new RangeError('Scores and timestamp must be valid before persistence.');
    }

    const envelope: PersistedScoresEnvelope = {
        version: SCORE_STORAGE_VERSION,
        consent: true,
        savedAt: now,
        expiresAt: now + SCORE_STORAGE_TTL_MS,
        scores: validation.scores,
    };
    return JSON.stringify(envelope);
}

export function readPersistedScores(
    rawValue: string | null,
    now = Date.now(),
): PersistedScoresReadResult {
    if (!rawValue) {
        return { status: 'empty', scores: null, expiresAt: null };
    }

    try {
        const envelope = JSON.parse(rawValue) as Partial<PersistedScoresEnvelope>;
        const validation = validateScores(envelope.scores);
        const timestampsAreValid = typeof envelope.savedAt === 'number'
            && Number.isFinite(envelope.savedAt)
            && typeof envelope.expiresAt === 'number'
            && Number.isFinite(envelope.expiresAt)
            && envelope.expiresAt > envelope.savedAt
            && envelope.expiresAt - envelope.savedAt <= SCORE_STORAGE_TTL_MS;

        if (
            envelope.version !== SCORE_STORAGE_VERSION
            || envelope.consent !== true
            || !timestampsAreValid
            || !validation.valid
        ) {
            return { status: 'invalid', scores: null, expiresAt: null };
        }

        if (!Number.isFinite(now) || now >= envelope.expiresAt!) {
            return { status: 'expired', scores: null, expiresAt: null };
        }

        return {
            status: 'valid',
            scores: validation.scores,
            expiresAt: envelope.expiresAt!,
        };
    } catch {
        return { status: 'invalid', scores: null, expiresAt: null };
    }
}

export type ScoreMarginRelation = 'above' | 'below' | 'equal' | 'unavailable';

export interface ScoreMargin {
    points: number | null;
    relation: ScoreMarginRelation;
}

export function getScoreMargin(userScore: unknown, cutScore: unknown): ScoreMargin {
    if (!isValidScore(userScore) || !isValidScore(cutScore) || cutScore <= 0) {
        return { points: null, relation: 'unavailable' };
    }

    const points = userScore - cutScore;
    if (points > 0) return { points, relation: 'above' };
    if (points < 0) return { points, relation: 'below' };
    return { points: 0, relation: 'equal' };
}

export function formatScore(value: number): string {
    return value.toFixed(2).replace('.', ',');
}

export function formatSignedScore(value: number): string {
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${formatScore(value)}`;
}

export interface ShareScoreReference {
    name: string;
    university: string;
    cut_score: number;
}

export function buildScoreShareText(
    course: ShareScoreReference,
    userScore: number,
): string {
    const margin = getScoreMargin(userScore, course.cut_score);
    const header = `Minha média para ${course.name} na ${course.university} é ${formatScore(userScore)}.`;

    let comparison = 'A nota de corte de referência ainda não está disponível.';
    if (margin.points !== null) {
        const absoluteMargin = formatScore(Math.abs(margin.points));
        if (margin.relation === 'equal') {
            comparison = `Ela coincide com a nota de corte de referência (${formatScore(course.cut_score)}).`;
        } else {
            const direction = margin.relation === 'above' ? 'acima' : 'abaixo';
            comparison = `Ela está ${absoluteMargin} pontos ${direction} da nota de corte de referência (${formatScore(course.cut_score)}).`;
        }
    }

    return `${header} ${comparison}\n\nEsta é uma comparação descritiva: a nota de corte pode mudar e não representa resultado oficial.\n\nConsulte em xtrisisu.com`;
}
