---
# ════════════════════ FACTORY CONFIG — rift-log ════════════════════
project:   rift-log
company:   ushinotan            # GitHub owner (no separate organization)
language:  ja                   # README, commits, issues and PRs are all Japanese

tracker:
  driver:   github
  repo:     ushinotan/rift-log
  status:                       # stage labels do not exist yet; the github driver creates them on first transition
    backlog:     { state: open }
    in_progress: { state: open, label: in-progress }
    qa_gate:     { state: open, label: ready-for-qa }
    in_qa:       { state: open, label: in-qa }
    done:        { state: closed }
  labels:
    approved:    approved       # not in the repo yet — create it
    upstream_bug: bug           # existing label

issue:    { prefix: "#", id_regex: '^#?(\d+)$' }

git:
  base_branch: origin/master    # origin/HEAD → master; PRs target master (stacked PRs may target a feature branch, e.g. #7)
  dev_base:    origin/master    # same as base_branch (no develop branch)
  protected:   [master]
  branch_prefix: { story: 'feature/', bug: 'bugfix/' }   # feature/* matches the existing branches (feature/death-map, ...)
  commit_format: '{type}{gitmoji}({scope}): {message}'   # confirmed — same as nikke_unionraid_bot; message in Japanese, e.g. "feat✨(web): デスマップを追加"
  remote: origin

workspace:
  root:   .
  layout: single                # one npm package: src/server (API + DB) and src/web (React) side by side
  repos:
    backend:  { path: . }       # code lives in src/server and src/cli
    frontend: { path: . }       # code lives in src/web

stack:
  backend:
    framework: "Node.js 22 + TypeScript (Vite dev-server middleware API, tsx CLIs)"   # vite.config.ts riftLogApi, package.json scripts
    orm:   Drizzle ORM          # drizzle-orm + drizzle-kit
    db:    SQLite (libSQL)      # @libsql/client, data/rift-log.db
    pkg:   npm
    test:  TBD                  # no evidence — no test runner or tests yet
    build: 'npm run typecheck'  # no build script; tsc --noEmit covers server, cli and web
  frontend:
    framework: "React 19 + Vite 8 (hash routing, no framework)"
    ui:    "plain CSS (src/web/styles.css, CSS custom properties) + Recharts 3"
    e2e:   TBD                  # no evidence — no cypress/playwright
    build: 'npm run typecheck'
  arch_notes_doc: docs/codebase/overview.md

env:
  app_url: http://localhost:5173   # vite.config.ts server.port, .claude/launch.json
  api_url: http://localhost:5173/api   # the API runs inside the Vite dev server

docker:
  compose:   TBD                # no docker — local app only
  ensure_up: false              # nothing to bring up; `npm run dev` starts the app
  run:       TBD                # no test command yet

evidence:
  mode_var: EVIDENCE_MODE
  slowmo_var: SLOW_MO
  slowmo: 500
  resolution: 1920x1080
  artifacts:
    videos:          TBD        # no E2E tool yet
    screenshots:     TBD        # no E2E tool yet
    backend_result:  TBD        # no test runner yet
    frontend_result: TBD        # no test runner yet

tests:
  dir: TBD                      # no tests yet
  layout:
    backend:  TBD
    frontend: TBD

docs_map:
  codebase:    docs/codebase
  conventions: docs/conventions

product:
  domain: "Personal League of Legends ranked solo/duo match log (JP server): import matches from the Riot API, per-match reviews and cross-match trend analysis"
  personas:
    - "プレイヤー本人（牛乃タン#SION）: 試合後にアプリで試合を見返し、傾向やデスの位置から次に直すことを決める"
    - "Claude Code（lol-review スキル）: npm run の CLI で試合を取り込み、データを読んで振り返りを書き、DB に保存する"
  competitors: ["OP.GG", "Mobalytics", "League of Graphs"]
  compliance:  ["Riot Games Developer API policy (API key must stay local, development key expires every 24h)"]

dev:
  developer_split: false        # one package and a small codebase; one developer handles server and web
  doc_sync_order:  after_self_test
  retries:         2
  commit: { by: doc_sync, push: mr }   # DEV opens a PR to master at the end

models:                         # omitted roles use the plugin defaults (CONTRACT.md "Models per role")
  dev.tech_lead: opus
  dev.code_reviewer: opus
  dev.developer: sonnet         # heavy tasks: pass --model dev.developer=opus
  qa.planner: opus
  qa.backend: sonnet
  qa.frontend: sonnet
  qa.runner: haiku
  po.blueprint: opus
  po.researcher: sonnet
  po.codemap: sonnet
  po.tasks: haiku
  cr.security: opus
---

# Project notes
- One npm package. `src/server/` is the data layer (Riot API, Data Dragon, ingest, queries) and the JSON API (`api.ts`, served as Vite dev-server middleware under `/api`). `src/cli/` are the `npm run` commands used by the `lol-review` skill. `src/web/` is the React app. There is no production build or deploy: the app only runs with `npm run dev`.
- Schema: edit `src/server/db/schema.ts`, then `npm run db:generate` to add a migration under `drizzle/`. Migrations are applied automatically by `openDb()` on the next start. Never hand-edit generated SQL or `drizzle/meta/`.
- Raw API responses are kept in `raw_matches`, so derived tables can be rebuilt without the API (`npm run sync -- --rebuild`). Changes to `ingest.ts` must keep that working.
- `.env` (Riot API key) and `data/` (SQLite DB, Data Dragon cache) are git-ignored and not copied into worktrees. Symlink `.env` from the main checkout, and point `RIFT_LOG_DB` at the main DB (or let a fresh one be created). The development API key expires every 24h: never type or guess a key; ask the human to regenerate it.
- There are no tests, no linter and no E2E tool yet. QA factory is deferred until a test runner is chosen. DEV self-test = `npm run typecheck` + starting `npm run dev` and loading the changed screen / `/api/*` endpoint.
- Names shown to the user (champions, items, runes, spells, skills) come from Data Dragon ja_JP. Don't hardcode English names.
- Status/approval labels (`in-progress`, `ready-for-qa`, `in-qa`, `approved`) do not exist yet in the repo.

# DEV review hardening (orchestrator instructions)
Carried over from nikke_unionraid_bot, where the factory review approved diffs that the PR review then rejected.
- **Stack reviewers after the factory code-review.** The `dev-code-reviewer` agent cannot spawn sub-agents, so the orchestrator does it. When the code-reviewer returns `APPROVED` or `APPROVED_WITH_NOTES`, run the reviewers from the user's CLAUDE.md on the uncommitted diff, in parallel: `typescript-reviewer` (`*.ts`), `react-reviewer` (`*.tsx`), `database-reviewer` (`src/server/db/`, `drizzle/`, `queries.ts`, `ingest.ts`, `deathmap.ts`), and `security-reviewer` when the task touches the Riot API key, `.env`, or the `/api` handler. Merge the findings into `{DIR}/code-review-{id}-{attempt}.md`. A critical or high finding counts as `REJECTED` (back to the developer, consumes a retry). Medium and low findings go into the final report as 🟡.
- **Narrowed scope.** When the tech-lead narrows the issue's acceptance criteria, ask the human before the developer starts. The PR body then says which criteria moved to which issue (see PR #4 "issue の仕様から変えた点").
