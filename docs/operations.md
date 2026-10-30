# Operations

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Bind address; `0.0.0.0` in Docker |
| `PORT` | `4310` | HTTP port |
| `AGENTFLUX_DATA_DIR` | `data` | Database, key and inbox; `/app/data` in Docker |
| `AGENTFLUX_IMPORT_ROOTS` | empty | Allowed directories, separated by semicolons |
| `AGENTFLUX_OUTPUT_ROOTS` | empty | Additional writable report roots, separated by semicolons; the data outbox is always allowed |
| `AGENTFLUX_TRANSCRIPTION_URL` | `http://127.0.0.1:8090/v1` | Default speech endpoint; Compose uses `http://speech:8090/v1` |
| `AGENTFLUX_ALLOWED_HOSTS` | empty | Extra hostnames, separated by commas; not authentication |

Compose uses a named volume. For a bind mount, make the data directory writable by UID/GID 1000.

## Programs

Programs run on the AgentFlux server. In Docker, executables must exist inside the Linux container. A custom `data/programs.json` replaces the built-in example allowlist:

```json
{
  "demo-export": {
    "name": "Example export",
    "executable": "/usr/local/bin/node",
    "args": ["/app/examples/export-records.mjs"]
  }
}
```

Use absolute local paths for a native installation. Set the connection's `programId` to the entry key and enable program connections in settings.

Executables and arguments are fixed by the allowlist. Programs receive JSON on stdin and return JSON or text on stdout. They run with `shell: false`, the data directory as cwd and a 30-second timeout; oversized output also stops the process. They have the server's permissions. The allowlist is not a sandbox.

## Backups and updates

Stop the service before copying the entire data directory or volume, including hidden files and `.vault-key`. Keep the database and key together and protect the backup like your credentials. To restore, stop the service, restore both, check write permissions and restart. `docker compose down -v` deletes the volume.

For source builds, update with `docker compose up --build -d`. For a native installation, run `pnpm install --frozen-lockfile`, `pnpm build` and restart. Prebuilt-image updates are covered in the [release instructions](docker-release.md).

Schedules need a running server. Program and HTTP POST sources require a manual start; scheduled runs reject those steps. Other scheduled steps can still save results and call approved models.

## Media and reports

Video jobs accept up to 250 MB and 30 minutes, with two active jobs per instance. Default analysis budgets are 40 model calls and 131,072 tokens; longer recordings may need a larger explicit budget. The UI reports incomplete coverage and failures. Raw recordings, extracted frames and temporary audio are removed after processing or cancellation. Interrupted jobs are marked failed on restart; saved observations and text clarifications expire after 24 hours.

The speech service runs on the private Compose network and uses four CPU threads per job. Its base model ships in the image and is copied into `agentflux-models` on first start. No audio is sent outside the instance unless an external transcription service is selected and approved.

Delivered reports remain in the output directory independently of run-history retention. Back up or remove those files according to your own retention needs. Include the outbox in data backups. The speech cache can be recreated from the image.
