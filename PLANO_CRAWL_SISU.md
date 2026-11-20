# 🕷️ Plano: Coleta das parciais do SISU em tempo real (MeuSISU)

> Rascunho de planejamento — não implementar antes da abertura do SISU 2027.
> Criado em 19/11/2026 após a sessão de redesign/SEO; atualizado em 20/11/2026.
>
> ⛔ **Decisão de 20/11/2026: o pipeline de atualização atual está DESATIVADO.**
> Não rodar, não agendar e não modificar os scripts existentes (nem
> manualmente). A nova coleta do SISU 2027 será um **pipeline novo, separado**.

## 🎯 Objetivo

Quando o SISU 2027 abrir as inscrições, coletar as **notas de corte parciais**
divulgadas em tempo real pelo meusisu.com e atualizar o banco de **30 em 30
minutos**, tornando o site dinâmico durante o período de inscrições.

## 🚫 Pipeline atual: DESATIVADO — usar só como referência

Os scripts Python existentes (`crawler_meusisu.py`, `execution/*.py`,
`.gemini/skills/sisu-cut-score-sync/*`, `launch_monitor.sh` etc.) **não serão
executados nem reaproveitados**. Não deletar: eles documentam endpoints,
formato protobuf e headers do MeuSISU, e o código novo pode **consultá-los
como referência (leitura, sem execução)**.

| Peça | Onde | Papel agora |
|---|---|---|
| Recon do MeuSISU (endpoints, cookies, headers) | `crawler_meusisu.py` | 📖 referência |
| Documento de espera da API + como testar | `WAITING_MODE.md`, `check_api_status.sh` | 📖 referência (o teste manual continua válido) |
| Decodificador protobuf dos cursos/alunos | `src/decoder/course.py` (`decode_course`, `decode_students`) | 📖 referência do formato |
| Syncs completos/incrementais/monitores | `execution/*.py`, `.gemini/skills/...` | ⛔ desativados — não rodar |
| Upsert idempotente no Supabase | índice único `(course_id, year, modality_code)` + `Prefer: resolution=merge-duplicates` | ✅ esquema do banco continua válido |
| Frontend já trata "parcial" | `web/lib/course-reference.ts` (`referenceType: 'final' | 'historical' | 'partial'`, `partialScores`) | ✅ continua válido |

**Endpoints conhecidos do MeuSISU:** `https://meusisu.com/api` e
`https://d3hf41n0t98fq2.cloudfront.net/api/courseData?courseCode=N`
(mais `getAllCourses`, `getStates`, `getCoursesByState` como fallback).
No pipeline novo, o ano/alvo deve ser **configuração explícita por edição** —
**nunca remapear anos entre edições** (houve incidente com 2025→2026 no
pipeline antigo, ver comentário em `smart_daily_sync.py`).

## 🏛️ Fontes oficiais verificadas (pesquisa de 19/11/2026)

Pergunta: "existe API oficial (MEC/INEP) com parciais em tempo real?"
**Resposta curta: não.** Detalhe do que existe:

| Fonte | O que oferece | Tempo real? | API? |
|---|---|---|---|
| `dadosabertos.mec.gov.br/sisu` | ZIPs estáticos por edição ("base_tratada_CR_YYYY_N.zip", CSV tratado) — Chamada Regular + Lista de Espera, apenas **finais** | ❌ | ❌ (CKAN sem API ativa; download manual) |
| `sisu.mec.gov.br` / `acessounico.mec.gov.br` | Classificação parcial com nota de corte, calculada **1×/dia** a partir do 2º dia de inscrições | ⚠️ diário, não 30 min | ❌ — exibida **só na página do candidato logado** (gov.br), apenas nas opções dele |
| `acessounico.mec.gov.br/busca` | "Busca Avançada" — é um **embed de Power BI** com edições passadas | ❌ | ❌ (não é API) |
| INEP | Nada de SISU — só microdados do ENEM (OData) | ❌ | ✅ mas irrelevante para corte |

**Implicações práticas:**
1. **Parciais de todos os cursos em tempo real só existem no MeuSISU** (ou
   similares) — mantê-lo como fonte primária da janela, como planejado.
2. **Usar o ZIP oficial** `dadosabertos.mec.gov.br` para **validar e
   backfill das notas finais** após cada edição: é a fonte primária do MEC,
   reforça o selo "Fonte oficial" do site e serve de fallback se o MeuSISU
   bloquear. Os relatórios no portal cobrem até 2023 (as edições 2024+ do
   nosso banco vieram do MeuSISU; conferir se o MEC publica os ZIPs mais
   novos em outra seção).
3. Não vale a pena tentar escanear a página do candidato oficial (exigiria
   login gov.br e devolve só as opções daquela conta).


## 🏗️ O que falta construir (quando o SISU abrir) — pipeline novo do zero

1. **Coletor novo + scheduler de 30 min**
   - Escrever um coletor dedicado (ex.: `collector/partial_sync.py`, novo
     pacote separado) — **sem depender de `execution/*.py`**.
   - Agendamento: Scheduled Task no Coolify (preferível) ou cron no VPS,
     a cada 30 min, apenas durante a janela de inscrições. Evitar: rodar
     do laptop.
   - Precisa ser *idempotente e incremental*: só cursos com `captured_at`
     mais antigo que X, priorizando os 101 de Medicina e os mais
     visitados; grava parciais com carimbo sem sobrescrever as finais
     históricas (chave única `(course_id, year, modality_code)` protege).

2. **Camada de API/frontend**
   - Hoje `lib/supabase.ts` cacheia catálogo por 5 min (`ttl-cache`); criar
     TTL menor (60–120s) só para a rota de parciais durante a janela.
   - Home/plano já renderizam `partialScores` — validar ordenação
     "parcial mais recente primeiro".
   - Badge no front "atualizado há X min" para transmitir o frescor (prova social).

3. **Respeito ao MeuSISU**
   - Rate limit: com ~9.400 ofertas, 30 min de janela ⇒ batch de ~300/min
     com backoff exponencial em 403/429; threads moderadas.
   - Headers de navegador + cookies conforme documentado no recon antigo
     (`crawler_meusisu.py`, como referência).
   - Se a API recusar, backoff exponencial e não insistir.

4. **Observabilidade**
   - Log simples de cada ciclo (ofertas atualizadas, falhas) num arquivo ou
     tabela; alerta se um ciclo pular (ex.: Healthcheck/noite).

## 📋 Pré-requisitos de credenciais (já resolvidos)

- `SUPABASE_SERVICE_KEY`: usar a secret key nova `xtrisisu_backend`
  (via env no Coolify; nunca hard-code — histórico já sanitizado).
- Rodar o coletor novo **do backend/VPS**, não da máquina local.

## ⏱️ Gatilho para começar

- Edital SISU 2027 publicado ⇒ verificar diariamente se a API do MeuSISU
  liberou (procedimento manual documentado em `WAITING_MODE.md`; ou um
  teste equivalente escrito no pipeline novo).
- Primeiras parciais aparecendo no meusisu.com ⇒ ligar o scheduler e o TTL
  curto no front; desligar ao final da janela (as finais substituem as
  parciais naturalmente via `referenceType`).
