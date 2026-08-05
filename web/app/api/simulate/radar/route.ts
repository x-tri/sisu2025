import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getModalityCode } from '@/utils/modality';
import { getReferenceVerification } from '@/lib/course-reference';

type ModalityCode =
    | 'ampla'
    | 'L1'
    | 'L2'
    | 'L5'
    | 'L6'
    | 'L9'
    | 'L10'
    | 'L13'
    | 'L14'
    | 'quilombola'
    | 'indigenas'
    | 'ciganos'
    | 'trans'
    | 'deficiencia'
    | 'rural'
    | 'other';

type ScoreType = 'final' | 'partial';

interface Grades {
    redacao: number;
    linguagens: number;
    humanas: number;
    natureza: number;
    matematica: number;
}

interface PartialScore {
    day: string | number;
    score: number;
}

interface CutScoreRecord {
    year: number;
    modality_name: string;
    modality_code: number | null;
    cut_score: number | string | null;
    vacancies: number | null;
    partial_scores?: PartialScore[] | null;
    captured_at: string | null;
}

interface CourseWeightsRecord {
    year: number;
    peso_red: number | string | null;
    peso_ling: number | string | null;
    peso_mat: number | string | null;
    peso_ch: number | string | null;
    peso_cn: number | string | null;
}

interface RadarCourse {
    id: number;
    code: number;
    name: string;
    university: string | null;
    campus: string | null;
    city: string | null;
    state: string | null;
    degree: string | null;
    schedule: string | null;
    latitude: string | number | null;
    longitude: string | number | null;
    course_weights?: CourseWeightsRecord[] | null;
    cut_scores?: CutScoreRecord[] | null;
}

interface EffectiveCutScore {
    score: number;
    type: ScoreType;
    capturedAt: string | null;
    partialDay: number | null;
}

// Identifiers observed across the historical and current SISU datasets. Values
// marked as `other` are intentionally kept distinct from ampla concorrencia.
const NUMERIC_MODALITY_CODES: Record<number, ModalityCode> = {
    41: 'ampla',
    111: 'other',
    220: 'L6',
    221: 'L2',
    233: 'L14',
    234: 'L10',
    242: 'L9',
    243: 'L13',
    249: 'L1',
    289: 'L5',
    608: 'L2',
    609: 'L6',
    610: 'L13',
    611: 'L9',
    612: 'L1',
    613: 'L5',
    614: 'quilombola',
    615: 'quilombola',
    652: 'other',
    682: 'L2',
    683: 'L6',
    684: 'L13',
    685: 'L9',
    686: 'L1',
    687: 'L5',
    688: 'quilombola',
    689: 'quilombola',
};

const VALID_MODALITY_CODES: readonly ModalityCode[] = [
    'ampla',
    'L1',
    'L2',
    'L5',
    'L6',
    'L9',
    'L10',
    'L13',
    'L14',
    'quilombola',
    'indigenas',
    'ciganos',
    'trans',
    'deficiencia',
    'rural',
];

const RESPONSE_HEADERS = {
    'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
    'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
};

function jsonResponse(body: unknown, status = 200): NextResponse {
    return NextResponse.json(body, { status, headers: RESPONSE_HEADERS });
}

function normalizeCourseName(name: string): string {
    return name
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLocaleLowerCase('pt-BR');
}

function normalizeRequestedModality(code: unknown): number | null {
    const value = typeof code === 'number'
        ? code
        : typeof code === 'string' && /^\d+$/.test(code.trim())
            ? Number(code.trim())
            : Number.NaN;
    return Number.isInteger(value) && value > 0 ? value : null;
}

function modalityCodeForScore(score: CutScoreRecord): ModalityCode | null {
    if (score.modality_code !== null) {
        const mapped = NUMERIC_MODALITY_CODES[score.modality_code];
        if (mapped && mapped !== 'other') return mapped;
    }

    const derived = getModalityCode(score.modality_name) as ModalityCode;
    return derived === 'other' ? null : derived;
}

function matchesModality(score: CutScoreRecord, requested: ModalityCode): boolean {
    const candidate = modalityCodeForScore(score);
    if (!candidate) return false;

    if (requested === 'deficiencia') {
        return ['L9', 'L10', 'L13', 'L14', 'deficiencia'].includes(candidate);
    }

    return candidate === requested;
}

function matchesExactModality(score: CutScoreRecord, requested: ModalityCode): boolean {
    return modalityCodeForScore(score) === requested;
}

function numberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function getEffectiveScore(score: CutScoreRecord): EffectiveCutScore | null {
    const finalScore = numberOrNull(score.cut_score);
    if (finalScore !== null && finalScore > 0) {
        return {
            score: finalScore,
            type: 'final',
            capturedAt: score.captured_at,
            partialDay: null,
        };
    }

    const partial = [...(score.partial_scores ?? [])]
        .map((item) => ({
            day: numberOrNull(item.day),
            score: numberOrNull(item.score),
        }))
        .filter((item): item is { day: number; score: number } =>
            item.day !== null && item.score !== null && item.score > 0,
        )
        .sort((a, b) => b.day - a.day)[0];

    if (!partial) return null;

    return {
        score: partial.score,
        type: 'partial',
        capturedAt: score.captured_at,
        partialDay: partial.day,
    };
}

function capturedAtTimestamp(value: string | null): number {
    if (!value) return 0;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : 0;
}

function findReferenceCutScore(
    scores: CutScoreRecord[],
    modalityCode: number,
): { record: CutScoreRecord; effective: EffectiveCutScore } | null {
    const matches = scores
        .filter((score) => score.modality_code === modalityCode)
        .map((record) => ({ record, effective: getEffectiveScore(record) }))
        .filter((item): item is { record: CutScoreRecord; effective: EffectiveCutScore } =>
            item.effective !== null,
        )
        .sort((a, b) => {
            if (a.record.year !== b.record.year) return b.record.year - a.record.year;
            const captureDifference =
                capturedAtTimestamp(b.record.captured_at) - capturedAtTimestamp(a.record.captured_at);
            if (captureDifference !== 0) return captureDifference;
            return (a.record.modality_code ?? Number.MAX_SAFE_INTEGER)
                - (b.record.modality_code ?? Number.MAX_SAFE_INTEGER);
        });

    return matches[0] ?? null;
}

function findCourseCutScore(
    scores: CutScoreRecord[],
    modalityCode: number,
    year: number,
): { record: CutScoreRecord; effective: EffectiveCutScore } | null {
    const matches = scores
        .filter((score) => score.year === year && score.modality_code === modalityCode)
        .map((record) => ({ record, effective: getEffectiveScore(record) }))
        .filter((item): item is { record: CutScoreRecord; effective: EffectiveCutScore } =>
            item.effective !== null,
        )
        .sort(
            (a, b) =>
                capturedAtTimestamp(b.record.captured_at) - capturedAtTimestamp(a.record.captured_at),
        );

    return matches[0] ?? null;
}

function calculateWeightedScore(grades: Grades, weights: CourseWeightsRecord): number | null {
    const values = {
        redacao: numberOrNull(weights.peso_red),
        linguagens: numberOrNull(weights.peso_ling),
        matematica: numberOrNull(weights.peso_mat),
        humanas: numberOrNull(weights.peso_ch),
        natureza: numberOrNull(weights.peso_cn),
    };
    const weightValues = Object.values(values);
    if (weightValues.some((value) => value === null)) return null;

    const completeWeights = values as Record<keyof typeof values, number>;
    const totalWeight = Object.values(completeWeights).reduce((total, value) => total + value, 0);
    if (totalWeight <= 0) return null;

    return (
        grades.redacao * completeWeights.redacao
        + grades.linguagens * completeWeights.linguagens
        + grades.matematica * completeWeights.matematica
        + grades.humanas * completeWeights.humanas
        + grades.natureza * completeWeights.natureza
    ) / totalWeight;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const earthRadiusKm = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2)
        + Math.cos(lat1 * Math.PI / 180)
        * Math.cos(lat2 * Math.PI / 180)
        * Math.sin(dLon / 2)
        * Math.sin(dLon / 2);
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function validGrades(value: unknown): value is Grades {
    if (!value || typeof value !== 'object') return false;
    const grades = value as Record<string, unknown>;
    return ['redacao', 'linguagens', 'humanas', 'natureza', 'matematica'].every((field) =>
        typeof grades[field] === 'number'
        && Number.isFinite(grades[field])
        && (grades[field] as number) >= 0
        && (grades[field] as number) <= 1000,
    );
}

export async function POST(request: NextRequest) {
    try {
        let parsedBody: unknown;
        try {
            parsedBody = await request.json();
        } catch {
            return jsonResponse({ error: 'Corpo JSON inválido.' }, 400);
        }
        if (!parsedBody || typeof parsedBody !== 'object' || Array.isArray(parsedBody)) {
            return jsonResponse({ error: 'Corpo da requisição inválido.' }, 400);
        }

        const {
            grades,
            courseName,
            modalityCode: rawModalityCode,
            referenceCourseId,
        } = parsedBody as Record<string, unknown>;

        const modalityCode = normalizeRequestedModality(rawModalityCode);
        if (!modalityCode) {
            return jsonResponse({ error: 'Modalidade inválida ou não reconhecida.' }, 400);
        }
        if (!validGrades(grades)) {
            return jsonResponse({ error: 'As cinco notas devem estar entre 0 e 1000.' }, 400);
        }
        if (typeof courseName !== 'string' || !courseName.trim()) {
            return jsonResponse({ error: 'Nome do curso é obrigatório.' }, 400);
        }
        if (
            typeof referenceCourseId !== 'number'
            || !Number.isInteger(referenceCourseId)
            || referenceCourseId <= 0
        ) {
            return jsonResponse({ error: 'Curso de referência inválido.' }, 400);
        }

        const courseSelect = [
            'id',
            'code',
            'name',
            'university',
            'campus',
            'city',
            'state',
            'degree',
            'schedule',
            'latitude',
            'longitude',
            'course_weights(year,peso_red,peso_ling,peso_mat,peso_ch,peso_cn)',
            'cut_scores(year,modality_name,modality_code,cut_score,vacancies,partial_scores,captured_at)',
        ].join(',');

        const referenceQuery = new URLSearchParams({
            select: courseSelect,
            id: `eq.${referenceCourseId}`,
            limit: '1',
        });
        const { data: referenceRows, error: referenceError } = await supabase.request<RadarCourse[]>(
            `courses?${referenceQuery.toString()}`,
        );
        const referenceCourse = referenceRows?.[0];

        if (referenceError || !referenceCourse) {
            return jsonResponse({ error: 'Curso de referência não encontrado.' }, 404);
        }

        if (normalizeCourseName(courseName) !== normalizeCourseName(referenceCourse.name)) {
            return jsonResponse({ error: 'O nome informado não corresponde ao curso de referência.' }, 400);
        }

        const referenceCutScore = findReferenceCutScore(
            referenceCourse.cut_scores ?? [],
            modalityCode,
        );
        if (!referenceCutScore) {
            return jsonResponse(
                { error: 'Não há nota de referência para esta modalidade no curso selecionado.' },
                422,
            );
        }

        const targetYear = referenceCutScore.record.year;
        const comparisonModalityCode = referenceCutScore.record.modality_code;
        if (comparisonModalityCode === null) {
            return jsonResponse({ error: 'A modalidade de referência não pôde ser identificada.' }, 422);
        }
        const referenceType = targetYear < new Date().getUTCFullYear() ? 'historical' : null;
        const verification = getReferenceVerification(
            referenceCutScore.effective.capturedAt,
            referenceType,
        );
        if (verification !== 'verified') {
            return jsonResponse({
                error: 'A referência ainda não foi verificada com a fonte oficial.',
                code: 'REFERENCE_NOT_VERIFIED',
                verification,
            }, 409);
        }
        const exactNameQuery = new URLSearchParams({
            select: courseSelect,
            name: `eq.${referenceCourse.name}`,
            limit: '500',
        });
        const { data: courseRows, error: courseError } = await supabase.request<RadarCourse[]>(
            `courses?${exactNameQuery.toString()}`,
        );

        if (courseError) {
            console.error('Radar course lookup failed:', courseError);
            return jsonResponse({ error: 'Não foi possível consultar as ofertas neste momento.' }, 502);
        }

        const normalizedReferenceName = normalizeCourseName(referenceCourse.name);
        const refLat = numberOrNull(referenceCourse.latitude);
        const refLon = numberOrNull(referenceCourse.longitude);

        const results = (courseRows ?? [])
            .filter((course) =>
                course.id !== referenceCourseId
                && normalizeCourseName(course.name) === normalizedReferenceName,
            )
            .map((course) => {
                const weights = (course.course_weights ?? []).find((item) => item.year === targetYear);
                const cutScore = findCourseCutScore(
                    course.cut_scores ?? [],
                    comparisonModalityCode,
                    targetYear,
                );
                if (!weights || !cutScore) return null;

                const resultReferenceType = targetYear < new Date().getUTCFullYear()
                    ? 'historical'
                    : null;
                const resultVerification = getReferenceVerification(
                    cutScore.effective.capturedAt,
                    resultReferenceType,
                );
                if (resultVerification !== 'verified') return null;

                const userScore = calculateWeightedScore(grades, weights);
                if (userScore === null) return null;

                const courseLat = numberOrNull(course.latitude);
                const courseLon = numberOrNull(course.longitude);
                const distance =
                    refLat !== null
                    && refLon !== null
                    && courseLat !== null
                    && courseLon !== null
                        ? Math.round(calculateDistance(refLat, refLon, courseLat, courseLon))
                        : null;
                const difference = userScore - cutScore.effective.score;

                return {
                    courseId: course.id,
                    courseCode: course.code,
                    name: course.name,
                    university: course.university,
                    campus: course.campus,
                    city: course.city,
                    state: course.state,
                    degree: course.degree,
                    schedule: course.schedule,
                    userScore,
                    cutScore: cutScore.effective.score,
                    cutScoreYear: targetYear,
                    cutScoreType: cutScore.effective.type,
                    partialDay: cutScore.effective.partialDay,
                    capturedAt: cutScore.effective.capturedAt,
                    difference,
                    margin: difference,
                    modalityName: cutScore.record.modality_name,
                    vacancies: cutScore.record.vacancies ?? 0,
                    distance,
                    verification: resultVerification,
                    sourceUrl: 'https://sisu.mec.gov.br/vagas',
                    intermediary: 'MeuSISU',
                };
            })
            .filter((result): result is NonNullable<typeof result> => result !== null)
            .sort((a, b) => {
                const aAbove = a.difference >= 0;
                const bAbove = b.difference >= 0;
                if (aAbove !== bAbove) return aAbove ? -1 : 1;
                return aAbove
                    ? a.difference - b.difference
                    : b.difference - a.difference;
            });

        return jsonResponse({
            results,
            reference: {
                courseId: referenceCourse.id,
                courseName: referenceCourse.name,
                year: targetYear,
                modalityCode: String(comparisonModalityCode),
                modalityName: referenceCutScore.record.modality_name,
                cutScoreType: referenceCutScore.effective.type,
                partialDay: referenceCutScore.effective.partialDay,
                capturedAt: referenceCutScore.effective.capturedAt,
                verification,
                sourceUrl: 'https://sisu.mec.gov.br/vagas',
                intermediary: 'MeuSISU',
            },
        });
    } catch (error) {
        console.error('Radar API error:', error);
        return jsonResponse({ error: 'Não foi possível processar o Radar neste momento.' }, 500);
    }
}
