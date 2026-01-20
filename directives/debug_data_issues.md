# Debug Data Issues

## Goal
Diagnose and fix issues with missing or incorrect data in the SISU application.

## Common Issues

### 1. Wrong Course Displayed
**Symptom**: User selects one course, sees another course's data
**Cause**: ID/Code collision in API lookup
**Fix**: Ensure API uses SISU Code (not internal ID) for lookups
**Script**: Check `web/app/api/courses/[code]/route.ts`

### 2. Missing 2026 Data
**Symptom**: Chart shows only 2024/2025, sidebar shows "Aguardando"
**Cause**: `partial_scores` empty in database
**Verification**: 
```bash
python scripts/check_2026.py
```
**Fix**: Re-run sync after MEC releases daily scores

### 3. Modality Mismatch
**Symptom**: Selected modality (e.g., PCD) shows wrong cut score
**Cause**: `matchModality()` function not finding correct match
**Fix**: Update `web/utils/modality.ts` with better L-code detection

## Debug Scripts
| Script | Purpose |
|--------|---------|
| `scripts/check_2026.py` | Verify 2026 records in database |
| `scripts/audit_cotas.py` | Check modality distribution |
| `scripts/check_partial.py` | Verify partial_scores population |

## Database Queries
```python
# Check records for specific course
endpoint = f"{SUPABASE_URL}/rest/v1/cut_scores?course_id=eq.{id}&year=eq.2026"

# Count records with actual scores
endpoint = f"{SUPABASE_URL}/rest/v1/cut_scores?year=eq.2026&cut_score=not.is.null"
```

## Self-Anneal Pattern
1. Identify error
2. Create/update debug script
3. Fix root cause
4. Test fix
5. Update this directive with learnings
