'use client';

import { useEffect, useMemo, useState } from 'react';
import { useScores } from '../context/ScoreContext';
import { useModality } from '../context/ModalityContext';
import { calculateWeightedScore, type CourseWeights, validateScores } from '../lib/score-core';
import { getEffectiveCutoff, selectLatestReference } from '../lib/course-selection';
import CourseDetailView from '../components/CourseDetail/CourseDetailView';
import ProbabilityGauge from '../components/CourseDetail/ProbabilityGauge';
import ApprovalRadarModal from '../components/CourseDetail/ApprovalRadarModal';
import ShareModal from '../components/CourseDetail/ShareModal';
import DataTrustPanel from '../components/DataTrustPanel';
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

const SCORE_FIELDS = [
  { key: 'redacao', label: 'Redação' },
  { key: 'linguagens', label: 'Linguagens' },
  { key: 'matematica', label: 'Matemática' },
  { key: 'humanas', label: 'Ciências Humanas' },
  { key: 'natureza', label: 'Ciências da Natureza' },
] as const;

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

function getDailyTrend(data: YearCutScore): string {
  const partials = data.partial_scores;
  if (partials.length < 2) return 'Tendência indisponível: são necessárias ao menos duas parciais.';
  const previous = partials[partials.length - 2];
  const latest = partials[partials.length - 1];
  const difference = latest.score - previous.score;
  if (difference === 0) return 'Sem variação desde a parcial anterior.';
  return (difference > 0 ? '+' : '') + formatScore(difference)
    + ' pontos desde a parcial anterior.';
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
  const [searchError, setSearchError] = useState('');

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
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearchLoading(true);
      setSearchError('');
      const params = new URLSearchParams({ q: query, limit: '8' });
      fetchJson<CourseSearchResponse>('/api/courses?' + params.toString(), controller.signal)
        .then(response => setSearchResults(response.courses))
        .catch((error: Error) => {
          if (error.name !== 'AbortError') {
            setSearchResults([]);
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
    if (!filters.course) {
      setCourseResponse(null);
      setCoursePreview(null);
      setAvailableModalities([]);
      setSelectedModality('');
      setDetailsError('');
      setModalityNotice('');
      setShowDetails(false);
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
  const hasEnteredScores = Object.values(scores).some(score => score > 0);
  const simpleAverage = hasEnteredScores
    ? (scores.redacao + scores.linguagens + scores.matematica + scores.humanas + scores.natureza) / 5
    : null;
  const userAverage = scoreResult.average;
  const comparisonAllowed = Boolean(
    coursePreview
    && coursePreview.verification === 'verified'
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
  };

  const clearSelectedCourse = () => {
    setCourseResponse(null);
    setCoursePreview(null);
    setAvailableModalities([]);
    setSelectedModality('');
    setShowDetails(false);
  };

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logoContainer}>
            <img src="/xtri-logo.png" alt="" className={styles.logoImage} />
            <h1 className={styles.logo}>XTRI SISU</h1>
          </div>
          <a
            className={styles.officialLink}
            href="https://sisu.mec.gov.br/vagas"
            target="_blank"
            rel="noopener noreferrer"
          >
            Consultar SISU/MEC
          </a>
        </div>
      </header>

      <section className={styles.hero} aria-labelledby="hero-title">
        <h2 id="hero-title" className={styles.heroTitle}>
          Referências do SISU
          <span className={styles.heroHighlight}> com origem identificada</span>
        </h2>
        <p className={styles.heroSubtitle}>
          Compare suas notas somente quando edição, modalidade, pesos e fonte puderem ser conferidos.
          Classificações parciais não garantem seleção.
        </p>
      </section>

      <section className={styles.statsBar} aria-label="Cobertura medida da base">
        <div className={styles.statItem}>
          <span className={styles.statNumber}>
            {systemStats.totalCourses ? systemStats.totalCourses.toLocaleString('pt-BR') : '—'}
          </span>
          <span className={styles.statLabel}>Ofertas</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>
            {systemStats.totalUniversities ? systemStats.totalUniversities.toLocaleString('pt-BR') : '—'}
          </span>
          <span className={styles.statLabel}>Instituições</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>{systemStats.totalStates || '—'}</span>
          <span className={styles.statLabel}>UFs cobertas</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>{simpleAverage === null ? '—' : formatScore(simpleAverage)}</span>
          <span className={styles.statLabel}>Média simples</span>
        </div>
      </section>

      {systemStats.missingStates.length > 0 && (
        <p className={styles.coverageNote}>
          UFs ainda ausentes da cobertura: {systemStats.missingStates.join(', ')}.
        </p>
      )}

      {filterError && (
        <div className={styles.globalError} role="alert">
          <span>{filterError}</span>
          <button type="button" onClick={() => setFilterReloadKey(value => value + 1)}>
            Tentar novamente
          </button>
        </div>
      )}

      <div className={styles.content}>
        <aside className={styles.sidebar} aria-label="Minhas notas">
          <div className={styles.scoreCard}>
            <div className={styles.scoreCardHeader}>
              <h3>Suas notas do ENEM</h3>
              {!showScoreInput && (
                <button
                  type="button"
                  className={styles.editButton}
                  onClick={() => setShowScoreInput(true)}
                >
                  Editar
                </button>
              )}
            </div>

            {showScoreInput ? (
              <div className={styles.scoreInputs}>
                {SCORE_FIELDS.map(field => (
                  <div className={styles.inputGroup} key={field.key}>
                    <label htmlFor={'score-' + field.key}>{field.label}</label>
                    <input
                      id={'score-' + field.key}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="1000"
                      step="0.01"
                      value={tempScores[field.key]}
                      onChange={event => setTempScores(previous => ({
                        ...previous,
                        [field.key]: event.target.value,
                      }))}
                      placeholder="0 a 1000"
                      aria-invalid={Boolean(scoreError)}
                    />
                  </div>
                ))}
                {scoreError && <p className={styles.scoreError} role="alert">{scoreError}</p>}
                <button type="button" className={styles.saveButton} onClick={handleSaveScores}>
                  Usar estas notas
                </button>
              </div>
            ) : (
              <div className={styles.scoreDisplay}>
                {SCORE_FIELDS.map(field => (
                  <div className={styles.scoreRow} key={field.key}>
                    <span>{field.label}</span>
                    <strong>{hasEnteredScores ? formatScore(scores[field.key]) : '—'}</strong>
                  </div>
                ))}
                <div className={styles.scoreDivider} />
                <div className={styles.scoreRow}>
                  <span>Média simples</span>
                  <strong className={styles.averageHighlight}>
                    {simpleAverage === null ? '—' : formatScore(simpleAverage)}
                  </strong>
                </div>
              </div>
            )}

            <label className={styles.rememberOption}>
              <input
                type="checkbox"
                checked={rememberScores}
                onChange={event => setRememberScores(event.target.checked)}
              />
              <span>Lembrar neste dispositivo por 30 dias</span>
            </label>
            <button
              type="button"
              className={styles.clearScoresButton}
              onClick={() => {
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
            >
              Limpar minhas notas
            </button>
            <p className={styles.privacyNote}>
              Por padrão, as notas ficam somente na memória desta aba.
            </p>
          </div>
        </aside>

        <section className={styles.searchSection} aria-labelledby="course-search-title">
          <div className={styles.searchCard}>
            <h3 id="course-search-title">Encontre uma oferta</h3>

            <div className={styles.primarySearch}>
              <label htmlFor="main-course-search">Curso, instituição ou cidade</label>
              <input
                id="main-course-search"
                type="search"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Ex.: Medicina, UFGD ou Dourados"
                autoComplete="off"
                aria-describedby="search-help"
              />
              <span id="search-help">Digite ao menos 2 caracteres.</span>
              {searchLoading && <p className={styles.inlineStatus} role="status">Buscando...</p>}
              {searchError && <p className={styles.inlineError} role="alert">{searchError}</p>}
              {!searchLoading && searchQuery.trim().length >= 2 && !searchError && searchResults.length === 0 && (
                <p className={styles.inlineStatus} role="status">Nenhuma oferta encontrada.</p>
              )}
              {searchResults.length > 0 && (
                <ul className={styles.searchResults} aria-label="Resultados da busca">
                  {searchResults.map(result => (
                    <li key={result.id}>
                      <button type="button" onClick={() => chooseSearchResult(result)}>
                        <strong>{result.name}</strong>
                        <span>
                          {[result.university, result.city, result.state].filter(Boolean).join(' · ')}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <details className={styles.secondaryFilters}>
              <summary>Filtrar por localização</summary>
              <div className={styles.filterGrid}>
                <div className={styles.filterGroup}>
                  <label htmlFor="state-filter">UF</label>
                  <select
                    id="state-filter"
                    value={filters.state}
                    onChange={event => {
                      setFilters({ state: event.target.value, city: '', institution: '', course: '' });
                      clearSelectedCourse();
                    }}
                  >
                    <option value="">Selecione</option>
                    {options.states.map(state => <option key={state} value={state}>{state}</option>)}
                  </select>
                </div>
                <div className={styles.filterGroup}>
                  <label htmlFor="city-filter">Cidade</label>
                  <select
                    id="city-filter"
                    value={filters.city}
                    disabled={!filters.state}
                    onChange={event => {
                      setFilters(previous => ({
                        ...previous,
                        city: event.target.value,
                        institution: '',
                        course: '',
                      }));
                      clearSelectedCourse();
                    }}
                  >
                    <option value="">{loadingFilters.cities ? 'Carregando...' : 'Selecione'}</option>
                    {options.cities.map(city => <option key={city} value={city}>{city}</option>)}
                  </select>
                </div>
                <div className={styles.filterGroup}>
                  <label htmlFor="institution-filter">Instituição</label>
                  <select
                    id="institution-filter"
                    value={filters.institution}
                    disabled={!filters.city}
                    onChange={event => {
                      setFilters(previous => ({
                        ...previous,
                        institution: event.target.value,
                        course: '',
                      }));
                      clearSelectedCourse();
                    }}
                  >
                    <option value="">{loadingFilters.institutions ? 'Carregando...' : 'Selecione'}</option>
                    {options.institutions.map(institution => (
                      <option key={institution} value={institution}>{institution}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.filterGroup}>
                  <label htmlFor="course-filter">Oferta</label>
                  <select
                    id="course-filter"
                    value={filters.course}
                    disabled={!filters.institution}
                    onChange={event => {
                      setFilters(previous => ({ ...previous, course: event.target.value }));
                      clearSelectedCourse();
                    }}
                  >
                    <option value="">{loadingFilters.courses ? 'Carregando...' : 'Selecione'}</option>
                    {options.courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                        {course.degree ? ' — ' + course.degree : ''}
                        {course.schedule ? ' — ' + course.schedule : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </details>

            {courseResponse && (
              <div className={styles.modalitySection}>
                <div className={styles.filterGroup}>
                  <label htmlFor="modality-filter">Modalidade oficial com referência nesta edição</label>
                  <select
                    id="modality-filter"
                    value={selectedModality}
                    onChange={event => setSelectedModality(event.target.value)}
                  >
                    <option value="">Confirme sua modalidade</option>
                    {availableModalities.map(modality => (
                      <option key={modality.id} value={modality.id}>{modality.name}</option>
                    ))}
                  </select>
                </div>
                <details className={styles.modalityAssistant}>
                  <summary>Como confirmar minha modalidade?</summary>
                  <p>
                    Confira escola pública, renda de até 1 salário mínimo per capita, pertencimento
                    étnico-racial, condição de pessoa com deficiência e critérios específicos da instituição.
                    Este assistente não decide por você.
                  </p>
                  <a
                    href="https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14723.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver critérios da Lei 14.723/2023
                  </a>
                </details>
              </div>
            )}

            {loadingFilters.details && (
              <div className={styles.loadingPreview} role="status" aria-live="polite">
                <div className={styles.spinner} aria-hidden="true" />
                <p>Carregando a oferta e suas referências...</p>
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

            {!loadingFilters.details && courseResponse && !selectedModality && !modalityNotice && (
              <div className={styles.emptyState} role="status">
                Confirme uma das modalidades oficiais disponíveis para ver a referência correspondente.
              </div>
            )}

            {modalityNotice && <div className={styles.emptyState} role="status">{modalityNotice}</div>}

            {coursePreview && !loadingFilters.details && (
              <article className={styles.coursePreview}>
                <div className={styles.previewHeader}>
                  <div>
                    <h4>{coursePreview.name}</h4>
                    <p>{coursePreview.university}</p>
                  </div>
                  <span className={styles.previewDegree}>{coursePreview.degree}</span>
                </div>

                <div className={styles.previewInfo}>
                  <span>{[coursePreview.campus, coursePreview.city, coursePreview.state].filter(Boolean).join(' · ')}</span>
                  <span>Turno: {coursePreview.schedule}</span>
                  {coursePreview.highest_weight && (
                    <span>Maior peso em {coursePreview.weights_year}: {coursePreview.highest_weight}</span>
                  )}
                </div>

                <section className={styles.resultSection} aria-labelledby="result-title">
                  <h5 id="result-title">Resumo da comparação</h5>
                  <div className={styles.resultGrid}>
                    <div>
                      <span>Sua nota ponderada</span>
                      <strong>{userAverage === null ? 'Indisponível' : formatScore(userAverage)}</strong>
                      <small>
                        {coursePreview.weights_year
                          ? 'Pesos da edição ' + coursePreview.weights_year
                          : 'Pesos da mesma edição não disponíveis'}
                      </small>
                    </div>
                    <div>
                      <span>Última referência</span>
                      <strong>{formatScore(coursePreview.cut_score)}</strong>
                      <small>{coursePreview.cut_score_type} · edição {coursePreview.cut_score_year}</small>
                    </div>
                    <div>
                      <span>Margem verificável</span>
                      <strong>{margin === null ? 'Suspensa' : (margin > 0 ? '+' : '') + formatScore(margin)}</strong>
                      <small>
                        {margin === null
                          ? 'Liberada somente após conferência oficial'
                          : margin >= 0 ? 'pontos acima da referência' : 'pontos abaixo da referência'}
                      </small>
                    </div>
                  </div>
                  {comparisonAllowed && userAverage !== null && (
                    <ProbabilityGauge userScore={userAverage} cutScore={coursePreview.cut_score} />
                  )}
                  {!comparisonAllowed && (
                    <p className={styles.comparisonBlocked}>
                      Nenhum veredito foi produzido: esta referência ainda não está verificada, os pesos estão
                      indisponíveis ou algum requisito mínimo não pôde ser confirmado.
                    </p>
                  )}
                </section>

                <section className={styles.requirementsSection} aria-labelledby="requirements-title">
                  <h5 id="requirements-title">Requisitos mínimos da edição</h5>
                  {coursePreview.minimums && Object.values(coursePreview.minimums).some(value => value !== null) ? (
                    <dl className={styles.minimumsGrid}>
                      {[
                        ['Redação', coursePreview.minimums.redacao],
                        ['Linguagens', coursePreview.minimums.linguagens],
                        ['Matemática', coursePreview.minimums.matematica],
                        ['Humanas', coursePreview.minimums.humanas],
                        ['Natureza', coursePreview.minimums.natureza],
                        ['Média ENEM', coursePreview.minimums.enem],
                      ].map(([label, value]) => (
                        <div key={String(label)}>
                          <dt>{label}</dt>
                          <dd>{typeof value === 'number' ? formatScore(value) : 'Não exigido'}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className={styles.sectionEmpty}>Mínimos da mesma edição não informados.</p>
                  )}
                  {scoreResult.minimums.status === 'failed' && (
                    <p className={styles.minimumWarning} role="alert">
                      Uma ou mais notas estão abaixo do mínimo informado. A margem permanece suspensa.
                    </p>
                  )}
                </section>

                <section className={styles.trendSection} aria-labelledby="trend-title">
                  <h5 id="trend-title">Tendência e parciais</h5>
                  {coursePreview.activeData.partial_scores.length > 0 ? (
                    <>
                      <p className={styles.trendSummary}>{getDailyTrend(coursePreview.activeData)}</p>
                      <div className={styles.dailyCutsList}>
                        {coursePreview.activeData.partial_scores.map(partial => (
                          <div key={partial.day} className={styles.dailyCutRow}>
                            <span className={styles.dailyCutDay}>Dia {partial.day}</span>
                            <strong className={styles.dailyCutScore}>{formatScore(partial.score)}</strong>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className={styles.sectionEmpty}>Não há sequência de parciais para esta referência.</p>
                  )}
                </section>

                <DataTrustPanel
                  status={coursePreview.reference.verification.status}
                  edition={coursePreview.reference.edition}
                  modalityName={coursePreview.reference.modalityOfficialName}
                  referenceType={coursePreview.reference.referenceType}
                  capturedAt={coursePreview.reference.capturedAt}
                  checkedAt={coursePreview.reference.verification.checkedAt}
                  sourceUrl={coursePreview.reference.sourceUrl}
                  intermediary={coursePreview.reference.intermediary}
                />

                <div className={styles.actionButtons}>
                  <button
                    type="button"
                    className={styles.compareButton}
                    disabled={!comparisonAllowed}
                    onClick={() => setShowRadar(true)}
                  >
                    Radar de ofertas
                  </button>
                  <button
                    type="button"
                    className={styles.shareButton}
                    disabled={!comparisonAllowed}
                    onClick={() => setShowShare(true)}
                  >
                    Compartilhar comparação
                  </button>
                </div>
                {!comparisonAllowed && (
                  <p className={styles.actionHint}>
                    Radar e compartilhamento ficam indisponíveis enquanto a referência não estiver verificada.
                  </p>
                )}

                <button
                  type="button"
                  className={styles.viewButton}
                  onClick={() => {
                    setShowDetails(true);
                    window.setTimeout(() => {
                      document.getElementById('course-details')?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      });
                    }, 50);
                  }}
                >
                  Ver detalhes da oferta
                </button>
              </article>
            )}
          </div>
        </section>
      </div>

      {showDetails && detailCourse && (
        <section id="course-details" className={styles.inlineDetails} aria-labelledby="details-title">
          <div className={styles.inlineDetailsHeader}>
            <h2 id="details-title">Detalhes da oferta</h2>
            <button type="button" className={styles.closeButton} onClick={() => setShowDetails(false)}>
              Fechar
            </button>
          </div>
          <CourseDetailView course={detailCourse} />
        </section>
      )}

      <footer className={styles.footer}>
        <p className={styles.disclaimer}>
          As referências são capturadas por meio do MeuSISU/CloudFront e identificadas individualmente com
          edição, modalidade e horário. Dados parciais não garantem seleção. Confirme sempre no{' '}
          <a href="https://sisu.mec.gov.br/vagas" target="_blank" rel="noopener noreferrer">
            portal oficial do SISU/MEC
          </a>.
        </p>
        <div className={styles.contacts}>
          <a href="https://instagram.com/xandaoxtri" target="_blank" rel="noopener noreferrer">
            @xandaoxtri
          </a>
          <span className={styles.contactDivider}>•</span>
          <a href="mailto:contato@xtri.online">contato@xtri.online</a>
        </div>
        <p>© {new Date().getFullYear()} XTRI SISU — referências para acompanhamento</p>
      </footer>

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
    </main>
  );
}
