<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->

## Project Workflow Overlay

For non-trivial engineering work in this repository, use the Trellis project layer before editing code:

1. Read `.trellis/workflow.md` and the current task context with `python3 ./.trellis/scripts/get_context.py`.
2. If there is no active task and the work is more than a tiny fix, create or ask to create a Trellis task before implementation.
3. Read the relevant `.trellis/spec/<package>/<layer>/index.md` and the files it links before editing.
4. After code changes, run the relevant package checks and use Trellis finish/update-spec flow to record durable lessons.

Keep this overlay additive. Do not remove existing Codex, Hermes, Impeccable, Seedance, or other local skills.
