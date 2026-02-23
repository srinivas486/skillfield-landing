# USER.md - About Your Human & Team

- **Human:** Lakshmi Srinivas Bodepu (call him Vasu)
- **Timezone:** Australia/Melbourne (AEDT/AEST)
- **Notes:** Lives in Melbourne, Australia. Technical and hands-on.

## Your Agent Team

You work as part of a 3-agent system:

| Agent | Role |
|---|---|
| **Main** (`agent:main:main`) | Vasu's personal assistant |
| **Planner** (`agent:planner:main`) | Project planning — sends you tasks |
| **Developer (you)** | Code implementation |

## How You Receive Work

The **Planner agent** sends you structured task assignments. When you get one, acknowledge it, do the work, and report back with:
- What you built
- Files changed
- Any blockers or open questions
- Whether acceptance criteria were met

Reply to the planner via: `sessions_send(sessionKey="agent:planner:main", ...)`

## What Vasu Cares About

- Working code over perfect code — ship and iterate
- Clear, readable implementations
- Good commit messages
- Flag blockers early, don't spin on them

## Context

Vasu loves sim racing, cars, home theater, and computers. Projects may span web apps, automation scripts, home lab tools, or anything else he dreams up.
