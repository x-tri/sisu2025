import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;
const MAX_PAGE = 100;
const NOMINAL_LIST_ENABLED = process.env.ENABLE_NOMINAL_APPROVED_STUDENTS === 'true';
const PUBLIC_STUDENT_FIELDS = [
    'year',
    'modality_code',
    'rank',
    'name',
    'score',
    'bonus',
    'call_number',
] as const;

const PRIVACY_HEADERS = {
    'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
    Pragma: 'no-cache',
    'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
};

interface PublicApprovedStudent {
    year: number;
    modality_code: number;
    rank: number;
    name: string;
    score: number;
    bonus: number;
    call_number: number;
}

function jsonResponse(body: unknown, status = 200): NextResponse {
    return NextResponse.json(body, { status, headers: PRIVACY_HEADERS });
}

function parseBoundedInteger(
    rawValue: string | null,
    defaultValue: number,
    minimum: number,
    maximum: number,
): number | null {
    if (rawValue === null || rawValue === '') return defaultValue;
    if (!/^\d+$/.test(rawValue)) return null;
    const value = Number(rawValue);
    return Number.isSafeInteger(value) && value >= minimum && value <= maximum ? value : null;
}

export async function GET(
    request: NextRequest,
    { params }: { params: { code: string } },
) {
    if (!NOMINAL_LIST_ENABLED) {
        return jsonResponse(
            {
                available: false,
                reason: 'nominal_list_disabled',
                message: 'A consulta nominal está indisponível nesta instalação.',
            },
            404,
        );
    }

    if (!/^\d+$/.test(params.code)) {
        return jsonResponse({ available: false, error: 'Código de curso inválido.' }, 400);
    }
    const code = Number(params.code);
    if (!Number.isSafeInteger(code) || code <= 0) {
        return jsonResponse({ available: false, error: 'Código de curso inválido.' }, 400);
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseBoundedInteger(searchParams.get('page'), 1, 1, MAX_PAGE);
    const limit = parseBoundedInteger(
        searchParams.get('limit'),
        DEFAULT_LIMIT,
        1,
        MAX_LIMIT,
    );
    if (page === null || limit === null) {
        return jsonResponse(
            {
                available: false,
                error: `Paginação inválida. Use page entre 1 e ${MAX_PAGE} e limit entre 1 e ${MAX_LIMIT}.`,
            },
            400,
        );
    }

    try {
        const courseResult = await supabase.getCourseByCode(code);
        if (courseResult.error || !courseResult.data) {
            return jsonResponse({ available: false, error: 'Curso não encontrado.' }, 404);
        }

        const courseId = courseResult.data.id;
        const latestYearParams = new URLSearchParams({
            course_id: `eq.${courseId}`,
            select: 'year',
            order: 'year.desc',
            limit: '1',
        });
        const latestYearResult = await supabase.request<Array<{ year: number }>>(
            `approved_students?${latestYearParams.toString()}`,
        );
        if (latestYearResult.error) {
            console.error('Approved students year lookup failed:', latestYearResult.error);
            return jsonResponse({ available: false, error: 'Falha ao consultar a lista nominal.' }, 502);
        }

        const actualYear = latestYearResult.data?.[0]?.year ?? null;
        if (actualYear === null) {
            return jsonResponse({
                available: true,
                students: [],
                count: 0,
                page,
                limit,
                hasMore: false,
                year: null,
            });
        }

        const offset = (page - 1) * limit;
        const studentParams = new URLSearchParams({
            course_id: `eq.${courseId}`,
            year: `eq.${actualYear}`,
            select: PUBLIC_STUDENT_FIELDS.join(','),
            order: 'call_number.asc,rank.asc',
            limit: String(limit),
            offset: String(offset),
        });
        const result = await supabase.request<PublicApprovedStudent[]>(
            `approved_students?${studentParams.toString()}`,
            { headers: { Prefer: 'count=exact' } },
        );
        if (result.error) {
            console.error('Approved students lookup failed:', result.error);
            return jsonResponse({ available: false, error: 'Falha ao consultar a lista nominal.' }, 502);
        }

        const count = result.count ?? null;
        const students = result.data ?? [];
        const hasMore = count === null
            ? students.length === limit
            : offset + students.length < count;

        return jsonResponse({
            available: true,
            students,
            count,
            page,
            limit,
            hasMore,
            year: actualYear,
        });
    } catch (error) {
        console.error('Approved students API error:', error);
        return jsonResponse({ available: false, error: 'Falha ao consultar a lista nominal.' }, 500);
    }
}
