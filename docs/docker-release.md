# Install AgentFlux 0.2.0 with Docker

Requires Docker with Compose and Linux containers. The image targets Linux/amd64 and includes Node.js and the built interface. Connect a model server separately.

## Download and start

Download `agentflux-0.2.0-linux-amd64.tar.gz`, `compose.yaml` and `SHA256SUMS.txt` from [v0.2.0](https://github.com/davemessew/AgentFlux/releases/tag/v0.2.0) into one directory. `INSTALL.md` is an offline copy of these instructions; the source ZIP is optional.

Check the files with `sha256sum --check --ignore-missing SHA256SUMS.txt`. In PowerShell, use `Get-FileHash .\agentflux-0.2.0-linux-amd64.tar.gz -Algorithm SHA256` and compare the result with `SHA256SUMS.txt`.

```sh
docker load -i agentflux-0.2.0-linux-amd64.tar.gz
docker compose up -d --wait
docker compose ps
```

Open http://localhost:4310. The service should report `healthy`. Free port 4310 or change the port mapping if another service uses it.

The release uses `pull_policy: never`: Docker loads the local image instead of pulling from a registry. After downloading, installation works offline; external connections still need network access.

## Data and updates

Data lives in the `agentflux-data` volume, prefixed by the Compose project name. Keep the same directory or project name when updating. The container runs as UID 1000.

1. Stop the service and back up the entire volume, including `.vault-key`.
2. Download and verify the new image, then load it with `docker load -i FILE`.
3. Use the new Compose file in the same project, retain custom mounts and import paths, then run `docker compose up -d --wait`.

Keep the previous image, Compose file and backup for rollback; older versions may not read newer data. `docker compose down` retains the volume. **`docker compose down -v` deletes it.**

## Models and remote access

Host model servers are usually reachable at `http://host.docker.internal:11434` for Ollama or `http://host.docker.internal:1234/v1` for OpenAI-compatible servers. They must accept connections from the container. Mount import folders and allow their container paths through `AGENTFLUX_IMPORT_ROOTS`.

The default port binding is localhost only. AgentFlux has no login; remote access needs access control and host/network configuration. See [installation](https://github.com/davemessew/AgentFlux/blob/main/docs/installation.md) and [operations](https://github.com/davemessew/AgentFlux/blob/main/docs/operations.md).

## Build from source

```sh
git clone https://github.com/davemessew/AgentFlux.git
cd AgentFlux
docker compose up --build -d --wait
```

Only Linux/amd64 was checked for this release.
