# MeuSISU API Structure

## Endpoint
```
GET https://meusisu.com/api/getCourseData?courseCode={code}
```

## Response Format
Binary Protobuf (not JSON). Requires decoder.

## Decoder Location
```
src/decoder/course.py
```

## Decoded Structure

```python
Course:
  state: str
  city: str
  university: str
  campus: str
  course_name: str
  degree: str
  schedule: str
  years: list[YearData]

YearData:
  year: int (e.g., 2026)
  modalities: list[Modality]
  weights: dict[str, float]
  minimums: dict[str, float]

Modality:
  name: str (e.g., "Ampla concorrência")
  code: int (e.g., 41)
  cut_score: float | None (e.g., 750.23)
  applicants: int | None
  vacancies: int | None
  partial_scores: list[dict] (e.g., [{"day": "1", "score": 745.0}])
```

## Key Fields for Frontend

| Field | Frontend Use |
|-------|--------------|
| `cut_score` | Final cut score badge, approval calculation |
| `partial_scores` | Daily cuts sidebar, evolution chart green line |
| `applicants` | Competition ratio display |
| `vacancies` | Available seats display |

## Common Issues

- **Empty partial_scores**: SISU hasn't released daily scores yet
- **null cut_score**: Scores not calculated yet
- **Decode error**: API format changed or invalid course code
