# 🕷️ Plano: Coleta das parciais do SISU em tempo real (MeuSISU)

> Rascunho de planejamento — não implementar antes da abertura do SISU 2027.
> Criado em 19/11/2026 após a sessão de redesign/SEO. Mantido local, não publicado.

## 🎯 Objetivo

Quando o SISU 2027 abrir as inscrições, coletar as **notas de corte parciais**
divulgadas em tempo real pelo meusisu.com e atualizar o banco de **30 em 30
minutos**, tornando o site dinâmico durante o período de inscrições.

## ✅ O que JÁ existe no repo (não reescrever)

| Peça | Onde | Estado |
|---|---|---|
| Recon do MeuSISU (endpoints, cookies, headers) | `crawler_meusisu.py` | pronto |
| Documento de espera da API + como testar | `WAITING_MODE.md`, `check_api_status.sh` | pronto |
| Decodificador protobuf dos cursos/alunos | `src/decoder/course.py` (`decode_course`, `decode_students`) | pronto |
| Sync completo (auditoria + preenchimento) | `execution/sync_cut_scores.py` | pronto |
| Sync diário inteligente (só o que falta) | `.gemini/skills/sisu-cut-score-sync/scripts/smart_daily_sync.py` | pronto |
| Monitores noturnos/manual | `execution/night_watch.py`, `monitor_scores.py`, `auto_sync.py`, `quick_sync.py` | pronto |
| Upsert idempotente no Supabase | índice único `(course_id, year, modality_code)` + `Prefer: resolution=merge-duplicates` | pronto |
| Frontend já trata "parcial" | `lib/course-reference.ts` (`referenceType: 'final' | 'historical' | 'partial'`, `partialScores`) | pronto |

**Endpoints conhecidos do MeuSISU:** `https://meusisu.com/api` e
`https://d3hf41n0t98fq2.cloudfront.net/api/courseData?courseCode=N`
(mais `getAllCourses`, `getStates`, `getCoursesByState` como fallback).
`TARGET_YEAR`/`API_YEARS` nos scripts já parametrizam o ano — **nunca
remapear anos entre edições** (houve incidente com 2025→2026, ver comentário
em `smart_daily_sync.py`).

## 🏗️ O que falta construir (quando o SISU abrir)

1. **Scheduler de 30 min**
   - Opção A (preferível): Scheduled Task no Coolify rodando
     `execution/quick_sync.py` (ou novo `partial_sync.py`) a cada 30 min,
     apenas enquanto a janela de inscrições estiver ativa.
   - Opção B: cron no VPS. Evitar: rodar do laptop.
   - O script precisa ser *idempotente e incremental*: só cursos com
     `captured_at` mais antigo que X, priorizando os 101 de Medicina e os
     mais visitados.

2. **Tabela/coluna de parciais com carimbo**
   - `cut_scores` já tem `captured_at`; garantir que a parcial do dia grave
     edição corrente + `referenceType='partial'` sem sobrescrever as finais
     históricas (o upsert merge já protege via chave única).

3. **Camada de API/frontend**
   - Hoje `lib/supabase.ts` cacheia catálogo por 5 min (`ttl-cache`); criar
     TTL menor (60–120s) só para a rota de parciais durante a janela.
   - Home/plano já renderizam `partialScores` — validar ordenação
     "parcial mais recente primeiro".
   - Badge no front "atualizado há X min" para transmitir o frescor (prova social).

4. **Respeito ao MeuSISU**
   - Rate limit: com ~9.400 ofertas, 30 min de janela ⇒ batch de ~300/min
     com backoff;threads moderadas (o sync atual usa ThreadPoolExecutor —
     limitar workers durante o período).
   - Headers de navegador + cookies já replicados pelo crawler existente.
   - Se a API recusar (403/429), backoff exponencial e não insistir.

5. **Observabilidade**
   - Log simples de cada ciclo (ofertas atualizadas, falhas) num arquivo ou
     tabela; alerta se um ciclo pular (ex.: Healthcheck/noite).

## 📋 Pré-requisitos de credenciais (já resolvidos)

- `SUPABASE_SERVICE_KEY`: usar a secret key nova `xtrisisu_backend`
  (via env no Coolify; nunca hard-code — histórico já sanitizado).
- Rodar os syncs **do backend/VPS**, não da máquina local.

## ⏱️ Gatilho para começar

- Edital SISU 2027 publicado ⇒ testar `check_api_status.sh` diariamente.
- Primeiras parciais aparecendo no meusisu.com ⇒ ligar o scheduler e o TTL
  curto no front; desligar ao final da janela (as finais substituem as
  parciais naturalmente via `referenceType`).
