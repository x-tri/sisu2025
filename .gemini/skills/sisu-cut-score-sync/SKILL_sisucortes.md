---
name: sisu-cut-score-sync
description: Synchronize SISU cut scores from MeuSISU API to Supabase database. Use when the user wants to mine/sync/fetch cut scores for SISU 2026, update daily cut scores, or populate the frontend with real-time SISU data. Triggers on requests like "sync cut scores", "mine SISU data", "update 2026 scores", "fetch notas de corte", or "run sync".
---

# SISU Cut Score Sync

Synchronized mining of cut scores from MeuSISU API to Supabase for display on xtrisisu.app.

## Quick Start

Run the sync script:
```bash
python .gemini/skills/sisu-cut-score-sync/scripts/sync_cut_scores.py
```

## When to Run

| Scenario | Timing |
|----------|--------|
| **Daily Sync** | 5:00 AM (after MEC releases overnight scores) |
| **During SISU** | Every 4-6 hours for updates |
| **After Cleanup** | When 2026 data was deleted and needs refresh |

## Data Flow

```
MeuSISU API (Protobuf) → Decoder → Supabase → Frontend
```

1. Fetch from `https://meusisu.com/api/getCourseData?courseCode={code}`
2. Decode Protobuf response with `src/decoder/course.py`
3. Extract `cut_score` and `partial_scores` for year 2026
4. Upsert to `cut_scores` table in Supabase

## Output Validation

The script validates that data is REAL (not empty placeholders):
- ✅ `cut_score` is not null
- ✅ `partial_scores` array has entries

If validation fails, it means SISU hasn't released scores yet.

## Frontend Mapping

| Database Field | Frontend Component |
|----------------|-------------------|
| `cut_score` | Year badge, approval status |
| `partial_scores` | "Cortes Diários 2026" sidebar card |
| `partial_scores` | Green line on "Evolução das Notas" chart |

## Troubleshooting

**Problem**: Script inserts records but frontend shows "Aguardando"
**Cause**: `partial_scores` is empty
**Solution**: Wait for MEC to release daily scores, then re-run sync

**Problem**: Wrong modality displayed
**Cause**: Modality matching issue
**Solution**: Check `web/utils/modality.ts` for L-code detection

## Scripts

- `scripts/sync_cut_scores.py` - Main sync (upserts full data)
- `scripts/smart_daily_sync.py` - Optimized daily update (skips up-to-date courses)
- `scripts/verify_data.py` - Check data quality in Supabase

## References

- `references/api_structure.md` - MeuSISU API and Protobuf structure
- `references/database_schema.md` - Supabase table schemas
