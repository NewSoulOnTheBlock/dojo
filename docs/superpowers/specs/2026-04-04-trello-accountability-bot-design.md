# Trello Accountability Bot — Design Spec

**Date:** 2026-04-04
**Status:** Approved

## Overview

A Discord bot that serves as an AI-powered accountability partner for small teams (2-10 people). Users describe a project in plain English, Claude breaks it into tasks with skill requirements, and the bot assigns tasks to team members based on their skill profiles. The bot tracks progress, sends deadline nudges, and posts daily/weekly accountability summaries — all within Discord.

Trello is used as a one-way data source to enrich member skill profiles by analyzing their completed card history.

## Architecture

Single-process Node/Bun monolith. One SQLite database file. No external services beyond Discord API, Claude API, and Trello API.

**Runtime:** Bun (falls back to Node 18+ if needed)

## Commands

| Command | Description |
|---|---|
| `/newproject <description>` | Describe a project. Claude breaks it into tasks, assigns to team members based on skills. Creates a Discord thread. |
| `/skills add <skills>` | Register your skills (comma-separated). |
| `/skills list [@user]` | View a member's skill profile. |
| `/tasks [@user]` | Show all active tasks for a user or yourself. |
| `/status <task_id> <done\|blocked\|in-progress>` | Update a task's status. |
| `/projects` | List all active projects with progress. |
| `/sync-trello` | Pull completed card history from Trello to enrich skill profiles. |
| `/config <key> <value>` | Admin-only. Configure bot settings (summary time, channels, etc). |

## Core Flow: `/newproject`

1. User runs `/newproject Build a landing page with email signup and analytics`
2. Bot sends the description to Claude API with a system prompt instructing it to break the project into discrete tasks, each with: title, description, required skills, estimated effort, and suggested execution order
3. Claude returns structured JSON
4. Bot runs the skill matching algorithm against team member profiles in SQLite
5. Bot creates a new Discord thread titled after the project
6. Bot posts a rich embed with all tasks, assignments, and timeline
7. Team members update status via `/status` as they work

## Data Model (SQLite)

### `members`

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | Discord user ID |
| `username` | TEXT | Discord display name |
| `skills` | TEXT | Comma-separated self-declared skill tags |
| `inferred_skills` | TEXT | Comma-separated skills inferred from Trello history |
| `trello_id` | TEXT | Optional Trello username for history sync |
| `created_at` | DATETIME | |

### `projects`

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `name` | TEXT | Generated from description |
| `description` | TEXT | Original user input |
| `thread_id` | TEXT | Discord thread ID |
| `created_by` | TEXT | Discord user ID (FK to members) |
| `status` | TEXT | `active`, `completed`, `archived` |
| `created_at` | DATETIME | |

### `tasks`

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `project_id` | INTEGER FK | References projects |
| `title` | TEXT | Task name |
| `description` | TEXT | What needs to be done |
| `required_skills` | TEXT | Comma-separated skill tags |
| `assigned_to` | TEXT | Discord user ID (FK to members) |
| `status` | TEXT | `pending`, `in-progress`, `blocked`, `done` |
| `sort_order` | INTEGER | Suggested execution order |
| `due_date` | DATETIME | Calculated from effort estimate |
| `last_nudged_at` | DATETIME | Anti-spam: last time a nudge was sent |
| `created_at` | DATETIME | |

### `check_ins`

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `task_id` | INTEGER FK | References tasks |
| `member_id` | TEXT | Discord user ID |
| `old_status` | TEXT | Previous status |
| `new_status` | TEXT | Updated status |
| `created_at` | DATETIME | Timestamp for audit trail |

### `bot_config`

| Column | Type | Notes |
|---|---|---|
| `key` | TEXT PK | Config key |
| `value` | TEXT | Config value |

Default config values:

| Key | Default | Notes |
|---|---|---|
| `daily_summary_hour` | `9` | Hour in UTC |
| `daily_summary_channel` | — | Channel ID, set via `/config` |
| `weekly_retro_day` | `5` (Friday) | Day of week |
| `nudge_interval_hours` | `4` | How often to check for overdue tasks |
| `timezone` | `UTC` | For display formatting |

## Accountability System (Scheduler)

Three recurring jobs running via `setInterval` inside the bot process:

### Daily Summary (configurable hour, default 9 AM UTC)
- Posts to the configured `#accountability` channel
- Shows: tasks due today, overdue tasks with owner @mentions, tasks completed yesterday
- Single rich embed with color-coded sections (green = done, red = overdue, yellow = due today)

### Deadline Nudges (every 4 hours, configurable)
- Queries tasks where `due_date` is within 24 hours or past due
- DMs the assigned member with a reminder
- Skips if `last_nudged_at` is within the last 24 hours

### Weekly Retro (configurable day, default Friday)
- Posts summary to the project thread: tasks completed, tasks still open, who contributed what
- Includes team velocity stat: tasks completed this week vs. last week
- Mentions members with zero completed tasks that week

## Trello Integration

Trello is a **read-only data source** for enriching skill profiles. The bot never writes to Trello.

### `/sync-trello` Flow
1. Member links Trello account via `/skills trello <trello_username>`
2. Bot calls `GET /1/members/{id}/actions?filter=updateCard:idList` to fetch cards moved to "Done" lists
3. Extracts card labels (e.g., "Frontend", "Design", "API") as inferred skills
4. Merges inferred skills into the member's profile, stored separately from self-declared skills
5. Responds with sync summary

### Auth
- Trello API key + token stored in `.env`
- One set of bot credentials for reading public board data
- Members provide their Trello username for lookup

## Skill Matching Algorithm

When Claude returns tasks from `/newproject`:

```
For each task:
  1. Claude provides required_skills (e.g., ["javascript", "css", "responsive-design"])
  2. Score each team member:
     - +2 points per exact skill match (self-declared)
     - +1 point per exact skill match (trello-inferred)
     - +1 point per fuzzy match via synonym map
  3. Penalize members with high current task load: -1 per active task
  4. Assign to highest-scoring available member
  5. If no good match (score < threshold), mark as "unassigned" and flag it
```

Fuzzy matching uses a hardcoded synonym map (e.g., `frontend -> [css, html, javascript, react]`).

## Project Structure

```
trello-accountability-bot/
├── .env.example
├── package.json
├── src/
│   ├── index.js              # Entry point: bot login, command registration, scheduler start
│   ├── db.js                 # SQLite setup, migrations, query helpers
│   ├── commands/
│   │   ├── newproject.js     # /newproject handler
│   │   ├── skills.js         # /skills add, /skills list, /skills trello
│   │   ├── tasks.js          # /tasks query
│   │   ├── status.js         # /status update
│   │   ├── projects.js       # /projects list
│   │   ├── sync-trello.js    # /sync-trello
│   │   └── config.js         # /config admin settings
│   ├── services/
│   │   ├── claude.js         # Claude API client, project breakdown prompt
│   │   ├── trello.js         # Trello API client, fetch member actions
│   │   ├── matcher.js        # Skill matching & assignment algorithm
│   │   └── scheduler.js      # Daily summary, nudges, weekly retro
│   └── utils/
│       ├── embeds.js         # Discord embed builders
│       └── synonyms.js       # Skill synonym map for fuzzy matching
├── data/
│   └── bot.db                # SQLite database file (gitignored)
└── tests/
```

## Dependencies

| Package | Purpose |
|---|---|
| `discord.js` (v14) | Discord bot framework |
| `better-sqlite3` | SQLite driver |
| `@anthropic-ai/sdk` | Claude API client |

No ORM, no web framework, no queue library. Bun's native `fetch` handles Trello HTTP calls. `setInterval` handles scheduling.

## Environment Variables

```
DISCORD_TOKEN=         # Discord bot token
DISCORD_CLIENT_ID=     # Discord application client ID
CLAUDE_API_KEY=        # Anthropic API key
TRELLO_API_KEY=        # Trello API key
TRELLO_TOKEN=          # Trello API token
```
