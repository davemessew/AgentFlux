# Installation

## Docker

Run from the project directory:

```sh
docker compose up --build -d --wait
```

Open http://localhost:4310. Compose keeps application data in the `agentflux-data` volume. For the prebuilt image, see the [release instructions](docker-release.md).

## Without Docker

Requires Node.js 24+ and pnpm 11.25.0. Video analysis also needs `ffmpeg` and `ffprobe` on PATH:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

You can also use `./start.ps1` on Windows or `sh ./start.sh` on macOS/Linux. For development, `pnpm dev` starts Vite on port 5173 and the API on port 4310.

## Models

AgentFlux connects to a language/vision model server. The Docker speech service includes a separate transcription model. Add a connection under **Models** and enter an available model ID.

| Server on the host | Native installation | AgentFlux in Docker |
| --- | --- | --- |
| Ollama | `http://127.0.0.1:11434` | `http://host.docker.internal:11434` |
| OpenAI-compatible, e.g. LM Studio | `http://127.0.0.1:1234/v1` | `http://host.docker.internal:1234/v1` |

The model server must accept connections from the container. External providers usually need an API key. Keep `/v1` in the base URL when the server uses that path.

## Files and connections

Supported formats: TXT, MD, CSV, JSON, JSONL, HTML, XML, PDF, DOCX and XLSX. PDFs need readable text; OCR is not included. Imports allow up to 12 MB per file or HTTP response, 500 records per import and 40 files per folder, without recursion.

For XLSX, preview the workbook and choose the sheet and header row. Blank or duplicate headings receive stable column names. Sheet and row references remain attached to imported records. A header row of 0 preserves raw columns.

Folder sources can read `data/inbox`. Set `AGENTFLUX_IMPORT_ROOTS` to allow more directories, separated by semicolons:

```powershell
$env:AGENTFLUX_IMPORT_ROOTS = 'C:\Documents;D:\Exports'
pnpm start
```

With Docker, mount the directory too. For example, in `compose.override.yaml`:

```yaml
services:
  agentflux:
    environment:
      AGENTFLUX_IMPORT_ROOTS: /imports
    volumes:
      - ./imports:/imports:ro
```

Create the host directory first, then use `/imports` in the app. HTTP connections support GET and POST. Put credentials in the encrypted bearer-token field; credential headers such as `Authorization` and `API-Key` are rejected. Programs require an allowlist and must be enabled in settings. See [operations](operations.md).

## Data and limits

AgentFlux is a single-user application without authentication or user roles. Remote access needs an access-control layer and network/host configuration.

Cloud model calls and external HTTP POST require both global and workflow approval. HTTP GET can still send data through URLs and headers. Redaction uses pattern matching for email addresses, Swiss phone numbers, AHV numbers, Swiss IBANs and custom terms. It can miss data or change harmless text; review outgoing data and model results before relying on them.

Credentials use AES-256-GCM. The key is stored beside the database in `data/.vault-key`, so access to the whole data directory also gives access to credentials. Documents, workflows and logs are unencrypted. Back up the database and key together.

For the editor, agents, schedules and execution limits, see [workflows](workflows.md).

## Speech and report folders

Docker configures the speech service automatically. With a native app, start it separately:

```sh
docker build -t agentflux-speech:0.3.0 services/transcription
docker run -d --name agentflux-speech -p 127.0.0.1:8090:8090 -v agentflux-models:/models agentflux-speech:0.3.0
```

In **Settings → Video transcription**, use `http://127.0.0.1:8090/v1`, model `base`, scope `local`. A compatible external service needs explicit audio approval as well as global cloud permission.

Reports default to the data directory's `outbox`. To write to a host folder from Docker, create it and add a writable mount plus an allowed output root:

```yaml
services:
  agentflux:
    environment:
      AGENTFLUX_OUTPUT_ROOTS: /reports
    volumes:
      - ./reports:/reports
```

Then select `/reports` when setting up the task. Import permissions do not grant output permissions.
