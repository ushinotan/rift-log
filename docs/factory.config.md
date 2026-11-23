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
    review_gate:     { state: open, label: ready-for-review }    # CR entry — DISTINCT from in_review
    in_review:       { state: open, label: in-review }
    review_approved: { state: open, label: review-approved }     # the issue closes when the PR (with "Closes #n") is merged
    review_returned: { state: open, label: changes-requested }
  labels:
    approved:    approved       # not in the repo yet — create it
    upstream_bug: bug           # existing label

issue:    { prefix: "#", id_regex: '^#?(\d+)$' }

scm:
  driver:    github
  repos:                        # single repo: both keys point to the same repository
    backend:  ushinotan/rift-log
    frontend: ushinotan/rift-log
  mr_target: master
  branch_convention: 'feature/{id}'   # branches made by /factory:dev ({git.branch_prefix.story}{id}); hand-made branches (feature/death-map) are found by the "Closes #n" link instead

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
- `node_modules` is not shared between the main checkout and worktrees. Run `npm ci` in the checkout before the DEV pipeline starts (and again before self-test if `package-lock.json` changed); otherwise `npm run typecheck` fails because `tsc` is missing.
- Names shown to the user (champions, items, runes, spells, skills) come from Data Dragon ja_JP. Don't hardcode English names.
- Status/approval labels (`in-progress`, `ready-for-qa`, `in-qa`, `ready-for-review`, `in-review`, `review-approved`, `changes-requested`, `approved`) do not exist yet in the repo.
- QA is deferred, so nothing moves an issue to `review_gate` automatically. After `/factory:dev` hands off (`ready-for-qa`), add the `ready-for-review` label by hand before `/factory:cr`, or let CR warn and confirm.
- PR bodies follow `.github/pull_request_template.md` (or `PULL_REQUEST_TEMPLATE/feature.md` / `bugfix.md`). Always put `Closes #<id>` at the top so the github driver can link the PR to the issue.

# DEV review hardening (orchestrator instructions)
Carried over from nikke_unionraid_bot, where the factory review approved diffs that the PR review then rejected.
- **Stack reviewers after the factory code-review.** The `dev-code-reviewer` agent cannot spawn sub-agents, so the orchestrator does it. When the code-reviewer returns `APPROVED` or `APPROVED_WITH_NOTES`, run the reviewers from the user's CLAUDE.md on the uncommitted diff, in parallel: `typescript-reviewer` (`*.ts`), `react-reviewer` (`*.tsx`), `database-reviewer` (`src/server/db/`, `drizzle/`, `queries.ts`, `ingest.ts`, `deathmap.ts`), and `security-reviewer` when the task touches the Riot API key, `.env`, or the `/api` handler. Merge the findings into `{DIR}/code-review-{id}-{attempt}.md`. A critical or high finding counts as `REJECTED` (back to the developer, consumes a retry). Medium and low findings go into the final report as 🟡.
- **Narrowed scope.** When the tech-lead narrows the issue's acceptance criteria, ask the human before the developer starts. The PR body then says which criteria moved to which issue (see PR #4 "issue の仕様から変えた点").

# CR review hardening (orchestrator instructions)
- **Stack reviewers in addition to the CR workers.** Alongside `cr-reviewer` and `cr-security`, run the same stack reviewers as in DEV on the PR diff (`gh pr diff`), in parallel. Merge and deduplicate the findings; when labels disagree, keep the higher one.
- **Report format.** Show the findings to the human in Japanese, ordered `[MUST]` → `[SHOULD]` → `[IMO]` (🔴 → `[MUST]`, 🟡 → `[SHOULD]`, 🟢/📄 → `[IMO]`), each with a short summary for humans and a collapsed "🤖 AI対応用プロンプト". End with what was good.
- **Posting on the PR.** Instead of a single `gh pr comment` (SCM op S4), post one review with `gh api repos/ushinotan/rift-log/pulls/{n}/reviews` and `event: "COMMENT"`: each finding goes into `comments[]` (`path`, `line`, `start_line` for ranges, `side: "RIGHT"`, `body`). The overall verdict, counts per label, good points and findings on lines outside the diff go into the review `body`. The tracker comment (on the issue) stays a normal summary.
