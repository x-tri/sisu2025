# Sync Cut Scores

## Goal
Synchronize daily cut scores from MeuSISU API to Supabase database for all SISU courses.

## When to Run
- **Quick Sync**: Every morning at 5:00 AM during SISU period (after MEC releases daily scores at midnight)
- **Full Sync**: Once before SISU starts, or after major data structure changes
- **Auto Sync**: Continuous monitoring during SISU period (optional)

## Inputs
- `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` environment variables
- Target year (default: 2026)
- MeuSISU API access (`https://meusisu.com/api`)

## Execution Scripts
| Script | Purpose |
|--------|---------|
| `execution/quick_sync.py` | Fast sync - only current year, parallel processing |
| `execution/full_data_sync.py` | Complete sync - all years, weights, students, slower |
| `execution/sync_cut_scores.py` | Detailed sync with logging and error handling |
| `execution/auto_sync.py` | Scheduled continuous sync |

## Outputs
- `cut_scores` table in Supabase updated with:
  - `course_id`, `year`, `modality_code`, `modality_name`
  - `cut_score` (nota de corte final)
  - `partial_scores` (JSON array with daily scores)
  - `applicants`, `vacancies`

## Data Flow
```
MeuSISU API (Protobuf)
    ↓
src/decoder/course.py → decode_course()
    ↓
execution/quick_sync.py
    ↓
Supabase: cut_scores table
```

## Edge Cases & Learnings
- **Empty Data**: MeuSISU may return modalities without `cut_score` or `partial_scores` at SISU start. These are placeholder records.
- **API Format**: Response is Protobuf binary, requires decoder
- **Rate Limits**: Use ThreadPoolExecutor with max 20 workers to avoid overwhelming API
- **Timing**: Run sync after 5 AM to ensure MEC has published overnight scores

## Verification
After sync, verify with:
```bash
python scripts/check_2026.py
```
Should show records with non-null `cut_score` and populated `partial_scores`.

## Troubleshooting
- If `cut_score` is null for all records: SISU hasn't released scores yet
- If decoder returns "No data": Check if API structure changed or course code is invalid
