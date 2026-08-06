'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  Clock3,
  ExternalLink,
  MapPinned,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useScores } from '../context/ScoreContext';
import { useModality } from '../context/ModalityContext';
import { calculateWeightedScore, type CourseWeights, validateScores } from '../lib/score-core';
import { getEffectiveCutoff, selectLatestReference } from '../lib/course-selection';
import CourseDetailView from '../components/CourseDetail/CourseDetailView';
import ApprovalRadarModal from '../components/CourseDetail/ApprovalRadarModal';
import NearbyOffersPanel from '../components/CourseDetail/NearbyOffersPanel';
import CourseStatisticsPanel from '../components/CourseDetail/CourseStatisticsPanel';
import ShareModal from '../components/CourseDetail/ShareModal';
import CourseResultCard from '../components/CourseResultCard';
import PointsPlan from '../components/PointsPlan';
import XtriHeader from '../components/XtriHeader';
import ScoreModal from '../components/ScoreModal';
import type {
  CourseCoverageResponse,
  CourseProvenance,
  CourseReference,
  CourseSearchItem,
  CourseSearchResponse,
  ReferenceType,
  VerificationStatus,
} from '../types/course';
import styles from './page.module.css';

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const requestController = new AbortController();
  let timedOut = false;
  const forwardAbort = () => requestController.abort();
  if (signal?.aborted) requestController.abort();
  signal?.addEventListener('abort', forwardAbort, { once: true });
  const timeout = window.setTimeout(() => {
    timedOut = true;
    requestController.abort();
  }, 12_000);

  try {
    const response = await fetch(url, { signal: requestController.signal, cache: 'no-store' });
    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(payload?.error || 'Não foi possível carregar os dados (' + response.status + ').');
    }
    return response.json() as Promise<T>;
  } catch (error) {
    if (timedOut) throw new Error('A consulta excedeu o tempo limite. Tente novamente.');
    throw error;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

interface Course {
  id: number;
  code: number;
  name: string;
  degree: string | null;
  schedule: string | null;
}

interface YearCutScore {
  year: number;
  cut_score: number;
  cut_score_type: string;
  partial_scores: Array<{ day: number; score: number }>;
  captured_at?: string | null;
  reference_type?: ReferenceType;
}

interface EnemWeights {
  year: number;
  pesos: {
    redacao: number | null;
    linguagens: number | null;
    matematica: number | null;
    humanas: number | null;
    natureza: number | null;
  };
  minimos: {
    redacao: number | null;
    linguagens: number | null;
    matematica: number | null;
    humanas: number | null;
    natureza: number | null;
    enem: number | null;
  } | null;
}

interface CourseApiResponse {
  course: {
    id: number;
    code: number;
    name: string;
    university: string | null;
    campus: string | null;
    city: string | null;
    state: string | null;
    degree: string | null;
    schedule: string | null;
  };
  weights: EnemWeights | null;
  weights_history: EnemWeights[];
  cut_scores: Array<{
    year: number;
    modalities: Array<{
      code: number | null;
      name: string;
      cut_score: number | null;
      applicants?: number | null;
      vacancies?: number | null;
      partial_scores?: Array<{ day: string | number; score: number }>;
      verification?: { status: VerificationStatus };
      reference?: CourseReference | null;
    }>;
  }>;
  references: CourseReference[];
  provenance: CourseProvenance;
}

interface AvailableModality {
  id: string;
  name: string;
}

interface CoursePreview {
  id: number;
  code: number;
  name: string;
  degree: string;
  university: string;
  campus: string;
  city: string;
  state: string;
  schedule: string;
  cut_score: number;
  cut_score_year: number;
  cut_score_type: string;
  highest_weight: string;
  weights: CourseWeights | null;
  weights_year: number | null;
  minimums: EnemWeights['minimos'];
  activeData: YearCutScore;
  reference: CourseReference;
  verification: VerificationStatus;
  availableModalities: AvailableModality[];
}

interface CourseData {
  id: number;
  code: number;
  name: string;
  university: string;
  campus: string;
  city: string;
  state: string;
  degree: string;
  schedule: string;
  weights: Array<Record<string, number | null>>;
  cut_scores: Array<Record<string, unknown>>;
}

type OfferDetailTab = 'years' | 'statistics' | 'nearby';

const OFFER_DETAIL_TAB_ORDER: OfferDetailTab[] = ['years', 'statistics', 'nearby'];

const OFFER_DETAIL_TAB_LABELS: Record<OfferDetailTab, string> = {
  years: 'Plano de pontos',
  statistics: 'Estatísticas',
  nearby: 'Ofertas próximas',
};

const WEIGHT_LABELS: Array<[keyof EnemWeights['pesos'], string]> = [
  ['redacao', 'Redação'],
  ['linguagens', 'Linguagens'],
  ['matematica', 'Matemática'],
  ['humanas', 'Ciências Humanas'],
  ['natureza', 'Ciências da Natureza'],
];

function formatScore(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

function toYearCutScore(reference: CourseReference): YearCutScore {
  const partialScores = reference.partialScores
    .map(partial => ({ day: Number(partial.day), score: partial.score }))
    .filter(partial => Number.isFinite(partial.day) && partial.score >= 0 && partial.score <= 1000)
    .sort((left, right) => left.day - right.day);
  const cutoff = getEffectiveCutoff(reference) ?? 0;
  const latestDay = partialScores[partialScores.length - 1]?.day;
  const type = reference.referenceType === 'final'
    ? 'Corte final'
    : reference.referenceType === 'historical'
      ? 'Referência histórica'
      : latestDay
        ? 'Parcial — dia ' + latestDay
        : 'Parcial';

  return {
    year: reference.edition,
    cut_score: cutoff,
    cut_score_type: type,
    partial_scores: partialScores,
    captured_at: reference.capturedAt,
    reference_type: reference.referenceType,
  };
}

function toCalculationWeights(weights: EnemWeights | null): CourseWeights | null {
  if (!weights?.pesos) return null;
  const values = weights.pesos;
  const allWeightsPresent = Object.values(values).every(value => (
    typeof value === 'number' && Number.isFinite(value) && value >= 0
  ));
  if (!allWeightsPresent) return null;

  return {
    peso_red: values.redacao,
    peso_ling: values.linguagens,
    peso_mat: values.matematica,
    peso_ch: values.humanas,
    peso_cn: values.natureza,
    min_red: weights.minimos?.redacao ?? null,
    min_ling: weights.minimos?.linguagens ?? null,
    min_mat: weights.minimos?.matematica ?? null,
    min_ch: weights.minimos?.humanas ?? null,
    min_cn: weights.minimos?.natureza ?? null,
    min_enem: weights.minimos?.enem ?? null,
  };
}

function getAvailableModalities(references: CourseReference[]): AvailableModality[] {
  const editions = references.map(reference => reference.edition);
  const latestEdition = editions.length > 0 ? Math.max(...editions) : null;
  if (latestEdition === null) return [];

  const unique = new Map<string, string>();
  for (const reference of references) {
    if (
      reference.edition === latestEdition
      && reference.modalityId
      && !unique.has(reference.modalityId)
    ) {
      unique.set(reference.modalityId, reference.modalityOfficialName);
    }
  }

  return Array.from(unique, ([id, name]) => ({ id, name }))
    .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
}

function toCourseDetailData(data: CourseApiResponse): CourseData {
  const weights = data.weights_history.map(weight => ({
    year: weight.year,
    peso_red: weight.pesos.redacao,
    peso_ling: weight.pesos.linguagens,
    peso_mat: weight.pesos.matematica,
    peso_ch: weight.pesos.humanas,
    peso_cn: weight.pesos.natureza,
    min_red: weight.minimos?.redacao ?? null,
    min_ling: weight.minimos?.linguagens ?? null,
    min_mat: weight.minimos?.matematica ?? null,
    min_ch: weight.minimos?.humanas ?? null,
    min_cn: weight.minimos?.natureza ?? null,
    min_enem: weight.minimos?.enem ?? null,
  }));

  const cutScores: Array<Record<string, unknown>> = [];
  for (const yearData of data.cut_scores) {
    for (const modality of yearData.modalities) {
      const reference = modality.reference
        || data.references.find(item => (
          item.edition === yearData.year && item.modalityId === String(modality.code ?? '')
        ))
        || null;
      const partialScores = (reference?.partialScores || modality.partial_scores || [])
        .filter(partial => (
          typeof partial.score === 'number'
          && Number.isFinite(partial.score)
          && partial.score >= 0
          && partial.score <= 1000
        ));
      const finalCutoff = reference?.cutoff;
      cutScores.push({
        year: yearData.year,
        modality_code: modality.code,
        modality_name: modality.name,
        cut_score: typeof finalCutoff === 'number'
          && Number.isFinite(finalCutoff)
          && finalCutoff >= 0
          && finalCutoff <= 1000
            ? finalCutoff
            : null,
        applicants: modality.applicants ?? null,
        vacancies: modality.vacancies ?? null,
        partial_scores: partialScores,
        verification: reference?.verification.status ?? 'stale',
        reference,
      });
    }
  }

  return {
    id: data.course.id,
    code: data.course.code,
    name: data.course.name,
    university: data.course.university || '',
    campus: data.course.campus || '',
    city: data.course.city || '',
    state: data.course.state || '',
    degree: data.course.degree || '',
    schedule: data.course.schedule || '',
    weights,
    cut_scores: cutScores,
  };
}

export default function Home() {
  const {
    scores,
    hasScores,
    setScores,
    clearScores,
    rememberScores,
    setRememberScores,
  } = useScores();
  const { selectedModality, setSelectedModality } = useModality();
  const [showScoreInput, setShowScoreInput] = useState(false);
  const [showRadar, setShowRadar] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<OfferDetailTab>('years');
  const [filterError, setFilterError] = useState('');
  const [detailsError, setDetailsError] = useState('');
  const [scoreError, setScoreError] = useState('');
  const [modalityNotice, setModalityNotice] = useState('');
  const [filterReloadKey, setFilterReloadKey] = useState(0);
  const [detailsReloadKey, setDetailsReloadKey] = useState(0);
  const [filters, setFilters] = useState({
    state: '',
    city: '',
    institution: '',
    course: '',
  });
  const [options, setOptions] = useState({
    states: [] as string[],
    cities: [] as string[],
    institutions: [] as string[],
    courses: [] as Course[],
  });
  const [loadingFilters, setLoadingFilters] = useState({
    cities: false,
    institutions: false,
    courses: false,
    details: false,
  });
  const [courseResponse, setCourseResponse] = useState<CourseApiResponse | null>(null);
  const [coursePreview, setCoursePreview] = useState<CoursePreview | null>(null);
  const [availableModalities, setAvailableModalities] = useState<AvailableModality[]>([]);
  const [systemStats, setSystemStats] = useState({
    totalCourses: 0,
    totalUniversities: 0,
    totalStates: 0,
    latestEdition: null as number | null,
    missingStates: [] as string[],
  });
  const [tempScores, setTempScores] = useState({
    redacao: '',
    linguagens: '',
    matematica: '',
    humanas: '',
    natureza: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CourseSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchHasNext, setSearchHasNext] = useState(false);
  const [catalogResults, setCatalogResults] = useState<CourseSearchItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogHasNext, setCatalogHasNext] = useState(false);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [noticeVisible, setNoticeVisible] = useState(true);
  const catalogMoreController = useRef<AbortController | null>(null);
  const detailTabsId = useId();

  useEffect(() => {
    if (!showScoreInput) return;
    setTempScores({
      redacao: scores.redacao ? String(scores.redacao) : '',
      linguagens: scores.linguagens ? String(scores.linguagens) : '',
      matematica: scores.matematica ? String(scores.matematica) : '',
      humanas: scores.humanas ? String(scores.humanas) : '',
      natureza: scores.natureza ? String(scores.natureza) : '',
    });
  }, [scores, showScoreInput]);

  useEffect(() => {
    catalogMoreController.current?.abort();
    const controller = new AbortController();
    setFilterError('');

    Promise.all([
      fetchJson<string[]>('/api/filters?type=states', controller.signal),
      fetchJson<CourseCoverageResponse>('/api/courses/coverage', controller.signal),
    ])
      .then(([statesData, coverage]) => {
        const states = Array.isArray(statesData) ? statesData : [];
        setOptions(previous => ({ ...previous, states }));
        setSystemStats({
          totalCourses: coverage.coverage.courses.rows,
          totalUniversities: coverage.coverage.courses.institutions,
          totalStates: coverage.coverage.courses.states,
          latestEdition: coverage.coverage.cutScores.latestEdition,
          missingStates: coverage.coverage.courses.missingStates,
        });
      })
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setFilterError(error.message);
      });

    return () => controller.abort();
  }, [filterReloadKey]);

  useEffect(() => {
    const directCode = new URLSearchParams(window.location.search).get('courseCode');
    if (!directCode || !/^\d+$/.test(directCode)) return;

    const controller = new AbortController();
    setLoadingFilters(previous => ({ ...previous, details: true }));
    fetchJson<CourseApiResponse>('/api/courses/' + directCode, controller.signal)
      .then(data => {
        const directCourse: Course = {
          id: data.course.id,
          code: data.course.code,
          name: data.course.name,
          degree: data.course.degree,
          schedule: data.course.schedule,
        };
        setOptions(previous => ({
          ...previous,
          states: data.course.state && !previous.states.includes(data.course.state)
            ? [...previous.states, data.course.state].sort()
            : previous.states,
          cities: data.course.city ? [data.course.city] : [],
          institutions: data.course.university ? [data.course.university] : [],
          courses: [directCourse],
        }));
        setFilters({
          state: data.course.state || '',
          city: data.course.city || '',
          institution: data.course.university || '',
          course: String(data.course.id),
        });
      })
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setDetailsError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingFilters(previous => ({ ...previous, details: false }));
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!filters.state) {
      setOptions(previous => ({ ...previous, cities: [], institutions: [], courses: [] }));
      return;
    }
    const controller = new AbortController();
    setLoadingFilters(previous => ({ ...previous, cities: true }));
    const params = new URLSearchParams({ type: 'cities', state: filters.state });
    fetchJson<string[]>('/api/filters?' + params.toString(), controller.signal)
      .then(cities => setOptions(previous => ({
        ...previous,
        cities: Array.isArray(cities) ? cities : [],
      })))
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setFilterError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingFilters(previous => ({ ...previous, cities: false }));
        }
      });
    return () => controller.abort();
  }, [filters.state, filterReloadKey]);

  useEffect(() => {
    if (!filters.city) {
      setOptions(previous => ({ ...previous, institutions: [], courses: [] }));
      return;
    }
    const controller = new AbortController();
    setLoadingFilters(previous => ({ ...previous, institutions: true }));
    const params = new URLSearchParams({
      type: 'universities',
      state: filters.state,
      city: filters.city,
    });
    fetchJson<string[]>('/api/filters?' + params.toString(), controller.signal)
      .then(institutions => setOptions(previous => ({
        ...previous,
        institutions: Array.isArray(institutions) ? institutions : [],
      })))
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setFilterError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingFilters(previous => ({ ...previous, institutions: false }));
        }
      });
    return () => controller.abort();
  }, [filters.city, filters.state, filterReloadKey]);

  useEffect(() => {
    if (!filters.institution) {
      setOptions(previous => ({ ...previous, courses: [] }));
      return;
    }
    const controller = new AbortController();
    setLoadingFilters(previous => ({ ...previous, courses: true }));
    const params = new URLSearchParams({
      type: 'courses',
      state: filters.state,
      city: filters.city,
      university: filters.institution,
    });
    fetchJson<Course[]>('/api/filters?' + params.toString(), controller.signal)
      .then(courses => setOptions(previous => ({
        ...previous,
        courses: Array.isArray(courses) ? courses : [],
      })))
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setFilterError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingFilters(previous => ({ ...previous, courses: false }));
        }
      });
    return () => controller.abort();
  }, [filters.city, filters.institution, filters.state, filterReloadKey]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchError('');
      setSearchLoading(false);
      setSearchLoadingMore(false);
      setSearchTotal(0);
      setSearchHasNext(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearchLoading(true);
      setSearchError('');
      const params = new URLSearchParams({ q: query, limit: '30', offset: '0' });
      fetchJson<CourseSearchResponse>('/api/courses?' + params.toString(), controller.signal)
        .then(response => {
          setSearchResults(response.courses);
          setSearchTotal(response.total);
          setSearchHasNext(response.pagination.hasNextPage);
        })
        .catch((error: Error) => {
          if (error.name !== 'AbortError') {
            setSearchResults([]);
            setSearchTotal(0);
            setSearchHasNext(false);
            setSearchError(error.message);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearchLoading(false);
        });
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: '30', page: '1' });
    if (filters.state) params.set('state', filters.state);
    if (filters.city) params.set('city', filters.city);
    if (filters.institution) params.set('institution', filters.institution);

    setCatalogLoading(true);
    setCatalogError('');
    setCatalogPage(1);
    fetchJson<CourseSearchResponse>('/api/courses?' + params.toString(), controller.signal)
      .then(response => {
        setCatalogResults(response.courses);
        setCatalogTotal(response.total);
        setCatalogHasNext(response.pagination.hasNextPage);
      })
      .catch((error: Error) => {
        if (error.name !== 'AbortError') {
          setCatalogResults([]);
          setCatalogError(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCatalogLoading(false);
      });

    return () => {
      controller.abort();
      catalogMoreController.current?.abort();
    };
  }, [filterReloadKey, filters.city, filters.institution, filters.state]);

  useEffect(() => {
    if (!filters.course) {
      setCourseResponse(null);
      setCoursePreview(null);
      setAvailableModalities([]);
      setSelectedModality('');
      setDetailsError('');
      setModalityNotice('');
      setShowDetails(false);
      setActiveDetailTab('years');
      return;
    }

    const selectedCourse = options.courses.find(course => String(course.id) === filters.course);
    if (!selectedCourse) return;

    const controller = new AbortController();
    setLoadingFilters(previous => ({ ...previous, details: true }));
    setDetailsError('');
    setModalityNotice('');
    setCoursePreview(null);
    setShowDetails(false);
    setActiveDetailTab('years');

    fetchJson<CourseApiResponse>('/api/courses/' + selectedCourse.code, controller.signal)
      .then(data => {
        setCourseResponse(data);
        const modalities = getAvailableModalities(data.references);
        setAvailableModalities(modalities);
        setSelectedModality('');
        if (modalities.length === 0) {
          setModalityNotice('Nenhuma referência com código oficial está disponível para a edição mais recente deste curso.');
        }
      })
      .catch((error: Error) => {
        if (error.name !== 'AbortError') {
          setCourseResponse(null);
          setAvailableModalities([]);
          setDetailsError(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingFilters(previous => ({ ...previous, details: false }));
        }
      });

    return () => controller.abort();
  }, [detailsReloadKey, filters.course, options.courses, setSelectedModality]);

  useEffect(() => {
    if (!courseResponse || !selectedModality) {
      setCoursePreview(null);
      return;
    }

    const selection = selectLatestReference(courseResponse.references, selectedModality);
    if (!selection.ok) {
      setCoursePreview(null);
      setModalityNotice(
        selection.error === 'NO_REFERENCE_FOR_MODALITY'
          ? 'NO_REFERENCE_FOR_MODALITY: esta modalidade não possui referência nesta oferta. Nenhum valor de Ampla foi substituído.'
          : 'A referência desta modalidade contém valores inválidos e não pode ser usada.',
      );
      return;
    }

    const reference = selection.reference;
    const sameEditionWeights = courseResponse.weights_history.find(weight => (
      weight.year === reference.edition && reference.weightsEdition === reference.edition
    )) || null;
    const calculationWeights = toCalculationWeights(sameEditionWeights);
    const weightCandidates = sameEditionWeights
      ? WEIGHT_LABELS
        .map(([key, label]) => ({ label, value: sameEditionWeights.pesos[key] }))
        .filter((item): item is { label: string; value: number } => typeof item.value === 'number')
        .sort((left, right) => right.value - left.value)
      : [];
    const activeData = toYearCutScore(reference);

    setModalityNotice('');
    setCoursePreview({
      id: courseResponse.course.id,
      code: courseResponse.course.code,
      name: courseResponse.course.name,
      degree: courseResponse.course.degree || 'Grau não informado',
      university: courseResponse.course.university || 'Instituição não informada',
      campus: courseResponse.course.campus || '',
      city: courseResponse.course.city || '',
      state: courseResponse.course.state || '',
      schedule: courseResponse.course.schedule || 'Turno não informado',
      cut_score: selection.cutoff,
      cut_score_year: reference.edition,
      cut_score_type: activeData.cut_score_type,
      highest_weight: weightCandidates[0]?.label || '',
      weights: calculationWeights,
      weights_year: sameEditionWeights?.year ?? null,
      minimums: sameEditionWeights?.minimos ?? null,
      activeData,
      reference,
      verification: reference.verification.status,
      availableModalities,
    });
  }, [availableModalities, courseResponse, selectedModality]);

  const scoreResult = useMemo(
    () => calculateWeightedScore(scores, coursePreview?.weights),
    [coursePreview?.weights, scores],
  );
  const userAverage = hasScores ? scoreResult.average : null;
  const comparisonAllowed = Boolean(
    coursePreview
    && coursePreview.verification !== 'conflict'
    && userAverage !== null
    && scoreResult.minimums.status !== 'failed'
    && scoreResult.minimums.status !== 'not_evaluated',
  );
  const margin = comparisonAllowed && coursePreview && userAverage !== null
    ? userAverage - coursePreview.cut_score
    : null;
  const detailCourse = useMemo(
    () => courseResponse ? toCourseDetailData(courseResponse) : null,
    [courseResponse],
  );
  const latestCourseEdition = useMemo(() => {
    if (!courseResponse?.references.length) return null;
    return Math.max(...courseResponse.references.map(reference => reference.edition));
  }, [courseResponse]);
  const handleDetailTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = OFFER_DETAIL_TAB_ORDER.indexOf(activeDetailTab);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? OFFER_DETAIL_TAB_ORDER.length - 1
        : event.key === 'ArrowRight'
          ? (currentIndex + 1) % OFFER_DETAIL_TAB_ORDER.length
          : (currentIndex - 1 + OFFER_DETAIL_TAB_ORDER.length) % OFFER_DETAIL_TAB_ORDER.length;
    const nextTab = OFFER_DETAIL_TAB_ORDER[nextIndex];
    setActiveDetailTab(nextTab);
    window.requestAnimationFrame(() => {
      document.getElementById(`${detailTabsId}-tab-${nextTab}`)?.focus();
    });
  };

  const handleSaveScores = () => {
    const parsed = {
      redacao: tempScores.redacao.trim() === '' ? Number.NaN : Number(tempScores.redacao),
      linguagens: tempScores.linguagens.trim() === '' ? Number.NaN : Number(tempScores.linguagens),
      matematica: tempScores.matematica.trim() === '' ? Number.NaN : Number(tempScores.matematica),
      humanas: tempScores.humanas.trim() === '' ? Number.NaN : Number(tempScores.humanas),
      natureza: tempScores.natureza.trim() === '' ? Number.NaN : Number(tempScores.natureza),
    };
    const validation = validateScores(parsed);
    if (!validation.valid || !setScores(parsed)) {
      setScoreError('Preencha as cinco notas com valores entre 0 e 1000.');
      return;
    }
    setScoreError('');
    setShowScoreInput(false);
  };

  const chooseSearchResult = (result: CourseSearchItem) => {
    const course: Course = {
      id: result.id,
      code: result.code,
      name: result.name,
      degree: result.degree,
      schedule: result.schedule,
    };
    setOptions(previous => ({
      ...previous,
      states: result.state && !previous.states.includes(result.state)
        ? [...previous.states, result.state].sort()
        : previous.states,
      cities: result.city ? [result.city] : [],
      institutions: result.university ? [result.university] : [],
      courses: [course],
    }));
    setFilters({
      state: result.state || '',
      city: result.city || '',
      institution: result.university || '',
      course: String(result.id),
    });
    setSearchQuery('');
    setSearchResults([]);
    setSelectedModality('');
    window.history.replaceState(null, '', `/?courseCode=${result.code}`);
    window.setTimeout(() => document.getElementById('results')?.scrollIntoView({ block: 'start' }), 0);
  };

  const selectCourseFromDropdown = (courseId: string) => {
    setFilters(previous => ({ ...previous, course: courseId }));
    setSearchQuery('');
    setSearchResults([]);
    setSelectedModality('');
    const course = options.courses.find(option => String(option.id) === courseId);
    window.history.replaceState(null, '', course ? `/?courseCode=${course.code}` : window.location.pathname);
    window.setTimeout(() => document.getElementById('results')?.scrollIntoView({ block: 'start' }), 0);
  };

  const clearSelectedCourse = () => {
    setCourseResponse(null);
    setCoursePreview(null);
    setAvailableModalities([]);
    setSelectedModality('');
    setShowDetails(false);
    setActiveDetailTab('years');
  };

  const backToResults = () => {
    setFilters(previous => ({ ...previous, course: '' }));
    clearSelectedCourse();
    window.history.replaceState(null, '', window.location.pathname);
    window.setTimeout(() => document.getElementById('results')?.scrollIntoView({ block: 'start' }), 0);
  };

  const startNewSearch = () => {
    setFilters(previous => ({ ...previous, course: '' }));
    clearSelectedCourse();
    window.history.replaceState(null, '', window.location.pathname);
    window.setTimeout(() => {
      const search = document.getElementById('main-course-search') as HTMLInputElement | null;
      search?.scrollIntoView({ block: 'center' });
      search?.focus();
    }, 0);
  };

  const loadMoreCourses = async () => {
    if (catalogLoading || !catalogHasNext) return;
    catalogMoreController.current?.abort();
    const controller = new AbortController();
    catalogMoreController.current = controller;
    const nextPage = catalogPage + 1;
    const params = new URLSearchParams({ limit: '30', page: String(nextPage) });
    if (filters.state) params.set('state', filters.state);
    if (filters.city) params.set('city', filters.city);
    if (filters.institution) params.set('institution', filters.institution);

    setCatalogLoading(true);
    setCatalogError('');
    try {
      const response = await fetchJson<CourseSearchResponse>(
        '/api/courses?' + params.toString(),
        controller.signal,
      );
      setCatalogResults(previous => {
        const unique = new Map(previous.map(course => [course.id, course]));
        for (const course of response.courses) unique.set(course.id, course);
        return Array.from(unique.values());
      });
      setCatalogPage(nextPage);
      setCatalogTotal(response.total);
      setCatalogHasNext(response.pagination.hasNextPage);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') setCatalogError(error.message);
    } finally {
      if (!controller.signal.aborted) setCatalogLoading(false);
    }
  };

  const loadMoreSearchResults = async () => {
    const query = searchQuery.trim();
    if (query.length < 2 || searchLoading || searchLoadingMore || !searchHasNext) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      q: query,
      limit: '30',
      offset: String(searchResults.length),
    });

    setSearchLoadingMore(true);
    setSearchError('');
    try {
      const response = await fetchJson<CourseSearchResponse>(
        '/api/courses?' + params.toString(),
        controller.signal,
      );
      setSearchResults(previous => {
        const unique = new Map(previous.map(course => [course.id, course]));
        for (const course of response.courses) unique.set(course.id, course);
        return Array.from(unique.values());
      });
      setSearchTotal(response.total);
      setSearchHasNext(response.pagination.hasNextPage);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') setSearchError(error.message);
    } finally {
      setSearchLoadingMore(false);
    }
  };

  const hasActiveSearch = searchQuery.trim().length >= 2;
  const visibleCourses = hasActiveSearch ? searchResults : catalogResults;
  const visibleCoursesLoading = hasActiveSearch ? searchLoading : catalogLoading;
  const visibleCoursesError = hasActiveSearch ? searchError : catalogError;

  return (
    <>
      <XtriHeader
        onOpenScores={() => setShowScoreInput(true)}
        onExplore={courseResponse ? backToResults : undefined}
        onSearch={courseResponse ? startNewSearch : undefined}
        showPlan={Boolean(coursePreview)}
      />

      <main id="top" className={styles.main}>
        {!courseResponse && (
        <section className={styles.filtersSection} aria-labelledby="filters-title">
          <div className={styles.shell}>
            <div className={styles.filtersIntro}>
              <p className={styles.filtersEyebrow}>XTRI SISU</p>
              <h1 id="filters-title" className={styles.filtersTitle}>Encontre sua próxima possibilidade</h1>
              <p>Busque um curso, universidade ou cidade e compare referências oficiais com clareza.</p>
            </div>

            <div className={styles.directSearch}>
              <p className={styles.directSearchTitle}>Busca rápida</p>
              <div className={styles.courseSearchField}>
                <label className={styles.srOnly} htmlFor="main-course-search">
                  Curso, instituição ou cidade
                </label>
                <div className={styles.searchControl}>
                  <input
                    id="main-course-search"
                    type="search"
                    value={searchQuery}
                    onChange={event => setSearchQuery(event.target.value)}
                    placeholder="Ex.: Medicina, UFRN ou Natal"
                    autoComplete="off"
                    aria-describedby="search-help"
                    aria-expanded={searchResults.length > 0}
                  />
                </div>
                <span id="search-help" className={styles.searchHelp}>
                  Digite pelo menos 2 caracteres. Você escolhe a modalidade depois de selecionar a oferta.
                </span>

                {hasActiveSearch && (
                  <div className={styles.searchPopover}>
                    {searchLoading && <p className={styles.inlineStatus} role="status">Buscando...</p>}
                    {searchError && <p className={styles.inlineError} role="alert">{searchError}</p>}
                    {!searchLoading && !searchError && searchResults.length === 0 && (
                      <p className={styles.inlineStatus} role="status">Nenhuma oferta encontrada.</p>
                    )}
                    {searchResults.length > 0 && (
                      <ul className={styles.searchResults} aria-label="Resultados da busca">
                        {searchResults.map(result => (
                          <li key={result.id}>
                            <button type="button" onClick={() => chooseSearchResult(result)}>
                              <strong>{result.name}</strong>
                              <span>{[result.university, result.city, result.state].filter(Boolean).join(' · ')}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>

            <p className={styles.filterDivider}><span>ou refine por localização</span></p>

            <div className={styles.filterGrid}>
              <div className={styles.filterField}>
                <label className={styles.srOnly} htmlFor="state-filter">Estado</label>
                <div className={styles.controlWrap}>
                  <select
                    id="state-filter"
                    aria-label="Estado"
                    value={filters.state}
                    onChange={event => {
                      setFilters({ state: event.target.value, city: '', institution: '', course: '' });
                      setSearchQuery('');
                      clearSelectedCourse();
                    }}
                  >
                    <option value="">Estado</option>
                    {options.states.map(state => <option key={state} value={state}>{state}</option>)}
                  </select>
                  <ChevronDown size={18} aria-hidden="true" />
                </div>
              </div>

              <div className={styles.filterField}>
                <label className={styles.srOnly} htmlFor="city-filter">Cidade</label>
                <div className={styles.controlWrap}>
                  <select
                    id="city-filter"
                    aria-label="Cidade"
                    value={filters.city}
                    disabled={!filters.state}
                    onChange={event => {
                      setFilters(previous => ({
                        ...previous,
                        city: event.target.value,
                        institution: '',
                        course: '',
                      }));
                      setSearchQuery('');
                      clearSelectedCourse();
                    }}
                  >
                    <option value="">{loadingFilters.cities ? 'Carregando...' : 'Cidade'}</option>
                    {options.cities.map(city => <option key={city} value={city}>{city}</option>)}
                  </select>
                  <ChevronDown size={18} aria-hidden="true" />
                </div>
              </div>

              <div className={styles.filterField}>
                <label className={styles.srOnly} htmlFor="institution-filter">Instituição</label>
                <div className={styles.controlWrap}>
                  <select
                    id="institution-filter"
                    aria-label="Instituição"
                    value={filters.institution}
                    disabled={!filters.city}
                    onChange={event => {
                      setFilters(previous => ({
                        ...previous,
                        institution: event.target.value,
                        course: '',
                      }));
                      setSearchQuery('');
                      clearSelectedCourse();
                    }}
                  >
                    <option value="">{loadingFilters.institutions ? 'Carregando...' : 'Instituição'}</option>
                    {options.institutions.map(institution => (
                      <option key={institution} value={institution}>{institution}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} aria-hidden="true" />
                </div>
              </div>

              <div className={styles.filterField}>
                <label className={styles.srOnly} htmlFor="course-filter">Curso</label>
                <div className={styles.controlWrap}>
                  <select
                    id="course-filter"
                    aria-label="Curso"
                    value={filters.course}
                    disabled={!filters.institution || loadingFilters.courses}
                    onChange={event => selectCourseFromDropdown(event.target.value)}
                  >
                    <option value="">
                      {loadingFilters.courses
                        ? 'Carregando cursos...'
                        : filters.institution && options.courses.length === 0
                          ? 'Nenhum curso disponível'
                          : 'Curso'}
                    </option>
                    {options.courses.map(course => (
                      <option key={course.id} value={String(course.id)}>
                        {[course.name, course.degree, course.schedule].filter(Boolean).join(' · ')} ({course.code})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={18} aria-hidden="true" />
                </div>
              </div>
            </div>

          </div>
        </section>
        )}

        {!courseResponse && filterError && (
          <div className={styles.globalError} role="alert">
            <span>{filterError}</span>
            <button type="button" onClick={() => setFilterReloadKey(value => value + 1)}>
              <RefreshCw size={16} aria-hidden="true" />
              Tentar novamente
            </button>
          </div>
        )}

        {!courseResponse && noticeVisible && (
          <section className={styles.noticeArea}>
            <div className={styles.shell}>
              <div className={styles.trustNotice}>
                <button
                  type="button"
                  className={styles.noticeClose}
                  aria-label="Dispensar aviso"
                  onClick={() => setNoticeVisible(false)}
                >
                  <X size={18} aria-hidden="true" />
                </button>
                <p className={styles.noticeTitle}>Importante!</p>
                <p>
                  As referências exibidas identificam edição, modalidade, captura, intermediário e status
                  de verificação. Dados parciais não garantem seleção; confirme sempre no portal oficial.
                </p>
              </div>
            </div>
          </section>
        )}

        <section id="results" className={styles.resultsSection} aria-labelledby="results-title">
          <div className={styles.shell}>
            {courseResponse ? (
              <div className={styles.selectedView}>
                <div className={styles.selectedHeading}>
                  <div className={styles.selectedIdentity}>
                    <span className={styles.courseMark} aria-hidden="true">
                      <Building2 size={22} />
                    </span>
                    <div>
                      <h2>{courseResponse.course.name}</h2>
                      <p>
                        {[courseResponse.course.degree, courseResponse.course.university]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <div className={styles.courseMeta}>
                        <span><MapPinned size={16} aria-hidden="true" />{[courseResponse.course.city, courseResponse.course.state].filter(Boolean).join(', ')}</span>
                        <span><Clock3 size={16} aria-hidden="true" />{courseResponse.course.schedule || 'Turno não informado'}</span>
                        {latestCourseEdition && <span>SISU {latestCourseEdition}</span>}
                        <span>Código SISU {courseResponse.course.code}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.contextControl}>
                    <label htmlFor="selected-modality-filter">Modalidade oficial</label>
                    <div className={styles.controlWrap}>
                      <select
                        id="selected-modality-filter"
                        aria-label="Modalidade oficial com referência nesta edição"
                        value={selectedModality}
                        disabled={availableModalities.length === 0}
                        onChange={event => setSelectedModality(event.target.value)}
                      >
                        <option value="">Selecione a modalidade</option>
                        {availableModalities.map(modality => (
                          <option key={modality.id} value={modality.id}>{modality.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={18} aria-hidden="true" />
                    </div>
                    <details className={styles.modalityAssistant}>
                      <summary>Não sei qual é a minha modalidade</summary>
                      <p>
                        Confira escola pública, renda de até 1 salário mínimo per capita, pertencimento
                        étnico-racial, deficiência e os critérios específicos da instituição. A XTRI nunca
                        escolhe ou substitui sua modalidade.
                      </p>
                      <a
                        href="https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14723.htm"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ver critérios oficiais
                      </a>
                    </details>
                  </div>
                </div>

                <div className={styles.detailTabs} role="tablist" aria-label="Seções da oferta">
                  {OFFER_DETAIL_TAB_ORDER.map(tab => (
                    <button
                      key={tab}
                      id={`${detailTabsId}-tab-${tab}`}
                      type="button"
                      role="tab"
                      aria-selected={activeDetailTab === tab}
                      aria-controls={`${detailTabsId}-panel-${tab}`}
                      tabIndex={activeDetailTab === tab ? 0 : -1}
                      className={activeDetailTab === tab ? styles.activeDetailTab : undefined}
                      onClick={() => setActiveDetailTab(tab)}
                      onKeyDown={handleDetailTabKeyDown}
                    >
                      {OFFER_DETAIL_TAB_LABELS[tab]}
                    </button>
                  ))}
                </div>

                {loadingFilters.details && (
                  <div className={styles.catalogState} role="status" aria-live="polite">
                    <span className={styles.spinner} aria-hidden="true" />
                    Carregando a oferta e suas referências...
                  </div>
                )}

                {detailsError && (
                  <div className={styles.errorState} role="alert">
                    <p>{detailsError}</p>
                    <button type="button" onClick={() => setDetailsReloadKey(value => value + 1)}>
                      Tentar novamente
                    </button>
                  </div>
                )}

                {!loadingFilters.details && activeDetailTab !== 'statistics' && !selectedModality && !modalityNotice && (
                  <div className={styles.selectionPrompt} role="status">
                    <strong>Falta só confirmar a modalidade.</strong>
                    Selecione acima a opção oficial que corresponde ao seu caso. Nenhum valor de Ampla
                    será usado como substituto.
                  </div>
                )}

                {modalityNotice && <div className={styles.selectionPrompt} role="status">{modalityNotice}</div>}

                {!loadingFilters.details && !detailsError && activeDetailTab === 'years' && (
                  <section
                    id={`${detailTabsId}-panel-years`}
                    role="tabpanel"
                    aria-labelledby={`${detailTabsId}-tab-years`}
                    className={styles.detailTabPanel}
                  >
                    {coursePreview ? (
                      <>
                        <PointsPlan
                          courseName={coursePreview.name}
                          modalityName={coursePreview.reference.modalityOfficialName}
                          edition={coursePreview.cut_score_year}
                          scores={scores}
                          hasScores={hasScores}
                          weights={coursePreview.weights}
                          userAverage={userAverage}
                          cutoff={coursePreview.cut_score}
                          margin={margin}
                          comparisonAllowed={comparisonAllowed}
                          minimumStatus={scoreResult.minimums.status}
                          reference={coursePreview.reference}
                          detailsOpen={showDetails}
                          onEditScores={() => setShowScoreInput(true)}
                          onOpenRadar={() => setShowRadar(true)}
                          onOpenShare={() => setShowShare(true)}
                          onToggleDetails={() => setShowDetails(value => !value)}
                        />

                        {showDetails && detailCourse && (
                          <div className={styles.expandedDetails}>
                            <CourseDetailView course={detailCourse} />
                          </div>
                        )}
                      </>
                    ) : (
                      <div className={styles.tabEmptyState} role="status">
                        Selecione uma modalidade oficial para ver a comparação, os pesos e a proveniência.
                      </div>
                    )}
                  </section>
                )}

                {!loadingFilters.details && !detailsError && activeDetailTab === 'statistics' && (
                  <section
                    id={`${detailTabsId}-panel-statistics`}
                    role="tabpanel"
                    aria-labelledby={`${detailTabsId}-tab-statistics`}
                    className={styles.detailTabPanel}
                  >
                    {courseResponse ? (
                      <CourseStatisticsPanel
                        courseCode={courseResponse.course.code}
                        selectedModality={selectedModality}
                        availableModalities={availableModalities}
                        onModalityChange={setSelectedModality}
                      />
                    ) : (
                      <div className={styles.tabEmptyState} role="status">
                        Selecione uma modalidade oficial para ver estatísticas da mesma referência.
                      </div>
                    )}
                  </section>
                )}

                {!loadingFilters.details && !detailsError && activeDetailTab === 'nearby' && (
                  <section
                    id={`${detailTabsId}-panel-nearby`}
                    role="tabpanel"
                    aria-labelledby={`${detailTabsId}-tab-nearby`}
                    className={styles.detailTabPanel}
                  >
                    {coursePreview ? (
                      <NearbyOffersPanel
                        comparisonEnabled={comparisonAllowed}
                        courseName={coursePreview.name}
                        referenceCourseId={coursePreview.id}
                        modalityName={coursePreview.reference.modalityOfficialName}
                        referenceCity={coursePreview.city}
                        referenceState={coursePreview.state}
                        onOpenFullRadar={() => setShowRadar(true)}
                      />
                    ) : (
                      <div className={styles.tabEmptyState} role="status">
                        Selecione uma modalidade oficial para buscar outras ofertas do mesmo curso.
                      </div>
                    )}
                  </section>
                )}
              </div>
            ) : (
              <>
                <div className={styles.resultsHeader}>
                  <div>
                    <h2 id="results-title">Resultados</h2>
                    <p role="region" aria-label="Cobertura medida da base">
                      {hasActiveSearch
                        ? 'Ofertas correspondentes à sua busca'
                        : systemStats.totalCourses > 0
                          ? [
                              `${systemStats.totalCourses.toLocaleString('pt-BR')} ofertas`,
                              `${systemStats.totalUniversities.toLocaleString('pt-BR')} instituições`,
                              `${systemStats.totalStates} UFs`,
                              systemStats.missingStates.length > 0
                                ? `faltam ${systemStats.missingStates.join(', ')}`
                                : null,
                            ].filter(Boolean).join(' · ')
                          : catalogTotal > 0
                            ? catalogTotal.toLocaleString('pt-BR') + ' ofertas na cobertura atual'
                            : 'Carregando a cobertura medida da base…'}
                    </p>
                  </div>
                  <a href="https://sisu.mec.gov.br/vagas" target="_blank" rel="noopener noreferrer">
                    <ShieldCheck size={17} aria-hidden="true" />
                    Fonte oficial
                  </a>
                </div>

                {visibleCoursesError && (
                  <div className={styles.errorState} role="alert">
                    <p>{visibleCoursesError}</p>
                    <button type="button" onClick={() => setFilterReloadKey(value => value + 1)}>
                      Tentar novamente
                    </button>
                  </div>
                )}

                {visibleCoursesLoading && visibleCourses.length === 0 && (
                  <div className={styles.catalogState} role="status">
                    <span className={styles.spinner} aria-hidden="true" />
                    Carregando ofertas...
                  </div>
                )}

                {!visibleCoursesLoading && !visibleCoursesError && visibleCourses.length === 0 && (
                  <div className={styles.emptyCatalog} role="status">
                    <AlertTriangle size={22} aria-hidden="true" />
                    Nenhuma oferta encontrada para estes filtros.
                  </div>
                )}

                {visibleCourses.length > 0 && (
                  <>
                    <div className={styles.resultsGrid}>
                      {visibleCourses.map(course => (
                        <CourseResultCard key={course.id} course={course} onSelect={chooseSearchResult} />
                      ))}
                    </div>
                    {hasActiveSearch && (
                      <p className={styles.resultsCount}>
                        Exibindo {visibleCourses.length.toLocaleString('pt-BR')} de {searchTotal.toLocaleString('pt-BR')} ofertas encontradas
                      </p>
                    )}
                  </>
                )}

                {hasActiveSearch && searchHasNext && (
                  <button
                    type="button"
                    className={styles.loadMore}
                    disabled={searchLoadingMore}
                    onClick={loadMoreSearchResults}
                  >
                    {searchLoadingMore ? 'Carregando...' : 'Ver mais resultados'}
                  </button>
                )}

                {!hasActiveSearch && catalogHasNext && (
                  <button
                    type="button"
                    className={styles.loadMore}
                    disabled={catalogLoading}
                    onClick={loadMoreCourses}
                  >
                    {catalogLoading ? 'Carregando...' : 'Ver mais'}
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        <footer id="about" className={styles.footer}>
          <div className={styles.shell}>
            <div className={styles.footerIntro}>
              <span className={styles.footerBrand}>
                <img src="/xtri-logo.png" alt="" />
                <strong>XTRI SISU</strong>
              </span>
              <p>
                Dados para decidir com clareza. Referências parciais e históricas não garantem seleção,
                e nenhuma modalidade é escolhida automaticamente.
              </p>
            </div>
            <nav className={styles.ecosystemLinks} aria-label="Ecossistema XTRI">
              <a
                href="https://xtri.online"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Conheça a XTRI"
              >
                <span>Conheça a XTRI</span>
                <strong>xtri.online <ExternalLink size={14} aria-hidden="true" /></strong>
              </a>
              <a
                href="https://rankingenem.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Ranking ENEM para escolas"
              >
                <span>Para escolas</span>
                <strong>Ranking ENEM <ExternalLink size={14} aria-hidden="true" /></strong>
              </a>
              <a
                href="https://instagram.com/xandaoxtri"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram @xandaoxtri"
              >
                <span>Acompanhe conteúdos</span>
                <strong>@xandaoxtri <ExternalLink size={14} aria-hidden="true" /></strong>
              </a>
            </nav>
          </div>
        </footer>
      </main>

      <ScoreModal
        isOpen={showScoreInput}
        edition={systemStats.latestEdition}
        values={tempScores}
        error={scoreError}
        rememberScores={rememberScores}
        onChange={setTempScores}
        onRememberChange={setRememberScores}
        onClear={() => {
          clearScores();
          setScoreError('');
          setTempScores({
            redacao: '',
            linguagens: '',
            matematica: '',
            humanas: '',
            natureza: '',
          });
        }}
        onClose={() => {
          setScoreError('');
          setShowScoreInput(false);
        }}
        onSave={handleSaveScores}
      />

      {coursePreview && comparisonAllowed && (
        <ApprovalRadarModal
          isOpen={showRadar}
          onClose={() => setShowRadar(false)}
          baseCourseName={coursePreview.name}
          referenceCourseId={coursePreview.id}
          referenceCity={coursePreview.city}
          referenceState={coursePreview.state}
          modalityName={coursePreview.reference.modalityOfficialName}
        />
      )}
      {coursePreview && comparisonAllowed && userAverage !== null && (
        <ShareModal
          isOpen={showShare}
          onClose={() => setShowShare(false)}
          course={coursePreview}
          userScore={userAverage}
        />
      )}
    </>
  );
}
