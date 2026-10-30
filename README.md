<div align="center">

<img src="public/favicon.svg" alt="AgentFlux" width="80" height="80">

# AgentFlux

### Your data. Your models. Your workflows.

**Agentic AI platform** for visual workflows and autonomous agents.<br>
Import files, automate tasks and keep results local.

[![Release](https://img.shields.io/github/v/release/davemessew/AgentFlux?style=for-the-badge&color=3d63ff&labelColor=0b1126)](https://github.com/davemessew/AgentFlux/releases/latest)
[![Docker](https://img.shields.io/badge/Docker-linux%2Famd64-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://github.com/davemessew/AgentFlux/releases/tag/v0.3.0)
[![License](https://img.shields.io/badge/License-Apache%202.0-2a49d8?style=for-the-badge)](LICENSE)

[**Download the Docker release**](https://github.com/davemessew/AgentFlux/releases/latest) · [Website](https://agentflux.cloud) · [Documentation](docs/installation.md) · [Report an issue](https://github.com/davemessew/AgentFlux/issues)

<br>

<img src="docs/screenshots/overview.jpg" alt="AgentFlux overview with workflows, data sources and getting started" width="100%">

</div>

<br>

## What you can do

AgentFlux connects documents, data sources and language models in a visual workflow. Build each step yourself or let an agent create a workflow from a task description. The application runs on your computer or server, with a browser interface.

| | In AgentFlux |
| :--- | :--- |
| **Visual workflows** | 17 preconfigured steps, eight templates, branching, undo/redo and JSON import/export. |
| **AI agents** | Set up recurring tasks, reuse a saved plan and answer missing details in text. |
| **Video to workflow** | Combine screen changes and spoken explanations, then create and run a workflow automatically. |
| **Knowledge and learnings** | Store documents locally, review observations from runs and reuse instructions as skills. |
| **Your own models** | Connect Ollama, LM Studio, vLLM and OpenAI-compatible endpoints. |
| **Files and connections** | Import documents and spreadsheets with named columns; connect folders, HTTP endpoints and approved programs. |
| **Traceable runs** | Process changed inputs and deliver JSON, CSV and Markdown reports to a local folder. |

### Create a workflow from a video

Open **Agents → Analyse video**, select a recording and a model with vision support. AgentFlux analyses overlapping one-minute segments using screen changes, periodic frames and timestamped speech. If an action or integration is unclear, it asks a short question. Answer in text, then save or start the generated workflow. The editor is optional.

Recordings are uploaded to your AgentFlux instance and removed after processing or cancellation. The Docker release includes FFmpeg and a local speech service with the Whisper base model. Images go to your selected vision model. External image and audio processing require separate approval; audio stays local by default.

Videos can be up to 250 MB and 30 minutes. Each segment uses up to 24 selected frames, with explicit call and token budgets for the whole job. Progress shows analysed coverage. Unsupported codecs, exhausted budgets and transcription failures stop the job instead of producing a complete workflow. Brief actions can still be missed.

Generated workflows use existing connections and executable steps. They do not replay arbitrary mouse or keyboard actions in other applications.

## Get started with Docker in minutes

You need **Docker with Compose**. The release includes the application, built interface, FFmpeg and local speech recognition. You do not need to install Node or pnpm locally.

### Use the prebuilt image

Download these two files from [release v0.3.0](https://github.com/davemessew/AgentFlux/releases/tag/v0.3.0) into the same folder:

- [**agentflux-0.3.0-linux-amd64.tar.gz**](https://github.com/davemessew/AgentFlux/releases/download/v0.3.0/agentflux-0.3.0-linux-amd64.tar.gz): both prebuilt Docker images in one archive.
- [**compose.yaml**](https://github.com/davemessew/AgentFlux/releases/download/v0.3.0/compose.yaml): the startup configuration.

Open a terminal in that folder:

~~~sh
docker load -i agentflux-0.3.0-linux-amd64.tar.gz
docker compose up -d --wait
~~~

**Open [localhost:4310](http://localhost:4310).** Done.

The prebuilt image targets Linux/amd64. On Windows, use Docker Desktop in Linux container mode. You can build from source for other architectures; they were not tested for this release.

<details>
<summary><strong>Download from the terminal</strong></summary>

~~~sh
mkdir agentflux
cd agentflux
curl -fLO https://github.com/davemessew/AgentFlux/releases/download/v0.3.0/agentflux-0.3.0-linux-amd64.tar.gz
curl -fLO https://github.com/davemessew/AgentFlux/releases/download/v0.3.0/compose.yaml
docker load -i agentflux-0.3.0-linux-amd64.tar.gz
docker compose up -d --wait
~~~

In Windows PowerShell, use <code>curl.exe</code> instead of <code>curl</code> if needed. Checksums and full instructions are also included in the [release](https://github.com/davemessew/AgentFlux/releases/tag/v0.3.0).

</details>

<details>
<summary id="selbst-bauen"><strong>Prefer to build from source?</strong></summary>

~~~sh
git clone https://github.com/davemessew/AgentFlux.git
cd AgentFlux
docker compose up --build -d --wait
~~~

[Installation without Docker](docs/installation.md#without-docker) is also documented.

</details>

## A look inside

The screenshots show the interface included in v0.3.0, using sample data.

### Build workflows on the canvas

Connect sources and processing steps, configure each step and follow its execution.

![Visual workflow editor with connected steps](docs/screenshots/workflow.jpg)

<table>
  <tr>
    <td width="50%"><strong>Agents</strong><br>Tasks, models and recurring jobs in one place.</td>
    <td width="50%"><strong>Knowledge base</strong><br>Search documents and processed content locally.</td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/agents.jpg" alt="Manage agents in AgentFlux"></td>
    <td><img src="docs/screenshots/knowledge.jpg" alt="Local knowledge base with sample documents"></td>
  </tr>
</table>

## Your first workflow

1. Open **Agents → Create agent** and choose **Clean and export records without a model**.
2. Select **Local inbox**, choose an output directory and start. Run details show the delivered files.
3. Connect your model server under **Models** to extract sourced tasks or write reports.
4. Enable a schedule to process new or changed inputs automatically. Missing owners and dates remain unresolved.

The release includes a speech model. For agents and video interpretation, connect your own language or vision model server, or an external provider with your credentials.

| Model server on your computer | Base URL from the container |
| :--- | :--- |
| Ollama | <code>http://host.docker.internal:11434</code> |
| LM Studio / OpenAI-compatible | <code>http://host.docker.internal:1234/v1</code> |
| vLLM | <code>http://host.docker.internal:8000/v1</code> |

Adjust the port and model ID for your server. The model server must accept connections from the container.

## Operations and data

~~~sh
docker compose ps            # Status and healthcheck
docker compose logs -f       # View server output
docker compose stop          # Stop
docker compose up -d --wait  # Start again
~~~

Workflows, documents, credentials and run logs stay in the named <code>agentflux-data</code> volume. Reports are stored in its `outbox` directory by default. The separate `agentflux-models` volume caches speech assets. Replacing the containers does not delete these volumes. Back up the entire volume including <code>.vault-key</code>; <code>docker compose down -v</code> deletes the volume.

> [!IMPORTANT]
> The supplied configuration binds port 4310 to localhost. AgentFlux has no login and is designed for a single user. Shared or public access requires an access-control layer and suitable network configuration.

Cloud model calls and external HTTP POST steps require approval in Settings and in the workflow. HTTP GET requests can send information in URLs and headers. Optional redaction uses rules and may miss sensitive information. See the [installation guide](docs/installation.md#data-and-limits) and [operations guide](docs/operations.md).

## Documentation and development

| Start here | Contents |
| :--- | :--- |
| [Docker release](https://github.com/davemessew/AgentFlux/releases/latest) | Prebuilt image, Compose file, source code and SHA-256 checksums |
| [Install the release](docs/docker-release.md) | Download, verify, start and update |
| [Installation and models](docs/installation.md) | Docker, native installation and model connections |
| [Workflows and agents](docs/workflows.md) | Editor, steps, templates, learnings and skills |
| [Operations and configuration](docs/operations.md) | Environment variables, import folders, backups and programs |

~~~text
src/          Web interface and visual editor
server/       API, agents, execution and SQLite storage
shared/       Domain types, workflow rules and templates
services/     Local speech recognition
tests/        Contract and media checks
examples/     Sample local program export
scripts/      Docker release checks
docs/         Usage, operations and screenshots
~~~

For local development: Node.js 24+, pnpm 11.25.0, <code>pnpm install --frozen-lockfile</code>, then <code>pnpm dev</code>. Run <code>pnpm test</code> for focused checks; <code>pnpm build</code> also checks TypeScript.

Run the Docker check after building:

~~~sh
docker build -t agentflux:0.3.0 .
node scripts/smoke-docker.mjs agentflux:0.3.0
~~~

The check uses its own container and volume. It covers the API, built interface, an example run and data persistence when replacing the container.

## Licence

[Apache License 2.0](LICENSE). Bundled dependencies and fonts retain their respective licences.

<div align="center">

<br>

[Download release](https://github.com/davemessew/AgentFlux/releases/latest) · [Visit website](https://agentflux.cloud) · [Open an issue](https://github.com/davemessew/AgentFlux/issues)

</div>
