# SISU 2025 Monitor

Monitoramento de notas de corte do SISU em tempo real via API do MeuSISU.

## Instalacao

```bash
# Instalar dependencias
pip install -r requirements.txt
```

## Configuracao

### 1. Cursos para monitorar

Edite `config/courses.json`:

```json
{
  "courses": [
    {
      "id": 37,
      "name": "Medicina - UnB",
      "priority": "high"
    }
  ]
}
```

Encontre IDs de cursos em: `meusisu.com/curso/{id}`

### 2. Notificacoes

Edite `config/notifications.json`:

```json
{
  "desktop": { "enabled": true },
  "sound": { "enabled": true },
  "telegram": {
    "enabled": true,
    "bot_token": "SEU_TOKEN",
    "chat_id": "SEU_CHAT_ID"
  }
}
```

### 3. Intervalo de polling

Edite `config/settings.json`:

```json
{
  "poll_interval_seconds": 300,
  "critical_hours": {
    "enabled": true,
    "start": 0,
    "end": 8,
    "poll_interval_seconds": 60
  }
}
```

## Uso

```bash
# Iniciar monitoramento
python main.py

# Testar notificacoes
python main.py --test

# Executar uma vez
python main.py --once

# Modo debug
python main.py --debug
```

## Scripts

```bash
# Testar notificacoes
python scripts/test_notifications.py

# Analisar historico
python scripts/analyze_history.py

# Decodificar arquivo
python scripts/decode_file.py data/raw/37_xxx.bin
```

## Estrutura

```
sisu2025/
├── config/           # Configuracoes
├── data/
│   ├── raw/          # Dados binarios
│   ├── processed/    # JSONs decodificados
│   ├── history/      # Historico de mudancas
│   └── exports/      # Exportacoes CSV
├── logs/             # Logs de execucao
├── scripts/          # Scripts auxiliares
├── src/
│   ├── decoder/      # Parser protobuf
│   ├── monitor/      # Logica de monitoramento
│   ├── notifications/# Canais de notificacao
│   ├── storage/      # Persistencia de dados
│   └── utils/        # Utilitarios
└── main.py           # Ponto de entrada
```

## API

Endpoint: `https://meusisu.com/api/getCourseData?courseCode={id}`

Formato: Protocol Buffers (binario)

## Timeline SISU 2025

- **Inscricoes**: 17-21 de Janeiro
- **Atualizacoes**: Diarias entre 0h-8h
- **Resultado**: 26 de Janeiro

## Notificacoes

| Canal | Descricao |
|-------|-----------|
| Desktop | Notificacao nativa (macOS/Linux) |
| Sound | Alerta sonoro |
| Webhook | Discord/Slack |
| Telegram | Bot Telegram |

## Licenca

MIT
