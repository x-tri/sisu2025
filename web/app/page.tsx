export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>SISU 2025 API</h1>
      <p>API routes disponíveis:</p>

      <h2>GET /api/courses</h2>
      <p>Busca cursos por nome, universidade ou cidade</p>
      <pre style={{ background: '#f5f5f5', padding: '1rem' }}>
{`// Buscar cursos
GET /api/courses?q=medicina&limit=10

// Listar todos
GET /api/courses?limit=50&offset=0`}
      </pre>

      <h2>GET /api/courses/[code]</h2>
      <p>Dados completos de um curso pelo código SISU</p>
      <pre style={{ background: '#f5f5f5', padding: '1rem' }}>
{`GET /api/courses/37

Response:
{
  "course": { "code": 37, "name": "Geologia", ... },
  "weights": { "pesos": {...}, "minimos": {...} },
  "cut_scores": [{ "year": 2019, "modalities": [...] }]
}`}
      </pre>

      <h2>POST /api/simulate</h2>
      <p>Calcula média ponderada e compara com notas de corte</p>
      <pre style={{ background: '#f5f5f5', padding: '1rem' }}>
{`POST /api/simulate
Content-Type: application/json

{
  "course_code": 37,
  "scores": {
    "redacao": 800,
    "linguagens": 650,
    "matematica": 720,
    "humanas": 680,
    "natureza": 710
  }
}

Response:
{
  "media_ponderada": 712.31,
  "course": { "name": "Geologia", ... },
  "comparison": [
    { "modality": "AMPLA", "cut_score": 702.63, "difference": 9.68, "status": "above" }
  ],
  "meets_minimums": true
}`}
      </pre>
    </main>
  )
}
