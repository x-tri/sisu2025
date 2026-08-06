# 🎯 XTRI SISU 2026

![XTRI SISU](web/public/xtri-logo.png)

**Monitoramento do SISU 2026 em Tempo Real** - Compare suas notas e descubra suas chances de aprovação.

🌐 **Acesse**: [https://xtrisisu.com](https://xtrisisu.com)

---

## ✨ Features

- 📊 **8.500+ cursos** de todo o Brasil
- 🏛️ **120+ universidades** federais e estaduais
- 📈 **Cortes diários** atualizados em tempo real
- 🧮 **Cálculo de média ponderada** por curso
- 👥 **Lista de aprovados** de anos anteriores
- 📱 **Interface responsiva** e moderna

## 🚀 Quick Start

### Frontend (Next.js)

```bash
cd web
npm install
npm run dev
```

Acesse: http://localhost:3000

### Scripts de Sincronização (Python)

```bash
# Instalar dependências
pip install requests

# Sincronizar todos os dados
python scripts/full_data_sync.py
```

## 🔧 Configuração

### Variáveis de Ambiente

Crie `web/.env.local`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

### Deploy no Coolify

1. Conecte o repositório ao aplicativo `sisu-frontend` no Coolify
2. Configure a branch `main` e o diretório-base `/web`
3. Adicione as variáveis de ambiente
4. Publique em `xtrisisu.com`

## 📁 Estrutura

```
sisu2025/
├── web/                    # Frontend Next.js
│   ├── app/               # App Router
│   │   ├── api/           # API Routes
│   │   └── page.tsx       # Página principal
│   ├── components/        # Componentes React
│   ├── lib/               # Supabase client
│   └── public/            # Assets
├── scripts/               # Scripts Python
│   └── full_data_sync.py  # Sincronização completa
└── src/                   # Decoder Protobuf
    └── decoder/           # Parser da API MeuSISU
```

## 🗃️ Banco de Dados (Supabase)

| Tabela | Descrição |
|--------|-----------|
| `courses` | 8.500+ cursos com localização |
| `course_weights` | Pesos por área de conhecimento |
| `cut_scores` | Notas de corte + parciais |
| `approved_students` | Lista de aprovados |

## 📡 API Endpoints

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/filters?type=states` | Lista de estados |
| `GET /api/filters?type=cities&state=XX` | Cidades do estado |
| `GET /api/courses/[code]` | Dados completos do curso |
| `POST /api/simulate` | Cálculo de média ponderada |

## 🛠️ Tecnologias

- **Frontend**: Next.js 14, React 18, TypeScript
- **Backend**: Supabase (PostgreSQL)
- **Deploy**: Coolify em VPS Hostinger
- **Estilo**: CSS Modules

## 📅 Timeline SISU 2026

- **Inscrições**: Janeiro 2026
- **Atualizações**: Diárias entre 0h-8h
- **Resultado**: Final de Janeiro

## 📜 Licença

MIT © [XTRI](https://xtri.online)

---

Desenvolvido com ❤️ por **XTRI**
