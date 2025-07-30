# UniSuchtprävention

[![wakatime](https://wakatime.com/badge/github/malarisch/UniSuchtpraevention.svg)](https://wakatime.com/badge/github/malarisch/UniSuchtpraevention) [![Docker Image CI](https://github.com/malarisch/UniSuchtpraevention/actions/workflows/docker-image.yml/badge.svg)](https://github.com/malarisch/UniSuchtpraevention/actions/workflows/docker-image.yml)

Dieses Projekt analysiert Songtexte und speichert die Ergebnisse in einer Datenbank.
Ursprünglich in JavaScript gestartet, läuft der Code inzwischen vollständig unter TypeScript.
Für eine einheitliche Entwicklungs- und Produktionsumgebung kommt Docker zum Einsatz.
Die Anwendung nutzt Postgres, Redis und verschiedene Monitoring‑Tools.
Weitere Details zur manuellen Bewertung finden sich im [Rating Handbuch](Rating_handbuch.md).

## Voraussetzungen

- Node.js (>=20) und npm
- Docker & Docker Compose (für die komplette Service‑Umgebung)

## Projekt aufsetzen

1. Repository klonen und Abhängigkeiten installieren:

   ```bash
   git clone <repo-url>
   cd UniSuchtpraevention
   npm install
   ```

2. `.env` Datei anlegen. Eine Beispielkonfiguration findet sich weiter unten.

3. Die benötigten Services (Redis, Postgres, InfluxDB usw.) per Docker Compose starten:

   ```bash
   docker compose -f docker-compose.services.yml up -d
   ```

4. Anwendung im Entwicklungsmodus starten:

   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```

   Alternativ kann das Projekt lokal ohne Docker ausgeführt werden:

   ```bash
   npm run build
   npm start
   ```

5. Der Admin‑Bereich ist anschließend unter `http://localhost:8080` erreichbar.

### Worker starten

Für die Verarbeitung der Queues kann zusätzlich der Worker gestartet werden:

```bash
npm run worker
```

### CLI nutzen

Die Projekt‑CLI befindet sich im Repository‑Root (`cli.ts`) und wird über `tsx`
ausgeführt. Sie bietet unter anderem Funktionen zum Taggen und Exportieren von
Daten.

```bash
npm run cli -- --help
```

## Tests ausführen

```bash
npm test
```

## Beispiel `.env`

```ini
# Server
PORT=8080
LOGGER_APP_NAME=webserver
LOG_LEVEL=info

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# PostgreSQL
PG_HOST=localhost
PG_USER=postgres
PG_PASSWORD=postgres
PG_DB=suchtpraevention

# Monitoring
LOKI_URL=http://localhost:3100
LOKI_HEADERS=Authorization=Basic xyz
INFLUXDB_HOST=http://localhost:8181
INFLUXDB_DATABASE=sucht
INFLUXDB_TOKEN=my-token

# API Schlüssel
GENIUS_CLIENT_ACCESS_TOKEN=your-genius-token
OPENAI_KEY=your-openai-key
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret

# Ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3:latest
```

## Daten

Die verwendeten Song-Datensätze können aus urheberrechtlichen Gründen leider nicht veröffentlicht werden.

## Lizenz

Veröffentlicht unter der ISC‑Lizenz.
