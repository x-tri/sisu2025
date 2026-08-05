import type { Page, Route } from '@playwright/test';
import type {
  CourseCoverageResponse,
  CourseReference,
  CourseSearchItem,
  CourseSearchResponse,
} from '../../types/course';

export const MEDICINE_COURSE: CourseSearchItem = {
  id: 1001,
  code: 12345,
  name: 'Medicina',
  university: 'UFGD',
  campus: 'Unidade II',
  city: 'Dourados',
  state: 'MS',
  degree: 'Bacharelado',
  schedule: 'Integral',
};

export const L1_MODALITY_ID = '686';
export const L1_MODALITY_NAME = 'L1 — Escola pública e baixa renda';
export const BROAD_MODALITY_ID = '41';
export const BROAD_CUTOFF = 801.46;
export const L1_CUTOFF = 769.86;

const sourceUrl = 'https://sisu.mec.gov.br/vagas';
const intermediaryUrl = 'https://meusisu.com/';
const capturedAt = '2026-01-22T08:30:00.000Z';
const checkedAt = '2026-01-22T09:00:00.000Z';

function reference(
  modalityId: string,
  modalityOfficialName: string,
  cutoff: number,
): CourseReference {
  return {
    courseCode: MEDICINE_COURSE.code,
    edition: 2026,
    modalityId,
    modalityOfficialName,
    cutoff,
    referenceType: 'final',
    partialScores: [],
    capturedAt,
    weightsEdition: 2026,
    minimums: {
      redacao: null,
      linguagens: null,
      matematica: null,
      humanas: null,
      natureza: null,
      enem: null,
    },
    sourceUrl,
    intermediary: 'MeuSISU',
    intermediaryUrl,
    verification: {
      status: 'verified',
      checkedAt,
    },
  };
}

export const L1_REFERENCE = reference(L1_MODALITY_ID, L1_MODALITY_NAME, L1_CUTOFF);
export const BROAD_REFERENCE = reference(
  BROAD_MODALITY_ID,
  'Ampla concorrência',
  BROAD_CUTOFF,
);

const weights = {
  year: 2026,
  pesos: {
    redacao: 1,
    linguagens: 1,
    matematica: 1,
    humanas: 1,
    natureza: 1,
  },
  minimos: {
    redacao: null,
    linguagens: null,
    matematica: null,
    humanas: null,
    natureza: null,
    enem: null,
  },
};

export const COURSE_DETAIL_FIXTURE = {
  course: MEDICINE_COURSE,
  weights,
  weights_history: [weights],
  cut_scores: [
    {
      year: 2026,
      modalities: [
        {
          code: Number(BROAD_MODALITY_ID),
          name: BROAD_REFERENCE.modalityOfficialName,
          cut_score: BROAD_CUTOFF,
          applicants: 500,
          vacancies: 30,
          partial_scores: [],
          verification: BROAD_REFERENCE.verification,
          reference: BROAD_REFERENCE,
        },
        {
          code: Number(L1_MODALITY_ID),
          name: L1_MODALITY_NAME,
          cut_score: L1_CUTOFF,
          applicants: 120,
          vacancies: 12,
          partial_scores: [],
          verification: L1_REFERENCE.verification,
          reference: L1_REFERENCE,
        },
      ],
    },
  ],
  // Ampla is deliberately first: the UI must still resolve L1 by its exact ID.
  references: [BROAD_REFERENCE, L1_REFERENCE],
  provenance: {
    generatedAt: checkedAt,
    capturedAt,
    sourceUrl,
    intermediary: {
      name: 'MeuSISU',
      url: intermediaryUrl,
    },
    verification: 'verified',
  },
};

export const COVERAGE_FIXTURE: CourseCoverageResponse = {
  generatedAt: checkedAt,
  capturedAt,
  verification: 'verified',
  sourceUrl,
  intermediary: {
    name: 'MeuSISU',
    url: intermediaryUrl,
  },
  coverage: {
    courses: {
      rows: 1,
      states: 1,
      cities: 1,
      institutions: 1,
      presentStates: ['MS'],
      missingStates: [],
    },
    weights: { rows: 1 },
    cutScores: {
      rows: 2,
      latestEdition: 2026,
      latestCapturedAt: capturedAt,
    },
  },
};

const STALE_SEARCH_RESULT: CourseSearchItem = {
  id: 2002,
  code: 54321,
  name: 'Medicina Veterinária',
  university: 'Universidade Antiga',
  campus: 'Campus Antigo',
  city: 'Campo Grande',
  state: 'MS',
  degree: 'Bacharelado',
  schedule: 'Integral',
};

function searchResponse(query: string, courses: CourseSearchItem[]): CourseSearchResponse {
  return {
    courses,
    query,
    count: courses.length,
    total: courses.length,
    limit: 8,
    offset: 0,
    pagination: {
      page: 1,
      limit: 8,
      offset: 0,
      returned: courses.length,
      total: courses.length,
      totalPages: courses.length > 0 ? 1 : 0,
      hasNextPage: false,
    },
  };
}

async function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify(body),
  });
}

export interface ApiMockOptions {
  coverageFailures?: number;
  coverageTimeoutFailures?: number;
  emptySearch?: boolean;
  racingSearch?: boolean;
}

export interface ApiMockState {
  coverageAttempts: () => number;
  searchQueries: () => string[];
}

export async function installApiMocks(
  page: Page,
  options: ApiMockOptions = {},
): Promise<ApiMockState> {
  let coverageAttempts = 0;
  const searchQueries: string[] = [];

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname === '/api/filters') {
      const type = url.searchParams.get('type');
      if (type === 'states') return fulfillJson(route, ['MS']);
      if (type === 'cities') return fulfillJson(route, ['Dourados']);
      if (type === 'universities') return fulfillJson(route, ['UFGD']);
      if (type === 'courses') return fulfillJson(route, [MEDICINE_COURSE]);
    }

    if (url.pathname === '/api/courses/coverage') {
      coverageAttempts += 1;
      if (coverageAttempts <= (options.coverageTimeoutFailures ?? 0)) {
        await new Promise((resolve) => setTimeout(resolve, 12_500));
        return fulfillJson(route, COVERAGE_FIXTURE);
      }
      if (coverageAttempts <= (options.coverageFailures ?? 0)) {
        return fulfillJson(route, { error: 'Falha simulada de cobertura.' }, 500);
      }
      return fulfillJson(route, COVERAGE_FIXTURE);
    }

    if (url.pathname === `/api/courses/${MEDICINE_COURSE.code}`) {
      return fulfillJson(route, COURSE_DETAIL_FIXTURE);
    }

    if (url.pathname === '/api/courses') {
      const query = url.searchParams.get('q')?.trim() ?? '';
      const normalizedQuery = query.toLocaleLowerCase('pt-BR');
      searchQueries.push(normalizedQuery);

      if (options.racingSearch && normalizedQuery === 'med') {
        await new Promise((resolve) => setTimeout(resolve, 1_000));
        return fulfillJson(route, searchResponse(query, [STALE_SEARCH_RESULT]));
      }
      if (options.racingSearch && normalizedQuery === 'medicina') {
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      const courses = options.emptySearch ? [] : [MEDICINE_COURSE];
      return fulfillJson(route, searchResponse(query, courses));
    }

    if (url.pathname === '/api/simulate/radar' && request.method() === 'POST') {
      return fulfillJson(route, {
        reference: {
          courseId: MEDICINE_COURSE.id,
          courseName: MEDICINE_COURSE.name,
          year: 2026,
          modalityCode: L1_MODALITY_ID,
          modalityName: L1_MODALITY_NAME,
          cutScoreType: 'final',
          partialDay: null,
          capturedAt,
          verification: 'verified',
          sourceUrl,
          intermediary: 'MeuSISU',
        },
        results: [
          {
            courseId: 3003,
            courseCode: 67890,
            name: 'Medicina',
            university: 'UFMS',
            campus: 'Campo Grande',
            city: 'Campo Grande',
            state: 'MS',
            degree: 'Bacharelado',
            schedule: 'Integral',
            userScore: 770,
            cutScore: 768,
            cutScoreYear: 2026,
            cutScoreType: 'final',
            partialDay: null,
            capturedAt,
            margin: 2,
            difference: 1.86,
            modalityName: L1_MODALITY_NAME,
            vacancies: 20,
            distance: 225,
            verification: 'verified',
            sourceUrl,
            intermediary: 'MeuSISU',
          },
        ],
      });
    }

    return fulfillJson(route, { error: `Endpoint não mockado: ${url.pathname}` }, 404);
  });

  return {
    coverageAttempts: () => coverageAttempts,
    searchQueries: () => [...searchQueries],
  };
}
