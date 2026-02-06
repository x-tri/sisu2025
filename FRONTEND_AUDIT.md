# 🔍 AUDITORIA FRONTEND - XTRI SISU 2026

> Análise completa realizada em 06/02/2026

---

## 📊 RESUMO EXECUTIVO

| Categoria | Status | Prioridade |
|-----------|--------|------------|
| Performance | 🟡 Médio | Alta |
| Código/Types | 🟡 Médio | Média |
| UX/UI | 🟢 Bom | Média |
| Acessibilidade | 🔴 Crítico | Alta |
| SEO | 🟡 Médio | Baixa |
| Segurança | 🟢 Bom | Média |

---

## 🔴 PROBLEMAS CRÍTICOS

### 1. **Múltiplos Requests em Cascata (Performance)**
**Local:** `page.tsx`, `SearchFilters.tsx`

**Problema:** Cada filtro dispara um useEffect separado, causando waterfall de requests:
```typescript
// Problema: 4 useEffects = 4 requisições em cascata
useEffect(() => { fetch('/api/filters?type=states') }, [])
useEffect(() => { fetch(`/api/filters?type=cities&state=${state}`) }, [state])
useEffect(() => { fetch(`/api/filters?type=universities...`) }, [city])
useEffect(() => { fetch(`/api/filters?type=courses...`) }, [institution])
```

**Impacto:** 
- Lenta navegação entre filtros
- UX ruim em conexões lentas
- Cumulative Layout Shift (CLS)

**Solução:**
```typescript
// Usar React Query (TanStack Query) com caching e prefetch
const { data: states } = useQuery(['states'], fetchStates)
const { data: cities } = useQuery(['cities', state], fetchCities, { enabled: !!state })
```

---

### 2. **Uso de `any` em TypeScript**
**Local:** Múltiplos arquivos

**Problemas encontrados:**
```typescript
weights: any[]
cut_scores: any[]
weights?: any
partial_scores?: any[]
```

**Impacto:**
- Perda de type safety
- Bugs difíceis de detectar
- DX ruim (autocomplete não funciona)

**Solução:** Definir interfaces completas:
```typescript
interface CourseWeights {
  peso_red: number
  peso_ling: number
  peso_mat: number
  peso_ch: number
  peso_cn: number
  min_red?: number
  min_ling?: number
  min_mat?: number
  min_ch?: number
  min_cn?: number
}

interface CutScore {
  year: number
  modality_code: number
  modality_name: string
  cut_score: number
  applicants: number
  vacancies: number
  partial_scores: Array<{day: string; score: number}>
}
```

---

### 3. **Falta de Tratamento de Erros**
**Local:** Todos os fetchs

**Problema:**
```typescript
fetch('/api/filters?type=states')
  .then(res => res.json())
  .then(data => { ... })
  .catch(console.error)  // ❌ Apenas log, sem UX
```

**Impacto:**
- Usuário não sabe quando algo deu errado
- Loading infinito em falhas

**Solução:**
```typescript
const [error, setError] = useState<string | null>(null)
const [isLoading, setIsLoading] = useState(false)

const fetchStates = async () => {
  setIsLoading(true)
  setError(null)
  try {
    const res = await fetch('/api/filters?type=states')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    setStates(data)
  } catch (err) {
    setError('Falha ao carregar estados. Tente novamente.')
    console.error(err)
  } finally {
    setIsLoading(false)
  }
}

// No JSX:
{error && <div className="error-banner">{error}</div>}
```

---

### 4. **Acessibilidade (A11y) - Labels e ARIA**
**Local:** `SearchFilters.tsx`, `page.tsx`

**Problemas:**
- Selects sem `<label>` ou `aria-label`
- Botões sem texto descritivo
- Sem skip navigation
- Contraste de cores não verificado

**Solução:**
```typescript
// Antes:
<select value={filters.state} onChange={...}>

// Depois:
<label htmlFor="state-select">Estado</label>
<select 
  id="state-select"
  value={filters.state} 
  onChange={...}
  aria-label="Selecione o estado"
  aria-busy={loading.cities}
>
```

---

## 🟡 MELHORIAS IMPORTANTES

### 5. **Estado Global vs Local**
**Problema:** Estados de filtros duplicados entre `page.tsx` e `SearchFilters.tsx`

**Solução:** Consolidar em um contexto ou usar URL state:
```typescript
// Usar URL como source of truth
const searchParams = useSearchParams()
const router = useRouter()

const state = searchParams.get('state')
const city = searchParams.get('city')

// Atualizar URL ao invés de estado local
const setState = (newState: string) => {
  const params = new URLSearchParams(searchParams)
  params.set('state', newState)
  router.push(`?${params.toString()}`)
}
```

**Benefícios:**
- Shareable URLs
- Back/forward button funciona
- Persistência natural

---

### 6. **Memoização de Cálculos**
**Local:** `ScoreContext.tsx`

**Problema:** `calculateAverage` recalcula a cada render

**Solução:**
```typescript
const calculateAverage = useMemo(() => {
  return (weights: Weights) => {
    // cálculo aqui
  }
}, [scores])  // Só recalcula quando scores mudam
```

---

### 7. **LocalStorage sem Try/Catch**
**Local:** `ScoreContext.tsx`

**Problema:**
```typescript
const saved = localStorage.getItem('sisu_scores')
localStorage.setItem('sisu_scores', JSON.stringify(newScores))
```

**Pode falhar se:**
- LocalStorage estiver desabilitado
- Quota excedida
- Modo privado no Safari

**Solução:**
```typescript
const safeLocalStorage = {
  get: (key: string) => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch {
      return null
    }
  },
  set: (key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
      console.warn('localStorage não disponível:', e)
    }
  }
}
```

---

### 8. **CSS Modules vs Tailwind**
**Problema:** Mistura de CSS Modules e possivelmente classes globais

**Recomendação:** Padronizar com Tailwind CSS:
- Menos código
- Melhor manutenibilidade
- Tree-shaking automático
- Responsividade facilitada

**Exemplo:**
```typescript
// Antes (CSS Modules):
<div className={styles.container}>

// Depois (Tailwind):
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
```

---

## 🟢 BOAS PRÁTICAS JÁ IMPLEMENTADAS

✅ **Context API** para estado global  
✅ **Next.js 14** com App Router  
✅ **TypeScript** (apesar dos `any`)  
✅ **CSS Variables** para theming  
✅ **Componentização** adequada  
✅ **Server Components** onde apropriado  

---

## 🚀 RECOMENDAÇÕES DE ARQUITETURA

### Sugestão: Adotar TanStack Query (React Query)

**Benefícios:**
- Caching automático
- Refetching em background
- Estado de loading/error padronizado
- Deduping de requests
- Optimistic updates

**Implementação:**
```typescript
// hooks/useCourses.ts
import { useQuery } from '@tanstack/react-query'

export const useStates = () => {
  return useQuery({
    queryKey: ['states'],
    queryFn: async () => {
      const res = await fetch('/api/filters?type=states')
      if (!res.ok) throw new Error('Failed to fetch states')
      return res.json()
    },
    staleTime: 1000 * 60 * 60, // 1 hora
  })
}

export const useCities = (state: string) => {
  return useQuery({
    queryKey: ['cities', state],
    queryFn: async () => {
      const res = await fetch(`/api/filters?type=cities&state=${state}`)
      if (!res.ok) throw new Error('Failed to fetch cities')
      return res.json()
    },
    enabled: !!state, // Só executa se state existir
    staleTime: 1000 * 60 * 30, // 30 minutos
  })
}
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Prioridade 1 (Crítico)
- [ ] Adicionar tratamento de erros em todos os fetchs
- [ ] Implementar loading states
- [ ] Adicionar labels e ARIA em formulários
- [ ] Remover todos os `any` do TypeScript

### Prioridade 2 (Alto)
- [ ] Implementar TanStack Query
- [ ] Otimizar requests em cascata
- [ ] Adicionar Error Boundaries
- [ ] Implementar retry automático

### Prioridade 3 (Médio)
- [ ] Migrar para Tailwind CSS
- [ ] Adicionar testes unitários
- [ ] Implementar PWA (Service Worker)
- [ ] Adicionar analytics

### Prioridade 4 (Baixo)
- [ ] Implementar i18n (internacionalização)
- [ ] Adicionar temas (dark mode)
- [ ] Otimizar imagens (Next/Image)
- [ ] Implementar virtualização de listas

---

## 🎯 MÉTRICAS DE PERFORMANCE ATUAIS

**Estimativas baseadas em análise de código:**

| Métrica | Estimativa | Ideal |
|---------|------------|-------|
| First Contentful Paint | ~1.5s | <1s |
| Time to Interactive | ~3s | <2s |
| Cumulative Layout Shift | ~0.15 | <0.1 |
| Total Blocking Time | ~200ms | <100ms |

**Principais gargalos:**
1. Requests em cascata nos filtros
2. Falta de caching
3. Re-renders desnecessários

---

## 📝 PRÓXIMOS PASSOS

1. **Curto prazo (1 semana):**
   - Implementar tratamento de erros
   - Adicionar loading states
   - Remover `any` do TypeScript

2. **Médio prazo (1 mês):**
   - Migrar para TanStack Query
   - Implementar testes
   - Otimizar performance

3. **Longo prazo (3 meses):**
   - Redesign com Tailwind
   - PWA
   - Testes E2E

---

## 💬 NOTAS FINAIS

O código está bem estruturado e segue boas práticas gerais. Os principais problemas são:
1. Gestão de estado async (loading/error)
2. Performance de requests
3. TypeScript strict mode

Com as correções sugeridas, o projeto pode atingir **90+ no Lighthouse** e proporcionar uma experiência muito superior aos usuários.

---

**Analisado por:** Kimi Code Assistant  
**Data:** 06/02/2026  
**Versão:** 1.0
