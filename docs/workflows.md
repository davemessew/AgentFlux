# Workflows and agents

## Editor

Start with a template or describe a task. Connect nodes, edit their settings and save before running. Branches are supported; cycles are not. Drafts may be incomplete, but execution requires valid sources, models and connections.

The browser keeps the current draft; saved workflows live on the server. Export/import uses JSON. Imported templates exclude credentials and reset schedules and cloud approval. Use undo/redo for editor changes.

## Agents

Choose a task, model and permitted read-only sources. **Start now** runs planning, execution and learning. An agent node inside a workflow only processes its input; it does not start another planning cycle.

Schedules do not overlap runs for the same agent. **Stop** cancels the active cycle without undoing completed writes. Disable the schedule to pause future runs.

Learnings are stored observations linked to a run, not model training. Review, confirm or delete them in the app. Skills are reusable instructions with version history; they contain no executable code and grant no additional permissions. With automatic skill creation enabled, agents can reuse their own unconfirmed suggestions.

## Results

Run details show step status, errors and previews. Download final results as JSON or CSV. Results follow run-history retention; knowledge documents remain until deleted.

Running again repeats the entire workflow, including source reads and writes. Cancellation does not undo completed actions.

## Limits

| Limit | Value |
| --- | --- |
| Workflow size | 40 nodes, 100 connections |
| Concurrent workflows | 4 per instance, 1 per workflow |
| Run or agent cycle | 10 minutes |
| Import, step or saved result | 500 records |
| Per-document model processing | 50 documents |
| Agent cycle | 24 model calls, 32,768 tokens |

Token accounting uses server-reported usage or the requested output limit. It is an execution budget, not an exact provider billing limit. Planning, model steps and automatic learning need a reachable model server; templates without model steps can run without one.
