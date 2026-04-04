# Trello Accountability Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Discord bot that uses Claude AI to break projects into tasks, assign them based on team member skills (enriched via Trello history), and enforce accountability through scheduled check-ins and nudges.

**Architecture:** Single-process Bun monolith with SQLite storage. Discord.js v14 for bot framework, @anthropic-ai/sdk for Claude, native fetch for Trello API. In-process setInterval for scheduling.

**Tech Stack:** Bun, discord.js v14, better-sqlite3, @anthropic-ai/sdk

---

## File Map

| File | Responsibility |
|---|---|
| `trello-accountability-bot/package.json` | Dependencies, scripts |
| `trello-accountability-bot/.env.example` | Environment variable template |
| `trello-accountability-bot/.gitignore` | Ignore node_modules, data/, .env |
| `trello-accountability-bot/src/index.js` | Entry point: bot login, command registration, scheduler start |
| `trello-accountability-bot/src/db.js` | SQLite setup, migrations, all query helpers |
| `trello-accountability-bot/src/commands/skills.js` | /skills add, /skills list, /skills trello |
| `trello-accountability-bot/src/commands/newproject.js` | /newproject handler |
| `trello-accountability-bot/src/commands/tasks.js` | /tasks query |
| `trello-accountability-bot/src/commands/status.js` | /status update |
| `trello-accountability-bot/src/commands/projects.js` | /projects list |
| `trello-accountability-bot/src/commands/sync-trello.js` | /sync-trello handler |
| `trello-accountability-bot/src/commands/config.js` | /config admin settings |
| `trello-accountability-bot/src/services/claude.js` | Claude API client, project breakdown prompt |
| `trello-accountability-bot/src/services/trello.js` | Trello API client, fetch member actions |
| `trello-accountability-bot/src/services/matcher.js` | Skill matching & assignment algorithm |
| `trello-accountability-bot/src/services/scheduler.js` | Daily summary, nudges, weekly retro |
| `trello-accountability-bot/src/utils/embeds.js` | Discord embed builders |
| `trello-accountability-bot/src/utils/synonyms.js` | Skill synonym map for fuzzy matching |
| `trello-accountability-bot/tests/db.test.js` | Database layer tests |
| `trello-accountability-bot/tests/matcher.test.js` | Skill matching algorithm tests |
| `trello-accountability-bot/tests/claude.test.js` | Claude service response parsing tests |
| `trello-accountability-bot/tests/synonyms.test.js` | Synonym map tests |

---

### Task 1: Project Scaffold & Dependencies

**Files:**
- Create: `trello-accountability-bot/package.json`
- Create: `trello-accountability-bot/.env.example`
- Create: `trello-accountability-bot/.gitignore`

- [ ] **Step 1: Create project directory**

```bash
mkdir -p trello-accountability-bot
cd trello-accountability-bot
```

- [ ] **Step 2: Create package.json**

Create `trello-accountability-bot/package.json`:

```json
{
  "name": "trello-accountability-bot",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "bun src/index.js",
    "dev": "bun --watch src/index.js",
    "test": "bun test"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "better-sqlite3": "^11.7.0",
    "discord.js": "^14.16.0"
  }
}
```

- [ ] **Step 3: Create .env.example**

Create `trello-accountability-bot/.env.example`:

```
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
CLAUDE_API_KEY=
TRELLO_API_KEY=
TRELLO_TOKEN=
```

- [ ] **Step 4: Create .gitignore**

Create `trello-accountability-bot/.gitignore`:

```
node_modules/
data/
.env
```

- [ ] **Step 5: Install dependencies**

```bash
cd trello-accountability-bot
bun install
```

- [ ] **Step 6: Commit**

```bash
git add package.json .env.example .gitignore bun.lockb
git commit -m "feat: scaffold project with dependencies"
```

---

### Task 2: Database Layer

**Files:**
- Create: `trello-accountability-bot/src/db.js`
- Create: `trello-accountability-bot/tests/db.test.js`

- [ ] **Step 1: Write failing test for database initialization**

Create `trello-accountability-bot/tests/db.test.js`:

```js
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import Database from "better-sqlite3";
import { createDb } from "../src/db.js";

let db;

beforeEach(() => {
  db = createDb(":memory:");
});

afterEach(() => {
  db.close();
});

describe("createDb", () => {
  test("creates members table", () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='members'")
      .all();
    expect(tables).toHaveLength(1);
  });

  test("creates projects table", () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'")
      .all();
    expect(tables).toHaveLength(1);
  });

  test("creates tasks table", () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'")
      .all();
    expect(tables).toHaveLength(1);
  });

  test("creates check_ins table", () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='check_ins'")
      .all();
    expect(tables).toHaveLength(1);
  });

  test("creates bot_config table with defaults", () => {
    const config = db.prepare("SELECT * FROM bot_config").all();
    expect(config.length).toBeGreaterThanOrEqual(4);
    const hours = db.prepare("SELECT value FROM bot_config WHERE key='daily_summary_hour'").get();
    expect(hours.value).toBe("9");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd trello-accountability-bot
bun test tests/db.test.js
```

Expected: FAIL — `createDb` not found.

- [ ] **Step 3: Write failing tests for query helpers**

Append to `trello-accountability-bot/tests/db.test.js`:

```js
describe("member queries", () => {
  test("upsertMember creates a new member", () => {
    const { upsertMember, getMember } = require("../src/db.js");
    // This will fail until implemented
    upsertMember(db, { id: "123", username: "alice", skills: "javascript,css" });
    const member = getMember(db, "123");
    expect(member.username).toBe("alice");
    expect(member.skills).toBe("javascript,css");
  });

  test("upsertMember updates existing member skills", () => {
    const { upsertMember, getMember } = require("../src/db.js");
    upsertMember(db, { id: "123", username: "alice", skills: "javascript" });
    upsertMember(db, { id: "123", username: "alice", skills: "javascript,python" });
    const member = getMember(db, "123");
    expect(member.skills).toBe("javascript,python");
  });

  test("getAllMembers returns all members", () => {
    const { upsertMember, getAllMembers } = require("../src/db.js");
    upsertMember(db, { id: "1", username: "alice", skills: "js" });
    upsertMember(db, { id: "2", username: "bob", skills: "python" });
    const members = getAllMembers(db);
    expect(members).toHaveLength(2);
  });
});

describe("project queries", () => {
  test("createProject returns project with id", () => {
    const { createProject } = require("../src/db.js");
    const project = createProject(db, {
      name: "Landing Page",
      description: "Build a landing page",
      thread_id: "thread_1",
      created_by: "123",
    });
    expect(project.id).toBeDefined();
    expect(project.status).toBe("active");
  });

  test("getActiveProjects returns only active projects", () => {
    const { createProject, getActiveProjects } = require("../src/db.js");
    createProject(db, { name: "P1", description: "d", thread_id: "t1", created_by: "1" });
    createProject(db, { name: "P2", description: "d", thread_id: "t2", created_by: "1" });
    const projects = getActiveProjects(db);
    expect(projects).toHaveLength(2);
  });
});

describe("task queries", () => {
  test("createTask and getTasksByProject", () => {
    const { createProject, createTask, getTasksByProject } = require("../src/db.js");
    const project = createProject(db, { name: "P", description: "d", thread_id: "t", created_by: "1" });
    createTask(db, {
      project_id: project.id,
      title: "Build form",
      description: "Create signup form",
      required_skills: "html,css",
      assigned_to: "123",
      sort_order: 1,
    });
    const tasks = getTasksByProject(db, project.id);
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Build form");
    expect(tasks[0].status).toBe("pending");
  });

  test("updateTaskStatus changes status and logs check_in", () => {
    const { createProject, createTask, updateTaskStatus, getCheckIns } = require("../src/db.js");
    const project = createProject(db, { name: "P", description: "d", thread_id: "t", created_by: "1" });
    createTask(db, {
      project_id: project.id,
      title: "T",
      description: "d",
      required_skills: "",
      assigned_to: "123",
      sort_order: 1,
    });
    const tasks = db.prepare("SELECT id FROM tasks").all();
    updateTaskStatus(db, tasks[0].id, "in-progress", "123");
    const updated = db.prepare("SELECT status FROM tasks WHERE id = ?").get(tasks[0].id);
    expect(updated.status).toBe("in-progress");
    const checkIns = getCheckIns(db, tasks[0].id);
    expect(checkIns).toHaveLength(1);
    expect(checkIns[0].old_status).toBe("pending");
    expect(checkIns[0].new_status).toBe("in-progress");
  });

  test("getTasksByMember returns tasks for a specific user", () => {
    const { createProject, createTask, getTasksByMember } = require("../src/db.js");
    const project = createProject(db, { name: "P", description: "d", thread_id: "t", created_by: "1" });
    createTask(db, { project_id: project.id, title: "T1", description: "d", required_skills: "", assigned_to: "alice", sort_order: 1 });
    createTask(db, { project_id: project.id, title: "T2", description: "d", required_skills: "", assigned_to: "bob", sort_order: 2 });
    const tasks = getTasksByMember(db, "alice");
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("T1");
  });

  test("getOverdueTasks returns tasks past due_date", () => {
    const { createProject, createTask, getOverdueTasks } = require("../src/db.js");
    const project = createProject(db, { name: "P", description: "d", thread_id: "t", created_by: "1" });
    createTask(db, {
      project_id: project.id,
      title: "Overdue",
      description: "d",
      required_skills: "",
      assigned_to: "123",
      sort_order: 1,
      due_date: "2020-01-01T00:00:00Z",
    });
    createTask(db, {
      project_id: project.id,
      title: "Future",
      description: "d",
      required_skills: "",
      assigned_to: "123",
      sort_order: 2,
      due_date: "2099-01-01T00:00:00Z",
    });
    const overdue = getOverdueTasks(db);
    expect(overdue).toHaveLength(1);
    expect(overdue[0].title).toBe("Overdue");
  });
});

describe("config queries", () => {
  test("getConfig returns default value", () => {
    const { getConfig } = require("../src/db.js");
    expect(getConfig(db, "daily_summary_hour")).toBe("9");
  });

  test("setConfig updates value", () => {
    const { getConfig, setConfig } = require("../src/db.js");
    setConfig(db, "daily_summary_hour", "10");
    expect(getConfig(db, "daily_summary_hour")).toBe("10");
  });
});
```

- [ ] **Step 4: Implement db.js**

Create `trello-accountability-bot/src/db.js`:

```js
import Database from "better-sqlite3";

export function createDb(path = "./data/bot.db") {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      skills TEXT DEFAULT '',
      inferred_skills TEXT DEFAULT '',
      trello_id TEXT,
      created_at DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      thread_id TEXT,
      created_by TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      required_skills TEXT DEFAULT '',
      assigned_to TEXT,
      status TEXT DEFAULT 'pending',
      sort_order INTEGER DEFAULT 0,
      due_date DATETIME,
      last_nudged_at DATETIME,
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (assigned_to) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS check_ins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      member_id TEXT NOT NULL,
      old_status TEXT NOT NULL,
      new_status TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    CREATE TABLE IF NOT EXISTS bot_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Insert default config values if they don't exist
  const insertConfig = db.prepare(
    "INSERT OR IGNORE INTO bot_config (key, value) VALUES (?, ?)"
  );
  const defaults = [
    ["daily_summary_hour", "9"],
    ["daily_summary_channel", ""],
    ["weekly_retro_day", "5"],
    ["nudge_interval_hours", "4"],
    ["timezone", "UTC"],
  ];
  for (const [key, value] of defaults) {
    insertConfig.run(key, value);
  }

  return db;
}

// --- Member queries ---

export function upsertMember(db, { id, username, skills }) {
  db.prepare(`
    INSERT INTO members (id, username, skills)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET username = excluded.username, skills = excluded.skills
  `).run(id, username, skills || "");
}

export function getMember(db, id) {
  return db.prepare("SELECT * FROM members WHERE id = ?").get(id);
}

export function getAllMembers(db) {
  return db.prepare("SELECT * FROM members").all();
}

export function setMemberTrelloId(db, id, trelloId) {
  db.prepare("UPDATE members SET trello_id = ? WHERE id = ?").run(trelloId, id);
}

export function setInferredSkills(db, id, inferredSkills) {
  db.prepare("UPDATE members SET inferred_skills = ? WHERE id = ?").run(inferredSkills, id);
}

// --- Project queries ---

export function createProject(db, { name, description, thread_id, created_by }) {
  const result = db.prepare(`
    INSERT INTO projects (name, description, thread_id, created_by)
    VALUES (?, ?, ?, ?)
  `).run(name, description, thread_id, created_by);
  return db.prepare("SELECT * FROM projects WHERE id = ?").get(result.lastInsertRowid);
}

export function getActiveProjects(db) {
  return db.prepare("SELECT * FROM projects WHERE status = 'active' ORDER BY created_at DESC").all();
}

export function getProject(db, id) {
  return db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
}

// --- Task queries ---

export function createTask(db, { project_id, title, description, required_skills, assigned_to, sort_order, due_date }) {
  const result = db.prepare(`
    INSERT INTO tasks (project_id, title, description, required_skills, assigned_to, sort_order, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(project_id, title, description || "", required_skills || "", assigned_to || null, sort_order || 0, due_date || null);
  return db.prepare("SELECT * FROM tasks WHERE id = ?").get(result.lastInsertRowid);
}

export function getTasksByProject(db, projectId) {
  return db.prepare("SELECT * FROM tasks WHERE project_id = ? ORDER BY sort_order").all(projectId);
}

export function getTasksByMember(db, memberId) {
  return db.prepare(
    "SELECT tasks.*, projects.name AS project_name FROM tasks JOIN projects ON tasks.project_id = projects.id WHERE assigned_to = ? AND tasks.status != 'done' ORDER BY sort_order"
  ).all(memberId);
}

export function getOverdueTasks(db) {
  return db.prepare(
    "SELECT tasks.*, projects.name AS project_name FROM tasks JOIN projects ON tasks.project_id = projects.id WHERE due_date < datetime('now') AND tasks.status NOT IN ('done', 'blocked') ORDER BY due_date"
  ).all();
}

export function getTasksDueWithin(db, hours) {
  return db.prepare(
    "SELECT tasks.*, projects.name AS project_name FROM tasks JOIN projects ON tasks.project_id = projects.id WHERE due_date BETWEEN datetime('now') AND datetime('now', '+' || ? || ' hours') AND tasks.status NOT IN ('done', 'blocked') ORDER BY due_date"
  ).all(hours);
}

export function updateTaskStatus(db, taskId, newStatus, memberId) {
  const task = db.prepare("SELECT status FROM tasks WHERE id = ?").get(taskId);
  if (!task) return null;
  const oldStatus = task.status;
  db.prepare("UPDATE tasks SET status = ? WHERE id = ?").run(newStatus, taskId);
  db.prepare(
    "INSERT INTO check_ins (task_id, member_id, old_status, new_status) VALUES (?, ?, ?, ?)"
  ).run(taskId, memberId, oldStatus, newStatus);
  return { oldStatus, newStatus };
}

export function updateTaskNudgedAt(db, taskId) {
  db.prepare("UPDATE tasks SET last_nudged_at = datetime('now') WHERE id = ?").run(taskId);
}

export function getActiveTaskCountByMember(db, memberId) {
  const row = db.prepare(
    "SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ? AND status IN ('pending', 'in-progress')"
  ).get(memberId);
  return row.count;
}

// --- Check-in queries ---

export function getCheckIns(db, taskId) {
  return db.prepare("SELECT * FROM check_ins WHERE task_id = ? ORDER BY created_at").all(taskId);
}

export function getCompletedTasksSince(db, since) {
  return db.prepare(
    "SELECT tasks.*, projects.name AS project_name FROM tasks JOIN projects ON tasks.project_id = projects.id JOIN check_ins ON check_ins.task_id = tasks.id WHERE check_ins.new_status = 'done' AND check_ins.created_at >= ? ORDER BY check_ins.created_at DESC"
  ).all(since);
}

// --- Config queries ---

export function getConfig(db, key) {
  const row = db.prepare("SELECT value FROM bot_config WHERE key = ?").get(key);
  return row ? row.value : null;
}

export function setConfig(db, key, value) {
  db.prepare("INSERT OR REPLACE INTO bot_config (key, value) VALUES (?, ?)").run(key, value);
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd trello-accountability-bot
bun test tests/db.test.js
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/db.js tests/db.test.js
git commit -m "feat: database layer with migrations and query helpers"
```

---

### Task 3: Skill Synonym Map

**Files:**
- Create: `trello-accountability-bot/src/utils/synonyms.js`
- Create: `trello-accountability-bot/tests/synonyms.test.js`

- [ ] **Step 1: Write failing test**

Create `trello-accountability-bot/tests/synonyms.test.js`:

```js
import { describe, test, expect } from "bun:test";
import { isFuzzyMatch, getSynonyms } from "../src/utils/synonyms.js";

describe("synonyms", () => {
  test("exact match returns true", () => {
    expect(isFuzzyMatch("javascript", "javascript")).toBe(true);
  });

  test("synonym match returns true", () => {
    expect(isFuzzyMatch("frontend", "css")).toBe(true);
    expect(isFuzzyMatch("frontend", "react")).toBe(true);
  });

  test("reverse synonym match returns true", () => {
    expect(isFuzzyMatch("css", "frontend")).toBe(true);
  });

  test("unrelated skills return false", () => {
    expect(isFuzzyMatch("python", "css")).toBe(false);
  });

  test("getSynonyms returns related skills", () => {
    const syns = getSynonyms("frontend");
    expect(syns).toContain("css");
    expect(syns).toContain("html");
    expect(syns).toContain("javascript");
  });

  test("getSynonyms returns empty array for unknown skill", () => {
    expect(getSynonyms("quantum-computing")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd trello-accountability-bot
bun test tests/synonyms.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement synonyms.js**

Create `trello-accountability-bot/src/utils/synonyms.js`:

```js
const SYNONYM_MAP = {
  frontend: ["css", "html", "javascript", "react", "vue", "angular", "tailwind", "ui"],
  backend: ["node", "express", "api", "rest", "graphql", "server", "bun", "python", "go"],
  design: ["ui", "ux", "figma", "css", "tailwind", "mockup", "wireframe"],
  devops: ["docker", "ci", "cd", "aws", "deployment", "infrastructure", "linux", "nginx"],
  database: ["sql", "sqlite", "postgres", "mongodb", "redis", "data-modeling"],
  mobile: ["react-native", "ios", "android", "flutter", "swift", "kotlin"],
  testing: ["jest", "vitest", "playwright", "cypress", "qa", "tdd"],
  marketing: ["seo", "analytics", "content", "copywriting", "social-media"],
  security: ["auth", "oauth", "encryption", "penetration-testing"],
};

// Build a reverse map for bidirectional lookup
const REVERSE_MAP = new Map();
for (const [group, skills] of Object.entries(SYNONYM_MAP)) {
  for (const skill of skills) {
    if (!REVERSE_MAP.has(skill)) REVERSE_MAP.set(skill, []);
    REVERSE_MAP.get(skill).push(group);
  }
}

export function getSynonyms(skill) {
  const lower = skill.toLowerCase();
  // Direct group lookup
  if (SYNONYM_MAP[lower]) return [...SYNONYM_MAP[lower]];
  // Reverse lookup: find groups this skill belongs to, return sibling skills
  const groups = REVERSE_MAP.get(lower) || [];
  const result = new Set();
  for (const group of groups) {
    result.add(group);
    for (const s of SYNONYM_MAP[group]) {
      if (s !== lower) result.add(s);
    }
  }
  return [...result];
}

export function isFuzzyMatch(skillA, skillB) {
  const a = skillA.toLowerCase();
  const b = skillB.toLowerCase();
  if (a === b) return true;
  const synsA = getSynonyms(a);
  return synsA.includes(b);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd trello-accountability-bot
bun test tests/synonyms.test.js
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/synonyms.js tests/synonyms.test.js
git commit -m "feat: skill synonym map for fuzzy matching"
```

---

### Task 4: Skill Matching Algorithm

**Files:**
- Create: `trello-accountability-bot/src/services/matcher.js`
- Create: `trello-accountability-bot/tests/matcher.test.js`

- [ ] **Step 1: Write failing test**

Create `trello-accountability-bot/tests/matcher.test.js`:

```js
import { describe, test, expect } from "bun:test";
import { scoreMember, assignTasks } from "../src/services/matcher.js";

const alice = {
  id: "alice",
  username: "Alice",
  skills: "javascript,css,react",
  inferred_skills: "html",
};

const bob = {
  id: "bob",
  username: "Bob",
  skills: "python,api,database",
  inferred_skills: "sql",
};

const charlie = {
  id: "charlie",
  username: "Charlie",
  skills: "design,figma,css",
  inferred_skills: "",
};

describe("scoreMember", () => {
  test("exact self-declared match scores +2 each", () => {
    const score = scoreMember(alice, ["javascript", "css"], 0);
    expect(score).toBe(4); // 2 + 2
  });

  test("exact inferred match scores +1 each", () => {
    const score = scoreMember(alice, ["html"], 0);
    expect(score).toBe(1);
  });

  test("fuzzy match scores +1", () => {
    // "frontend" is a synonym group containing "css" and "javascript"
    const score = scoreMember(alice, ["frontend"], 0);
    expect(score).toBeGreaterThanOrEqual(1);
  });

  test("active task load penalizes -1 each", () => {
    const score = scoreMember(alice, ["javascript"], 3);
    // +2 for javascript, -3 for load = -1
    expect(score).toBe(-1);
  });

  test("no matching skills scores 0 minus load", () => {
    const score = scoreMember(bob, ["css", "react"], 0);
    expect(score).toBe(0);
  });
});

describe("assignTasks", () => {
  const members = [alice, bob, charlie];

  test("assigns frontend task to alice", () => {
    const tasks = [
      { title: "Build UI", required_skills: ["javascript", "css"] },
    ];
    const loadMap = { alice: 0, bob: 0, charlie: 0 };
    const assignments = assignTasks(tasks, members, loadMap);
    expect(assignments[0].assigned_to).toBe("alice");
  });

  test("assigns backend task to bob", () => {
    const tasks = [
      { title: "Build API", required_skills: ["python", "api"] },
    ];
    const loadMap = { alice: 0, bob: 0, charlie: 0 };
    const assignments = assignTasks(tasks, members, loadMap);
    expect(assignments[0].assigned_to).toBe("bob");
  });

  test("assigns design task to charlie", () => {
    const tasks = [
      { title: "Design mockups", required_skills: ["design", "figma"] },
    ];
    const loadMap = { alice: 0, bob: 0, charlie: 0 };
    const assignments = assignTasks(tasks, members, loadMap);
    expect(assignments[0].assigned_to).toBe("charlie");
  });

  test("increases load after assignment to spread work", () => {
    const tasks = [
      { title: "Task 1", required_skills: ["css"] },
      { title: "Task 2", required_skills: ["css"] },
    ];
    const loadMap = { alice: 0, bob: 0, charlie: 0 };
    const assignments = assignTasks(tasks, members, loadMap);
    // Both alice and charlie have css. First goes to one, second may go to the other due to load penalty.
    const assignees = assignments.map((a) => a.assigned_to);
    expect(assignees).toContain("alice");
  });

  test("marks unassigned when no good match", () => {
    const tasks = [
      { title: "Quantum thing", required_skills: ["quantum-computing"] },
    ];
    const loadMap = { alice: 0, bob: 0, charlie: 0 };
    const assignments = assignTasks(tasks, members, loadMap);
    expect(assignments[0].assigned_to).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd trello-accountability-bot
bun test tests/matcher.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement matcher.js**

Create `trello-accountability-bot/src/services/matcher.js`:

```js
import { isFuzzyMatch } from "../utils/synonyms.js";

const SCORE_THRESHOLD = 1;

export function scoreMember(member, requiredSkills, activeTaskCount) {
  const selfSkills = (member.skills || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const inferredSkills = (member.inferred_skills || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

  let score = 0;

  for (const required of requiredSkills) {
    const req = required.toLowerCase();

    if (selfSkills.includes(req)) {
      score += 2;
      continue;
    }

    if (inferredSkills.includes(req)) {
      score += 1;
      continue;
    }

    // Fuzzy match against self-declared skills
    let fuzzyMatched = false;
    for (const skill of selfSkills) {
      if (isFuzzyMatch(req, skill)) {
        score += 1;
        fuzzyMatched = true;
        break;
      }
    }
    if (fuzzyMatched) continue;

    // Fuzzy match against inferred skills
    for (const skill of inferredSkills) {
      if (isFuzzyMatch(req, skill)) {
        score += 1;
        break;
      }
    }
  }

  score -= activeTaskCount;
  return score;
}

export function assignTasks(tasks, members, loadMap) {
  // Clone loadMap so we can increment as we assign
  const currentLoad = { ...loadMap };

  return tasks.map((task) => {
    let bestMember = null;
    let bestScore = -Infinity;

    for (const member of members) {
      const score = scoreMember(member, task.required_skills, currentLoad[member.id] || 0);
      if (score > bestScore) {
        bestScore = score;
        bestMember = member;
      }
    }

    if (bestScore >= SCORE_THRESHOLD && bestMember) {
      currentLoad[bestMember.id] = (currentLoad[bestMember.id] || 0) + 1;
      return { ...task, assigned_to: bestMember.id };
    }

    return { ...task, assigned_to: null };
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd trello-accountability-bot
bun test tests/matcher.test.js
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/matcher.js tests/matcher.test.js
git commit -m "feat: skill matching algorithm with fuzzy synonyms"
```

---

### Task 5: Claude Service (Project Breakdown)

**Files:**
- Create: `trello-accountability-bot/src/services/claude.js`
- Create: `trello-accountability-bot/tests/claude.test.js`

- [ ] **Step 1: Write failing test for response parsing**

Create `trello-accountability-bot/tests/claude.test.js`:

```js
import { describe, test, expect } from "bun:test";
import { parseBreakdownResponse } from "../src/services/claude.js";

describe("parseBreakdownResponse", () => {
  test("parses valid JSON response with tasks", () => {
    const response = JSON.stringify({
      project_name: "Landing Page",
      tasks: [
        {
          title: "Build signup form",
          description: "Create an email signup form with validation",
          required_skills: ["html", "css", "javascript"],
          effort_hours: 4,
          order: 1,
        },
        {
          title: "Set up analytics",
          description: "Integrate Google Analytics",
          required_skills: ["javascript", "analytics"],
          effort_hours: 2,
          order: 2,
        },
      ],
    });

    const result = parseBreakdownResponse(response);
    expect(result.project_name).toBe("Landing Page");
    expect(result.tasks).toHaveLength(2);
    expect(result.tasks[0].required_skills).toEqual(["html", "css", "javascript"]);
    expect(result.tasks[1].effort_hours).toBe(2);
  });

  test("handles JSON wrapped in markdown code block", () => {
    const response = '```json\n{"project_name":"Test","tasks":[{"title":"T","description":"D","required_skills":["a"],"effort_hours":1,"order":1}]}\n```';
    const result = parseBreakdownResponse(response);
    expect(result.project_name).toBe("Test");
    expect(result.tasks).toHaveLength(1);
  });

  test("throws on invalid JSON", () => {
    expect(() => parseBreakdownResponse("not json at all")).toThrow();
  });

  test("throws on missing tasks array", () => {
    expect(() => parseBreakdownResponse(JSON.stringify({ project_name: "X" }))).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd trello-accountability-bot
bun test tests/claude.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement claude.js**

Create `trello-accountability-bot/src/services/claude.js`:

```js
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are a project manager AI. When given a project description, break it down into discrete, actionable tasks.

Respond with ONLY valid JSON (no markdown, no explanation) in this format:
{
  "project_name": "Short project name",
  "tasks": [
    {
      "title": "Task title",
      "description": "What needs to be done",
      "required_skills": ["skill1", "skill2"],
      "effort_hours": 4,
      "order": 1
    }
  ]
}

Rules:
- Each task should be completable by one person
- Required skills should be lowercase, specific tags (e.g. "javascript", "css", "api", "design", "copywriting")
- Effort hours should be realistic estimates
- Order tasks by dependency — things that must happen first get lower order numbers
- Keep tasks granular: 2-8 hours each. Break larger work into multiple tasks.
- Include all necessary tasks: setup, implementation, testing, documentation`;

let client = null;

function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
  }
  return client;
}

export function parseBreakdownResponse(text) {
  // Strip markdown code block if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Failed to parse Claude response as JSON: ${e.message}`);
  }

  if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
    throw new Error("Claude response missing tasks array");
  }

  return parsed;
}

export async function breakdownProject(description) {
  const anthropic = getClient();

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Break down this project into tasks:\n\n${description}`,
      },
    ],
  });

  const responseText = message.content[0].text;
  return parseBreakdownResponse(responseText);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd trello-accountability-bot
bun test tests/claude.test.js
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/claude.js tests/claude.test.js
git commit -m "feat: Claude service for AI project breakdown"
```

---

### Task 6: Trello Service

**Files:**
- Create: `trello-accountability-bot/src/services/trello.js`

- [ ] **Step 1: Implement trello.js**

Create `trello-accountability-bot/src/services/trello.js`:

```js
const BASE_URL = "https://api.trello.com/1";

function getAuthParams() {
  return `key=${process.env.TRELLO_API_KEY}&token=${process.env.TRELLO_TOKEN}`;
}

export async function getMemberByUsername(username) {
  const res = await fetch(`${BASE_URL}/members/${username}?${getAuthParams()}`);
  if (!res.ok) throw new Error(`Trello API error: ${res.status} fetching member ${username}`);
  return res.json();
}

export async function getMemberCompletedActions(memberId) {
  const res = await fetch(
    `${BASE_URL}/members/${memberId}/actions?filter=updateCard:idList&limit=200&${getAuthParams()}`
  );
  if (!res.ok) throw new Error(`Trello API error: ${res.status} fetching actions for ${memberId}`);
  return res.json();
}

export function extractSkillsFromActions(actions) {
  const skills = new Set();

  for (const action of actions) {
    // Only count cards moved to lists whose name suggests completion
    const listAfter = action.data?.listAfter?.name?.toLowerCase() || "";
    if (!listAfter.includes("done") && !listAfter.includes("complete") && !listAfter.includes("finished")) {
      continue;
    }

    // Extract labels from the card
    const card = action.data?.card;
    if (!card) continue;

    // Labels come from the card data in the action
    if (card.labels) {
      for (const label of card.labels) {
        if (label.name) skills.add(label.name.toLowerCase());
      }
    }
  }

  return [...skills];
}

export async function syncMemberSkills(username) {
  const member = await getMemberByUsername(username);
  const actions = await getMemberCompletedActions(member.id);
  const skills = extractSkillsFromActions(actions);
  return { trelloId: member.id, inferredSkills: skills };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/trello.js
git commit -m "feat: Trello API client for member skill sync"
```

---

### Task 7: Discord Embed Builders

**Files:**
- Create: `trello-accountability-bot/src/utils/embeds.js`

- [ ] **Step 1: Implement embeds.js**

Create `trello-accountability-bot/src/utils/embeds.js`:

```js
import { EmbedBuilder } from "discord.js";

export function projectBreakdownEmbed(projectName, tasks) {
  const embed = new EmbedBuilder()
    .setTitle(`New Project: ${projectName}`)
    .setColor(0x5865f2)
    .setTimestamp();

  for (const task of tasks) {
    const assignee = task.assigned_to ? `<@${task.assigned_to}>` : "Unassigned";
    const skills = task.required_skills.join(", ");
    const due = task.due_date ? `Due: ${task.due_date}` : "";
    embed.addFields({
      name: `${task.sort_order}. ${task.title}`,
      value: `${task.description}\n**Assignee:** ${assignee}\n**Skills:** ${skills}\n${due}`.trim(),
    });
  }

  return embed;
}

export function taskListEmbed(title, tasks) {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(0x5865f2)
    .setTimestamp();

  if (tasks.length === 0) {
    embed.setDescription("No tasks found.");
    return embed;
  }

  for (const task of tasks) {
    const statusIcon = {
      pending: "⬜",
      "in-progress": "🔵",
      blocked: "🔴",
      done: "✅",
    }[task.status] || "⬜";

    embed.addFields({
      name: `${statusIcon} #${task.id}: ${task.title}`,
      value: `**Project:** ${task.project_name || "—"}\n**Status:** ${task.status}${task.due_date ? `\n**Due:** ${task.due_date}` : ""}`,
    });
  }

  return embed;
}

export function dailySummaryEmbed({ overdue, dueToday, completedYesterday }) {
  const embed = new EmbedBuilder()
    .setTitle("Daily Accountability Summary")
    .setColor(0xffa500)
    .setTimestamp();

  if (overdue.length > 0) {
    const lines = overdue.map((t) => `- **${t.title}** → <@${t.assigned_to}> (due ${t.due_date})`).join("\n");
    embed.addFields({ name: "🔴 Overdue", value: lines });
  }

  if (dueToday.length > 0) {
    const lines = dueToday.map((t) => `- **${t.title}** → <@${t.assigned_to}>`).join("\n");
    embed.addFields({ name: "🟡 Due Today", value: lines });
  }

  if (completedYesterday.length > 0) {
    const lines = completedYesterday.map((t) => `- **${t.title}** → <@${t.assigned_to}>`).join("\n");
    embed.addFields({ name: "✅ Completed Yesterday", value: lines });
  }

  if (overdue.length === 0 && dueToday.length === 0 && completedYesterday.length === 0) {
    embed.setDescription("Nothing to report. All clear!");
  }

  return embed;
}

export function weeklyRetroEmbed({ completed, open, memberStats, velocityChange }) {
  const embed = new EmbedBuilder()
    .setTitle("Weekly Retro")
    .setColor(0x2ecc71)
    .setTimestamp();

  embed.addFields({
    name: "Velocity",
    value: `${completed.length} tasks completed${velocityChange !== null ? ` (${velocityChange > 0 ? "+" : ""}${velocityChange} vs last week)` : ""}`,
  });

  if (completed.length > 0) {
    const lines = completed.slice(0, 10).map((t) => `- ${t.title} → <@${t.assigned_to}>`).join("\n");
    embed.addFields({ name: "✅ Completed", value: lines });
  }

  if (open.length > 0) {
    const lines = open.slice(0, 10).map((t) => `- ${t.title} → <@${t.assigned_to}>`).join("\n");
    embed.addFields({ name: "📋 Still Open", value: lines });
  }

  if (memberStats.noCompletions.length > 0) {
    const mentions = memberStats.noCompletions.map((id) => `<@${id}>`).join(", ");
    embed.addFields({ name: "👀 No completions this week", value: mentions });
  }

  return embed;
}

export function skillsEmbed(member) {
  const embed = new EmbedBuilder()
    .setTitle(`Skills: ${member.username}`)
    .setColor(0x5865f2);

  const selfSkills = member.skills || "None registered";
  const inferred = member.inferred_skills || "None (run /sync-trello)";

  embed.addFields(
    { name: "Self-Declared", value: selfSkills, inline: true },
    { name: "Trello-Inferred", value: inferred, inline: true }
  );

  return embed;
}

export function projectListEmbed(projects) {
  const embed = new EmbedBuilder()
    .setTitle("Active Projects")
    .setColor(0x5865f2)
    .setTimestamp();

  if (projects.length === 0) {
    embed.setDescription("No active projects.");
    return embed;
  }

  for (const p of projects) {
    embed.addFields({
      name: p.name,
      value: `Created by <@${p.created_by}> on ${p.created_at}\nThread: <#${p.thread_id}>`,
    });
  }

  return embed;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/embeds.js
git commit -m "feat: Discord embed builders for all bot views"
```

---

### Task 8: Slash Commands — /skills

**Files:**
- Create: `trello-accountability-bot/src/commands/skills.js`

- [ ] **Step 1: Implement skills.js**

Create `trello-accountability-bot/src/commands/skills.js`:

```js
import { SlashCommandBuilder } from "discord.js";
import { upsertMember, getMember, setMemberTrelloId } from "../db.js";
import { skillsEmbed } from "../utils/embeds.js";

export const data = new SlashCommandBuilder()
  .setName("skills")
  .setDescription("Manage your skill profile")
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Register your skills")
      .addStringOption((opt) =>
        opt.setName("skills").setDescription("Comma-separated skills (e.g. javascript, design, marketing)").setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("list")
      .setDescription("View skill profile")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("User to view (default: yourself)")
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("trello")
      .setDescription("Link your Trello account")
      .addStringOption((opt) =>
        opt.setName("username").setDescription("Your Trello username").setRequired(true)
      )
  );

export async function execute(interaction, db) {
  const sub = interaction.options.getSubcommand();

  if (sub === "add") {
    const skills = interaction.options.getString("skills");
    upsertMember(db, {
      id: interaction.user.id,
      username: interaction.user.displayName,
      skills,
    });
    await interaction.reply(`Skills updated: **${skills}**`);
  }

  if (sub === "list") {
    const target = interaction.options.getUser("user") || interaction.user;
    const member = getMember(db, target.id);
    if (!member) {
      await interaction.reply(`${target.displayName} hasn't registered any skills yet. Use \`/skills add\` to get started.`);
      return;
    }
    await interaction.reply({ embeds: [skillsEmbed(member)] });
  }

  if (sub === "trello") {
    const username = interaction.options.getString("username");
    // Ensure member exists
    const existing = getMember(db, interaction.user.id);
    if (!existing) {
      upsertMember(db, { id: interaction.user.id, username: interaction.user.displayName, skills: "" });
    }
    setMemberTrelloId(db, interaction.user.id, username);
    await interaction.reply(`Trello account linked: **${username}**. Run \`/sync-trello\` to import your skills.`);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/commands/skills.js
git commit -m "feat: /skills command (add, list, trello)"
```

---

### Task 9: Slash Commands — /newproject

**Files:**
- Create: `trello-accountability-bot/src/commands/newproject.js`

- [ ] **Step 1: Implement newproject.js**

Create `trello-accountability-bot/src/commands/newproject.js`:

```js
import { SlashCommandBuilder } from "discord.js";
import { breakdownProject } from "../services/claude.js";
import { assignTasks } from "../services/matcher.js";
import {
  getAllMembers,
  createProject,
  createTask,
  upsertMember,
  getActiveTaskCountByMember,
} from "../db.js";
import { projectBreakdownEmbed } from "../utils/embeds.js";

export const data = new SlashCommandBuilder()
  .setName("newproject")
  .setDescription("Start a new project — AI breaks it down and assigns tasks")
  .addStringOption((opt) =>
    opt.setName("description").setDescription("Describe the project in plain English").setRequired(true)
  );

export async function execute(interaction, db) {
  await interaction.deferReply();

  const description = interaction.options.getString("description");

  // Ensure the calling user is a member
  const callerId = interaction.user.id;
  const callerName = interaction.user.displayName;
  const existingMember = getAllMembers(db).find((m) => m.id === callerId);
  if (!existingMember) {
    upsertMember(db, { id: callerId, username: callerName, skills: "" });
  }

  // Get AI breakdown
  let breakdown;
  try {
    breakdown = await breakdownProject(description);
  } catch (err) {
    await interaction.editReply(`Failed to break down project: ${err.message}`);
    return;
  }

  // Create Discord thread for the project
  const thread = await interaction.channel.threads.create({
    name: breakdown.project_name.slice(0, 100),
    reason: `Project created by ${callerName}`,
  });

  // Save project to DB
  const project = createProject(db, {
    name: breakdown.project_name,
    description,
    thread_id: thread.id,
    created_by: callerId,
  });

  // Match tasks to members
  const members = getAllMembers(db);
  const loadMap = {};
  for (const m of members) {
    loadMap[m.id] = getActiveTaskCountByMember(db, m.id);
  }

  const assigned = assignTasks(breakdown.tasks, members, loadMap);

  // Calculate due dates from effort estimates (starting from now, sequential)
  let cumulativeHours = 0;
  const savedTasks = [];
  for (const task of assigned) {
    cumulativeHours += task.effort_hours || 4;
    const dueDate = new Date(Date.now() + cumulativeHours * 60 * 60 * 1000).toISOString();

    const saved = createTask(db, {
      project_id: project.id,
      title: task.title,
      description: task.description,
      required_skills: (task.required_skills || []).join(","),
      assigned_to: task.assigned_to,
      sort_order: task.order || 0,
      due_date: dueDate,
    });
    savedTasks.push({ ...saved, required_skills: task.required_skills || [] });
  }

  // Post embed to thread
  const embed = projectBreakdownEmbed(breakdown.project_name, savedTasks);
  await thread.send({ embeds: [embed] });

  await interaction.editReply(
    `Project **${breakdown.project_name}** created with ${savedTasks.length} tasks! See <#${thread.id}>`
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/commands/newproject.js
git commit -m "feat: /newproject command with AI breakdown and skill matching"
```

---

### Task 10: Slash Commands — /tasks, /status, /projects

**Files:**
- Create: `trello-accountability-bot/src/commands/tasks.js`
- Create: `trello-accountability-bot/src/commands/status.js`
- Create: `trello-accountability-bot/src/commands/projects.js`

- [ ] **Step 1: Implement tasks.js**

Create `trello-accountability-bot/src/commands/tasks.js`:

```js
import { SlashCommandBuilder } from "discord.js";
import { getTasksByMember } from "../db.js";
import { taskListEmbed } from "../utils/embeds.js";

export const data = new SlashCommandBuilder()
  .setName("tasks")
  .setDescription("View active tasks")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("User to view (default: yourself)")
  );

export async function execute(interaction, db) {
  const target = interaction.options.getUser("user") || interaction.user;
  const tasks = getTasksByMember(db, target.id);
  const embed = taskListEmbed(`Tasks for ${target.displayName}`, tasks);
  await interaction.reply({ embeds: [embed] });
}
```

- [ ] **Step 2: Implement status.js**

Create `trello-accountability-bot/src/commands/status.js`:

```js
import { SlashCommandBuilder } from "discord.js";
import { updateTaskStatus } from "../db.js";

const VALID_STATUSES = ["done", "blocked", "in-progress"];

export const data = new SlashCommandBuilder()
  .setName("status")
  .setDescription("Update a task's status")
  .addIntegerOption((opt) =>
    opt.setName("task_id").setDescription("Task ID number").setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName("new_status")
      .setDescription("New status")
      .setRequired(true)
      .addChoices(
        { name: "Done", value: "done" },
        { name: "In Progress", value: "in-progress" },
        { name: "Blocked", value: "blocked" }
      )
  );

export async function execute(interaction, db) {
  const taskId = interaction.options.getInteger("task_id");
  const newStatus = interaction.options.getString("new_status");

  const result = updateTaskStatus(db, taskId, newStatus, interaction.user.id);

  if (!result) {
    await interaction.reply({ content: `Task #${taskId} not found.`, ephemeral: true });
    return;
  }

  const emoji = { done: "✅", "in-progress": "🔵", blocked: "🔴" }[newStatus];
  await interaction.reply(`${emoji} Task #${taskId} updated: **${result.oldStatus}** → **${newStatus}**`);
}
```

- [ ] **Step 3: Implement projects.js**

Create `trello-accountability-bot/src/commands/projects.js`:

```js
import { SlashCommandBuilder } from "discord.js";
import { getActiveProjects } from "../db.js";
import { projectListEmbed } from "../utils/embeds.js";

export const data = new SlashCommandBuilder()
  .setName("projects")
  .setDescription("List all active projects");

export async function execute(interaction, db) {
  const projects = getActiveProjects(db);
  const embed = projectListEmbed(projects);
  await interaction.reply({ embeds: [embed] });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/commands/tasks.js src/commands/status.js src/commands/projects.js
git commit -m "feat: /tasks, /status, /projects commands"
```

---

### Task 11: Slash Commands — /sync-trello, /config

**Files:**
- Create: `trello-accountability-bot/src/commands/sync-trello.js`
- Create: `trello-accountability-bot/src/commands/config.js`

- [ ] **Step 1: Implement sync-trello.js**

Create `trello-accountability-bot/src/commands/sync-trello.js`:

```js
import { SlashCommandBuilder } from "discord.js";
import { getMember, setInferredSkills, setMemberTrelloId } from "../db.js";
import { syncMemberSkills } from "../services/trello.js";

export const data = new SlashCommandBuilder()
  .setName("sync-trello")
  .setDescription("Pull your completed Trello card history to enrich your skill profile");

export async function execute(interaction, db) {
  await interaction.deferReply();

  const member = getMember(db, interaction.user.id);
  if (!member || !member.trello_id) {
    await interaction.editReply(
      "You haven't linked your Trello account yet. Use `/skills trello <username>` first."
    );
    return;
  }

  try {
    const { trelloId, inferredSkills } = await syncMemberSkills(member.trello_id);
    setMemberTrelloId(db, interaction.user.id, trelloId);
    setInferredSkills(db, interaction.user.id, inferredSkills.join(","));

    if (inferredSkills.length === 0) {
      await interaction.editReply(
        "Synced with Trello, but no completed cards with labels were found. Make sure your Trello cards have labels and are moved to a 'Done' list."
      );
    } else {
      await interaction.editReply(
        `Synced! Inferred skills from Trello: **${inferredSkills.join(", ")}**`
      );
    }
  } catch (err) {
    await interaction.editReply(`Trello sync failed: ${err.message}`);
  }
}
```

- [ ] **Step 2: Implement config.js**

Create `trello-accountability-bot/src/commands/config.js`:

```js
import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { getConfig, setConfig } from "../db.js";

const VALID_KEYS = [
  "daily_summary_hour",
  "daily_summary_channel",
  "weekly_retro_day",
  "nudge_interval_hours",
  "timezone",
];

export const data = new SlashCommandBuilder()
  .setName("config")
  .setDescription("Configure bot settings (admin only)")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((opt) =>
    opt
      .setName("key")
      .setDescription("Setting to configure")
      .setRequired(true)
      .addChoices(
        { name: "Daily summary hour (UTC)", value: "daily_summary_hour" },
        { name: "Daily summary channel", value: "daily_summary_channel" },
        { name: "Weekly retro day (0=Sun, 5=Fri)", value: "weekly_retro_day" },
        { name: "Nudge interval (hours)", value: "nudge_interval_hours" },
        { name: "Timezone", value: "timezone" }
      )
  )
  .addStringOption((opt) =>
    opt.setName("value").setDescription("New value").setRequired(true)
  );

export async function execute(interaction, db) {
  const key = interaction.options.getString("key");
  const value = interaction.options.getString("value");

  // Special handling: if setting channel, accept the channel mention or current channel
  let finalValue = value;
  if (key === "daily_summary_channel") {
    // Accept raw channel ID or <#id> format
    const match = value.match(/^<#(\d+)>$/);
    finalValue = match ? match[1] : value;
  }

  setConfig(db, key, finalValue);
  await interaction.reply(`Config updated: **${key}** = \`${finalValue}\``);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/commands/sync-trello.js src/commands/config.js
git commit -m "feat: /sync-trello and /config commands"
```

---

### Task 12: Scheduler (Accountability Engine)

**Files:**
- Create: `trello-accountability-bot/src/services/scheduler.js`

- [ ] **Step 1: Implement scheduler.js**

Create `trello-accountability-bot/src/services/scheduler.js`:

```js
import {
  getConfig,
  getOverdueTasks,
  getTasksDueWithin,
  getCompletedTasksSince,
  getActiveProjects,
  getTasksByProject,
  updateTaskNudgedAt,
  getAllMembers,
} from "../db.js";
import { dailySummaryEmbed, weeklyRetroEmbed } from "../utils/embeds.js";

let dailyTimer = null;
let nudgeTimer = null;
let weeklyTimer = null;

export function startScheduler(client, db) {
  // Check every minute if it's time to run a scheduled job
  dailyTimer = setInterval(() => checkDailySummary(client, db), 60 * 1000);
  weeklyTimer = setInterval(() => checkWeeklyRetro(client, db), 60 * 1000);

  // Nudges run on their own interval
  const nudgeHours = parseInt(getConfig(db, "nudge_interval_hours") || "4", 10);
  nudgeTimer = setInterval(() => runNudges(client, db), nudgeHours * 60 * 60 * 1000);

  // Run nudges once on startup after a short delay
  setTimeout(() => runNudges(client, db), 10 * 1000);
}

export function stopScheduler() {
  if (dailyTimer) clearInterval(dailyTimer);
  if (nudgeTimer) clearInterval(nudgeTimer);
  if (weeklyTimer) clearInterval(weeklyTimer);
}

async function checkDailySummary(client, db) {
  const targetHour = parseInt(getConfig(db, "daily_summary_hour") || "9", 10);
  const now = new Date();
  if (now.getUTCHours() !== targetHour || now.getUTCMinutes() !== 0) return;

  const channelId = getConfig(db, "daily_summary_channel");
  if (!channelId) return;

  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  const overdue = getOverdueTasks(db);
  const dueToday = getTasksDueWithin(db, 24);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const completedYesterday = getCompletedTasksSince(db, yesterday);

  const embed = dailySummaryEmbed({ overdue, dueToday, completedYesterday });
  await channel.send({ embeds: [embed] });
}

async function runNudges(client, db) {
  // Get tasks due within 24h or overdue
  const overdue = getOverdueTasks(db);
  const dueSoon = getTasksDueWithin(db, 24);
  const allNudgeable = [...overdue, ...dueSoon];

  for (const task of allNudgeable) {
    if (!task.assigned_to) continue;

    // Skip if already nudged in last 24h
    if (task.last_nudged_at) {
      const lastNudge = new Date(task.last_nudged_at);
      const hoursSince = (Date.now() - lastNudge.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) continue;
    }

    try {
      const user = await client.users.fetch(task.assigned_to);
      const isOverdue = new Date(task.due_date) < new Date();
      const message = isOverdue
        ? `🔴 **${task.title}** (Project: ${task.project_name}) is overdue! Due was ${task.due_date}. Update with \`/status ${task.id} done\` or \`/status ${task.id} blocked\``
        : `⏰ **${task.title}** (Project: ${task.project_name}) is due within 24 hours (${task.due_date}). You've got this!`;

      await user.send(message);
      updateTaskNudgedAt(db, task.id);
    } catch (err) {
      // User may have DMs disabled — silently skip
    }
  }
}

async function checkWeeklyRetro(client, db) {
  const targetDay = parseInt(getConfig(db, "weekly_retro_day") || "5", 10);
  const now = new Date();
  if (now.getUTCDay() !== targetDay || now.getUTCHours() !== 9 || now.getUTCMinutes() !== 0) return;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const completedThisWeek = getCompletedTasksSince(db, weekAgo);
  const completedLastWeek = getCompletedTasksSince(db, twoWeeksAgo).filter(
    (t) => {
      const checkInDate = new Date(t.created_at);
      return checkInDate < new Date(weekAgo);
    }
  );

  const velocityChange = completedThisWeek.length - completedLastWeek.length;

  // Find members with no completions
  const allMembers = getAllMembers(db);
  const completedMemberIds = new Set(completedThisWeek.map((t) => t.assigned_to));
  const noCompletions = allMembers
    .filter((m) => !completedMemberIds.has(m.id))
    .map((m) => m.id);

  // Get all open tasks across active projects
  const activeProjects = getActiveProjects(db);
  const openTasks = [];
  for (const p of activeProjects) {
    const tasks = getTasksByProject(db, p.id);
    openTasks.push(...tasks.filter((t) => t.status !== "done"));
  }

  const embed = weeklyRetroEmbed({
    completed: completedThisWeek,
    open: openTasks,
    memberStats: { noCompletions },
    velocityChange,
  });

  // Post to each active project thread
  for (const project of activeProjects) {
    if (!project.thread_id) continue;
    try {
      const thread = await client.channels.fetch(project.thread_id);
      await thread.send({ embeds: [embed] });
    } catch (err) {
      // Thread may have been deleted
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/scheduler.js
git commit -m "feat: accountability scheduler (daily summary, nudges, weekly retro)"
```

---

### Task 13: Bot Entry Point

**Files:**
- Create: `trello-accountability-bot/src/index.js`

- [ ] **Step 1: Implement index.js**

Create `trello-accountability-bot/src/index.js`:

```js
import { Client, GatewayIntentBits, REST, Routes, Collection } from "discord.js";
import { createDb } from "./db.js";
import { startScheduler } from "./services/scheduler.js";

// Import all commands
import * as skills from "./commands/skills.js";
import * as newproject from "./commands/newproject.js";
import * as tasks from "./commands/tasks.js";
import * as status from "./commands/status.js";
import * as projects from "./commands/projects.js";
import * as syncTrello from "./commands/sync-trello.js";
import * as config from "./commands/config.js";

// --- Setup ---

const db = createDb();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

// Register commands in a collection for lookup
const commands = new Collection();
const commandModules = [skills, newproject, tasks, status, projects, syncTrello, config];
for (const mod of commandModules) {
  commands.set(mod.data.name, mod);
}

// --- Register slash commands with Discord ---

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
  const body = commandModules.map((mod) => mod.data.toJSON());

  await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
    body,
  });
  console.log(`Registered ${body.length} slash commands.`);
}

// --- Event handlers ---

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await registerCommands();
  startScheduler(client, db);
  console.log("Scheduler started.");
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, db);
  } catch (err) {
    console.error(`Error executing /${interaction.commandName}:`, err);
    const reply = { content: "Something went wrong executing that command.", ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

// --- Start ---

client.login(process.env.DISCORD_TOKEN);
```

- [ ] **Step 2: Create data directory**

```bash
cd trello-accountability-bot
mkdir -p data
```

- [ ] **Step 3: Verify the project runs without errors (needs .env)**

```bash
cd trello-accountability-bot
# Dry run — just check for import errors
bun --eval "import './src/db.js'; import './src/services/matcher.js'; import './src/utils/synonyms.js'; import './src/services/claude.js'; console.log('All imports OK')"
```

Expected: "All imports OK"

- [ ] **Step 4: Commit**

```bash
git add src/index.js
git commit -m "feat: bot entry point with command registration and scheduler"
```

---

### Task 14: Final Integration Test & Documentation

**Files:**
- Modify: `trello-accountability-bot/package.json` (verify scripts)
- Verify: all test files pass

- [ ] **Step 1: Run full test suite**

```bash
cd trello-accountability-bot
bun test
```

Expected: All tests pass.

- [ ] **Step 2: Verify .env.example is complete**

Read `trello-accountability-bot/.env.example` and confirm it contains all 5 env vars:
- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `CLAUDE_API_KEY`
- `TRELLO_API_KEY`
- `TRELLO_TOKEN`

- [ ] **Step 3: Final commit**

```bash
cd trello-accountability-bot
git add -A
git commit -m "chore: final integration verification"
```
