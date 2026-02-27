# Gepanschte Lines statt Punchlines?!

[![wakatime](https://wakatime.com/badge/github/malarisch/UniSuchtpraevention.svg)](https://wakatime.com/badge/github/malarisch/UniSuchtpraevention) [![Docker Image CI](https://github.com/malarisch/UniSuchtpraevention/actions/workflows/docker-image.yml/badge.svg)](https://github.com/malarisch/UniSuchtpraevention/actions/workflows/docker-image.yml)

Dieses Projekt analysiert Songtexte auf Substanzerwähnungen und speichert die Ergebnisse in einer Datenbank.
Der Code läuft vollständig unter TypeScript. Für eine einheitliche Entwicklungs- und Produktionsumgebung kommt Docker zum Einsatz.
Die Anwendung nutzt Postgres, Redis und verschiedene Monitoring‑Tools (InfluxDB, Loki, Prometheus, Grafana).

Weitere Details zur manuellen Bewertung finden sich im [Rating Handbuch](Rating_handbuch.md).

---

## Voraussetzungen

### Software

| Anforderung | Mindestversion | Hinweis |
|-------------|---------------|---------|
| **Node.js** | 20 | inkl. npm |
| **Docker** | 24 | inkl. Docker Compose v2 (`docker compose`) |
| **Ollama** | aktuell | Lokale LLM-Inferenz, siehe unten |

### Systemressourcen

Das Modell `gpt-oss-20b` hat 20 Milliarden Parameter und stellt entsprechende Anforderungen:

| Ressource | Empfohlen | Minimum |
|-----------|-----------|---------|
| **RAM** | 32 GB | 16 GB (CPU-only, langsam) |
| **VRAM (GPU)** | 24 GB | 16 GB (quantisiert) |
| **Disk** | 50 GB frei | 20 GB frei (Modell ~15 GB + Services) |
| **CPU** | 8 Kerne | 4 Kerne |

> Ohne dedizierte GPU läuft die Inferenz auf der CPU und ist deutlich langsamer. Daher wird ein Rechner mit starker GPU oder ein moderner Mac mit M-Chip und genügend RAM empfohlen.

### API-Zugangsdaten

Folgende externe Dienste werden benötigt:

| Dienst | Pflicht | Verwendung |
|--------|---------|-----------|
| **Spotify** (Client ID + Secret) | Ja | Künstler- und Song-Suche, Top-Track-Abruf |
| **Genius** (Client Access Token) | Ja | Lyrics-Abruf |
| **OpenAI** (API Key) | Nein | Alternative zu Ollama für KI-Analyse |

---

## Ollama einrichten

Ollama muss **vor dem Start der Anwendung** installiert und das Modell heruntergeladen sein.

### 1. Ollama installieren

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows: Installer unter https://ollama.com/download
```

### 2. Modell herunterladen

```bash
ollama pull gpt-oss-20b
```

> Der Download ist ca. 15 GB groß. Anschließend ist das Modell lokal verfügbar.

### 3. Ollama-Dienst starten

```bash
ollama serve
```

Ollama läuft dann auf `http://localhost:11434` (Standardwert in der `.env`).

> Auf macOS startet Ollama nach der Installation automatisch als Systemdienst. Ein manueller `ollama serve` ist dann nicht nötig.

---

## Lokale Instanz aufsetzen

### 1. Repository klonen und Abhängigkeiten installieren

```bash
git clone <repo-url>
cd UniSuchtpraevention
npm install --include-dev
```

### 2. `.env` Datei anlegen

Eine vollständige Beispielkonfiguration findet sich am Ende dieser Datei. Mindestens folgende Variablen müssen gesetzt sein:

```ini
PG_USER=postgres
PG_PASSWORD=postgres
PG_DB=suchtpraevention
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Docker-Netzwerk anlegen

Alle Compose-Dateien verwenden das externe Netzwerk `meteringBridge`. Es muss **einmalig** angelegt werden:

```bash
docker network create meteringBridge
```

### 4. Services starten

Redis, Postgres, InfluxDB, Loki, Prometheus und Grafana werden über eine eigene Compose-Datei gestartet:

```bash
docker compose -f docker-compose.services.yml up -d
```

| Service    | Standard-Port |
|------------|--------------|
| PostgreSQL  | 5432         |
| Redis       | 6379         |
| InfluxDB    | 8181         |
| Loki        | 3100         |
| Prometheus  | 9090         |
| Grafana     | 3000         |

### 5a. Entwicklungsmodus (mit Hot-Reload)

Startet Webserver und Worker via `tsx` mit aktiviertem Debugger:

```bash
docker compose -f docker-compose.dev.yml up --build
```

- Web-Interface: `http://localhost:8081`
- Debugger (App): Port `9229`

### 5b. Produktionsmodus

Startet die kompilierten Artefakte aus `dist/`:

```bash
npm run build
docker compose -f docker-compose.dist.yml up --build
```

- Web-Interface: `http://localhost:8080`

### 5c. Komplett ohne Docker (nur App)

```bash
npm run build
npm start          # Webserver
npm run worker     # Worker (separates Terminal)
```

### 6. Tests ausführen

```bash
npm test
```

---

## Web-Interface

Nach dem Start der Anwendung ist das Admin-Dashboard unter folgender Adresse erreichbar:

- **Entwicklungsmodus:** `http://localhost:8081/admin`
- **Produktionsmodus:** `http://localhost:8080/admin`

Das Interface basiert auf [AdminJS](https://adminjs.co/) und bietet keine separate Authentifizierung – es sollte daher nicht öffentlich exponiert werden.

---

### Datenbankressourcen (CRUD)

In der linken Seitenleiste sind alle Datenbanktabellen aufgelistet. Für jede Ressource stehen die Standard-CRUD-Operationen zur Verfügung (Auflisten, Anlegen, Bearbeiten, Löschen):

| Ressource | Beschreibung |
|-----------|-------------|
| **Artist** | Künstler mit Spotify- und Genius-Metadaten sowie OHS-Wert |
| **Album** | Alben der Künstler |
| **Song** | Songs mit Lyrics, Releasedate, Substanzmarkierungen und OHS |
| **SubstanceRating** | KI-generierte Bewertungen je Song und Substanzkategorie |
| **Substance** | Einzelsubstanzen mit Suchbegriffen |
| **SubstanceCategory** | Oberkategorien der Substanzen |

In der Song-Listenansicht gibt es zwei zusätzliche Anzeigespalten:
- **hasLyrics** – zeigt an, ob Lyrics für den Song vorhanden sind
- **hasAnalysis** – zeigt an, ob bereits eine KI-Analyse vorliegt

---

### Aktionen auf Songs

In der Detailansicht eines Songs stehen zwei individuelle Aktionen zur Verfügung:

#### `fetchLyrics` – Lyrics abrufen

Ruft die Lyrics direkt von der Genius-URL des Songs ab und speichert sie in der Datenbank. Voraussetzung: Das Feld `geniusURL` muss gesetzt sein.

#### `aiAnalysis` – KI-Analyse starten

Analysiert die vorhandenen Lyrics mit dem konfigurierten Sprachmodell (Derzeit nur OpenAI API) und legt `SubstanceRating`-Einträge für alle erkannten Substanzkategorien an.

---

### GeniusTool – Songs suchen und importieren

**Pfad:** `http://localhost:{PORT}/admin/pages/GeniusTool`

Eine eigene Seite zum komfortablen Hinzufügen von Songs über die Genius-API:

1. **Suche:** Suchbegriff eingeben → Trefferliste mit Titel, Interpret, Lyrics-Status und Veröffentlichungsdatum
2. **Song anlegen:** „Add" klickt Song und Künstler in die Datenbank (falls noch nicht vorhanden)
3. **Verarbeitungskette starten:** „Start Chain" stellt einen `songFetcher`-Job in die Queue, der automatisch Lyrics lädt

---

### Arena – Queue-Monitoring

**Pfad:** `http://localhost:{PORT}/admin/pages/Arena`

Eingebettetes [Bull Arena](https://github.com/bee-queue/arena)-Dashboard zur Überwachung der BullMQ-Warteschlangen in Echtzeit.

| Queue | Zweck |
|-------|-------|
| `songFetcher` | Song-Metadaten von Spotify/Genius laden |
| `lyricsFetcher` | Lyrics eines Songs von Genius abrufen |
| `aiAnalysis` | KI-Analyse für einen Song durchführen |

Das Dashboard zeigt aktive, wartende, abgeschlossene und fehlgeschlagene Jobs sowie deren Payload und Fehlermeldungen. Fehlgeschlagene Jobs können von hier aus direkt wiederholt werden.

---

## CLI (`PanschCLInes`)

Die CLI befindet sich im Repository‑Root (`cli.ts`) und wird über `tsx` ausgeführt. Sie benötigt eine laufende Datenbankverbindung (Postgres + Redis).

```bash
npm run cli -- --help
npm run cli -- <befehl> --help
```

> **Hinweis:** Bei lokaler Entwicklung ohne Docker muss die `.env`-Datei korrekt gesetzt sein, damit die CLI die Datenbank erreicht.

---

### `tagger` – Substanz-Tagging

Verwaltet den Substanz-Index und taggt Songs in der Datenbank.

```bash
npm run cli -- tagger [Optionen]
```

| Option | Beschreibung |
|--------|-------------|
| `-u, --update` | Substanz-Index aus Datei importieren |
| `-f, --filename <datei>` | Pfad zur Import-Datei (zusammen mit `--update`) |
| `-s, --tag-song <id>` | Einzelnen Song anhand seiner ID taggen |
| `--toId <id>` | Bereich taggen: von `--tag-song <id>` bis `--toId <id>` |
| `-a, --all` | Alle Songs in der Datenbank taggen |
| `--prune` | Alle bestehenden Substanz-Zuordnungen vorher löschen |

**Beispiele:**

```bash
# Index aus Datei importieren
npm run cli -- tagger --update --filename substances.json

# Einzelnen Song taggen
npm run cli -- tagger --tag-song 42

# Songs 1–100 taggen
npm run cli -- tagger --tag-song 1 --toId 100

# Alle Songs neu taggen (vorher alles löschen)
npm run cli -- tagger --all --prune
```

---

### `addArtist` – Künstler hinzufügen

Sucht einen Künstler auf Spotify, legt ihn in der Datenbank an und stellt Jobs für die Top-Tracks in die Queue.

```bash
npm run cli -- addArtist --query <name-oder-spotify-id> [Optionen]
```

| Option | Beschreibung |
|--------|-------------|
| `-q, --query <wert>` | Künstlername (Suche) oder Spotify-Künstler-ID **(Pflicht)** |
| `--isList` | `--query` enthält eine semikolongetrennte Liste von Künstlern |
| `-n, --top <n>` | Anzahl Top-Tracks (Standard: `10`) |
| `--market <cc>` | Spotify-Markt als Ländercode (Standard: `DE`) |
| `--chain` | Lyrics-Fetching nach Song-Erstellung verketten |
| `--chainAi` | KI-Analyse nach Lyrics-Fetching verketten (erfordert `--chain`) |
| `--dryRun` | Simulation ohne tatsächliches Einreihen in die Queue |
| `--sourceString <quelle>` | Quell-Label für den Künstler (Standard: `generic`) |

**Beispiele:**

```bash
# Künstler per Name hinzufügen (Top 10 Tracks)
npm run cli -- addArtist --query "Capital Bra"

# Direkter Spotify-ID-Aufruf, Top 5 Tracks, mit automatischem Lyrics-Fetch
npm run cli -- addArtist --query 4VMYDCV2IEDYJArk749S6m --top 5 --chain

# Mehrere Künstler auf einmal, vollständige Verarbeitungskette
npm run cli -- addArtist --query "Ufo361;Luciano;Bonez MC" --isList --chain --chainAi
```

---

### `addAiAnalysisJobs` – KI-Analyse für alle Songs einreihen

Stellt für jeden Song in der Datenbank einen KI-Analyse-Job in die Queue.

```bash
npm run cli -- addAiAnalysisJobs
```

---

### `checkAiAnalysis` – Fehlende KI-Annotationen nachholen

Prüft, welche Songs noch keine KI-Annotation haben, und stellt nur für diese Jobs in die Queue.

```bash
npm run cli -- checkAiAnalysis
```

---

### `analyzeGoldenSet` – KI-Analyse für das Golden Set

Stellt KI-Analyse-Jobs ausschließlich für alle Songs ein, die als Golden Set markiert sind (`isGoldenSet = true`).

```bash
npm run cli -- analyzeGoldenSet
```

---

### `updateOHS` – OHS-Werte neu berechnen

Berechnet den **Overall Harm Score (OHS)** für alle Songs und Künstler anhand der aktuellen Bewertungen in der Datenbank und schreibt die Werte zurück.

```bash
npm run cli -- updateOHS
```

---

### `updateSubstanceMentions` – Erwähnungen und Intensität aktualisieren

Aktualisiert die Felder `mentions` und `intensity_bin` nach einer Änderung am Substanz-Index.

```bash
npm run cli -- updateSubstanceMentions
```

---

### `distillGoldenSet` – Golden Set als Markdown exportieren

Erstellt eine stratifizierte Stichprobe aus der Datenbank und exportiert sie als Markdown-Datei.

```bash
npm run cli -- distillGoldenSet --outfile <dateiname>
```

| Option | Beschreibung |
|--------|-------------|
| `--outfile <datei>` | Pfad der Ausgabedatei **(Pflicht)** |

**Beispiel:**

```bash
npm run cli -- distillGoldenSet --outfile golden_set.md
```

---

### `distillGoldenSetForLimeSurvey` – Golden Set für LimeSurvey exportieren

Exportiert das Golden Set als einzelne `.lsg`-Dateien für den Import in LimeSurvey. Benötigt eine `groupWithDifferentSubstances.lsg`-Vorlagendatei im übergeordneten Verzeichnis.

```bash
npm run cli -- distillGoldenSetForLimeSurvey --folder <ausgabeordner>
```

| Option | Beschreibung |
|--------|-------------|
| `--folder <ordner>` | Ausgabeordner für die `.lsg`-Dateien **(Pflicht)** |

**Beispiel:**

```bash
npm run cli -- distillGoldenSetForLimeSurvey --folder ./limesurvey_export/
```

---

## Standalone Tools (`src/tools/`)

Neben der CLI gibt es eigenständige Skripte unter `src/tools/` für Datenimport, Analyse und Web-Scraping. Sie werden direkt mit `tsx` (TypeScript) bzw. `node` (JavaScript) ausgeführt.

> **Voraussetzung für Tools mit Datenbankzugriff:** Die Umgebungsvariablen müssen gesetzt sein. Am einfachsten geht das mit dem mitgelieferten Hilfsskript:
> ```bash
> source src/tools/env.sh
> ```
> Das setzt `REDIS_HOST`, `PG_HOST`, `INFLUXDB_HOST` und `LOGGING_LOCAL=true` für die lokale Entwicklung.

---

### `chartScraper.js` – Chart-Daten scrapen

Scrapt Song-Charts von chartsurfer.de und speichert die Ergebnisse als JSON-Datei (`scrape2020.json` im Arbeitsverzeichnis). Das Skript iteriert seitenweise über die Charts und wartet zwischen den Requests jeweils 2 Sekunden.

**Kein Datenbankzugriff erforderlich.**

```bash
node src/tools/chartScraper.js
```

> Die Zieladresse und der Zeitraum sind aktuell im Skript fest verdrahtet (2020, Seiten 1–16). Für andere Zeiträume muss die URL-Schleife am Ende der Datei angepasst werden.

---

### `jsonImporter.ts` – JSON-Datei in die Queue importieren

Liest eine JSON-Datei im Format `[{ title, artist }]` (z. B. Ausgabe von `chartScraper.js` oder `spotifyLyricsScraper.ts`) und stellt für jeden Eintrag einen `songFetcher`-Job in die Queue (inkl. automatischem Lyrics-Fetch via `chain: true`).

**Benötigt: Datenbankzugriff (Postgres + Redis).**

```bash
npx tsx src/tools/jsonImporter.ts <pfad-zur-datei.json>
```

**Beispiel:**

```bash
source src/tools/env.sh
npx tsx src/tools/jsonImporter.ts scrape2020.json
```

Kürzungen von Künstlernamen (Featuring-Angaben, ` x `-, `& `- und `, `-Trennungen) werden automatisch vorgenommen.

---

### `spotifyLyricsScraper.ts` – Spotify-Playlists als JSON exportieren

Sucht auf Spotify nach Playlists, die dem übergebenen Suchbegriff entsprechen, und speichert alle gefundenen Tracks als JSON-Dateien unter `src/tools/`. Die Ausgabedateien können anschließend mit `jsonImporter.ts` in die Queue geladen werden.

**Benötigt: Spotify-Zugangsdaten in der `.env`.**

```bash
npx tsx src/tools/spotifyLyricsScraper.ts "<suchbegriff>"
```

**Beispiel:**

```bash
npx tsx src/tools/spotifyLyricsScraper.ts "deutschrap 2023"
```

Pro gefundener Playlist wird eine Datei `<playlist-name><playlist-id>.json` erstellt.

---

### `reliabilityMetrics.ts` – Reliabilitätsmetriken berechnen

Berechnet **Cronbachs Alpha** (interne Konsistenz) und **Krippendorffs Alpha** (Inter-Rater-Reliabilität) auf Basis eines CSV-Exports der Bewertungsdaten (z. B. `goldenSetRated_withoutLyrics.csv`).

**Kein Datenbankzugriff erforderlich** – reines Statistik-Tool.

```bash
npx tsx src/tools/reliabilityMetrics.ts --input <datei.csv> [Optionen]
```

| Option | Beschreibung | Standard |
|--------|-------------|---------|
| `--input <datei>` | Pfad zur CSV-Eingabedatei | `goldenSetRated_withoutLyrics.csv` |
| `--groupBy song\|song+category` | Gruppierung der Analyseeinheiten | `song+category` |
| `--raterKey ratingId\|model` | Spalte zur Rater-Identifikation | `ratingId` |
| `--debugDim <dimension>` | Dimension für Disagreement-Analyse | `wording` |
| `--topDisagreements <n>` | Anzahl auffälligster Disagreements | `10` |

**Beispiele:**

```bash
# Standard-Auswertung
npx tsx src/tools/reliabilityMetrics.ts --input goldenSetRated_withoutLyrics.csv

# Nur auf Song-Ebene gruppieren, Modellname als Rater-Schlüssel
npx tsx src/tools/reliabilityMetrics.ts --input ratings.csv --groupBy song --raterKey model

# Top-15-Disagreements für die Glamorization-Dimension
npx tsx src/tools/reliabilityMetrics.ts --input ratings.csv --debugDim glamorization --topDisagreements 15

# Hilfe
npx tsx src/tools/reliabilityMetrics.ts --help
```

Das Skript berechnet auf der Konsole:
- Cronbachs Alpha (roh und standardisiert)
- Tau-Äquivalenz-Diagnostik (Differenz roh vs. standardisiert, Inter-Item-Korrelationen)
- Krippendorffs Alpha pro Bewertungsdimension (`wording`, `perspective`, `context`, `glamorization`, `harmAcknowledgement`)
- Ranking der Einheiten mit den größten Rater-Disagreements

---

### `dataAnalysis.js` – Statistische Auswertung und Diagramme

Umfangreiches Analyse-Skript, das CSV-Exporte (z. B. LimeSurvey-Ergebnisse) mit den Datenbankdaten verknüpft, OHS-Werte berechnet, Korrelationen auswertet und Chart-Grafiken generiert.

**Benötigt: Datenbankzugriff (Postgres).**

```bash
source src/tools/env.sh
node src/tools/dataAnalysis.js
```

> Das Skript erwartet CSV-Eingabedateien im Arbeitsverzeichnis. Pfade und Dateinamen sind im Skript konfiguriert.

---

## Beispiel `.env`

Eine vollständig kommentierte Vorlage liegt unter [.env.example](.env.example). Einfach kopieren und die API-Schlüssel eintragen:

```bash
cp .env.example .env
```

Alle Variablen im Überblick:

| Variable | Standard | Beschreibung |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP-Port des Webservers |
| `LOGGER_APP_NAME` | `webserver` | App-Label in den Logs |
| `LOG_LEVEL` | `info` | Log-Level (`debug`, `info`, `warn`, `error`) |
| `LOGGING_LOCAL` | `false` | `true` → Logs auf Konsole statt an Loki |
| `REDIS_HOST` | `localhost` | Redis-Hostname |
| `REDIS_PORT` | `6379` | Redis-Port |
| `PG_HOST` | `localhost` | PostgreSQL-Hostname |
| `PG_USER` | `postgres` | PostgreSQL-Benutzer |
| `PG_PASSWORD` | `postgres` | PostgreSQL-Passwort |
| `PG_DB` | `suchtpraevention` | PostgreSQL-Datenbankname |
| `LOKI_URL` | `http://localhost:3100` | Loki-Endpunkt für Log-Aggregation |
| `LOKI_HEADERS` | – | Auth-Header für Loki (`Authorization=Basic ...`) |
| `INFLUXDB_HOST` | `http://localhost:8181` | InfluxDB-Endpunkt |
| `INFLUXDB_DATABASE` | `sucht` | InfluxDB-Datenbankname |
| `INFLUXDB_TOKEN` | – | InfluxDB-Zugriffstoken |
| `GENIUS_CLIENT_ACCESS_TOKEN` | – | Genius API-Token (Lyrics-Abruf) |
| `OPENAI_KEY` | – | OpenAI API-Schlüssel (KI-Analyse) |
| `SPOTIFY_CLIENT_ID` | – | Spotify App Client-ID |
| `SPOTIFY_CLIENT_SECRET` | – | Spotify App Client-Secret |
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama-Endpunkt (lokales LLM) |
| `OLLAMA_MODEL` | `gpt-oss-20b` | Ollama-Modellname |

---

## Daten

Die verwendeten Song-Datensätze können aus urheberrechtlichen Gründen nicht veröffentlicht werden.

## Lizenz

Veröffentlicht unter der ISC‑Lizenz.
