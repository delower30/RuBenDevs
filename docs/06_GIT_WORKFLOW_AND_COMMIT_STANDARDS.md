# Module 06: Git Workflow, Branching Strategy & Commit Standards

**Project:** Dhaka Tesla Pool  
**Author:** Software Architect & Principal Engineer  
**Evaluation Weight:** High (PRD §10, §11, §15 - "Process & Traceability")  

---

## 1. Branching Topology & Lifecycle

The PRD explicitly mandates:
> *"The repository needs long-lived branches `master`, `pre-release`, and `release/<version>`, plus `feature/*` branches for actual feature work... We inspect the history: a perfect final repo with a meaningless history is weaker than a good repo showing a real engineering journey."*

```mermaid
gitGraph
    commit id: "chore: initial repo structure"
    commit id: "docs: add comprehensive PRD breakdown & specs"
    branch feature/docker-db-setup
    checkout feature/docker-db-setup
    commit id: "build(docker): add compose for api and postgres"
    commit id: "feat(db): add schema migrations and check constraints"
    commit id: "feat(db): seed canonical story cast (Jashim, Bullet, Nusrat)"
    checkout master
    merge feature/docker-db-setup
    branch feature/passenger-auth-booking
    checkout feature/passenger-auth-booking
    commit id: "feat(auth): implement jwt auth and role guards"
    commit id: "feat(rides): add ride request and fare estimator"
    checkout master
    merge feature/passenger-auth-booking
    branch feature/tesla-pooling-concurrency
    checkout feature/tesla-pooling-concurrency
    commit id: "feat(pool): enforce Bullet seat capacity with row locks"
    commit id: "feat(pool): implement Dhaka zone matching algorithm"
    commit id: "test(concurrency): verify last seat race condition defense"
    checkout master
    merge feature/tesla-pooling-concurrency
    branch feature/driver-telemetry-hud
    checkout feature/driver-telemetry-hud
    commit id: "feat(driver): add dispatch console and FSM transitions"
    commit id: "feat(ui): add 90fps functional semantic color telemetry"
    checkout master
    merge feature/driver-telemetry-hud
    branch pre-release
    checkout pre-release
    commit id: "docs: finalize architecture diagrams, ERD and test reports"
    commit id: "test(e2e): verify end-to-end Nusrat and Rafiq ride split"
    branch release/v1.0.0
    checkout release/v1.0.0
    commit id: "chore(release): tag v1.0.0 candidate for evaluation and video"
```

---

## 2. Conventional Commit Standards (PRD §11)

### Commit Syntax
Every single commit in the repository must adhere strictly to the format:
```
<type>(<scope>): <short description>
```

### Approved Commit Types
| Type | Purpose | Permitted Example |
|---|---|---|
| `feat` | Adding a new functional capability | `feat(pool): enforce Bullet's 3-seat capacity limit` |
| `fix` | Correcting a defect or broken invariant | `fix(pool): prevent overbooking available seats under race condition` |
| `refactor` | Code change that neither fixes a bug nor adds a feature | `refactor(fare): convert decimal arithmetic to 64-bit integer poysha` |
| `test` | Adding or correcting automated tests | `test(concurrency): simulate Shirin and Tania competing for last seat` |
| `docs` | Documentation updates | `docs(architecture): add mermaid ERD and Dhaka zone distance matrix` |
| `build` | Changes to build configuration or Docker setup | `build(docker): configure multi-stage build and postgres healthcheck` |
| `chore` | Maintenance tasks, dependencies, formatting | `chore(deps): update fastify and prisma client packages` |

### Explicit Anti-Patterns ("Git Theatre" to Avoid)
The PRD disqualifies repos with fake, chaotic, or lazy commit histories:
- ❌ **Forbidden messages:** `changes`, `fix`, `fixed bug`, `asdf`, `final`, `latest`, `working now`, `commit 1`.
- ❌ **Forbidden practice:** Submitting a single giant initial commit with the entire application pre-built.
- ❌ **Forbidden practice:** Pushing all changes directly to `master` without feature branches.
- ❌ **Forbidden practice:** 50 micro-commits fixing trivial typos just to inflate commit count.

---

## 3. Step-by-Step Git Command Plan for Implementation

When building the software, execute this sequence verbatim to guarantee a pristine, audit-ready Git history:

### Step 1: Base Repository Initialization
```bash
git init
git checkout -b master
git add .
git commit -m "chore(repo): initialize workspace and documentation specifications"
```

### Step 2: Database & Docker Feature Branch
```bash
git checkout -b feature/docker-db-setup
# [Implement Dockerfile, docker-compose.yml, schema.sql]
git add docker-compose.yml backend/Dockerfile .env.example
git commit -m "build(docker): add compose setup for api and postgres"

# [Implement migrations and seed.ts with Jashim, Bullet, Nusrat, Rafiq, Shirin]
git add backend/prisma/
git commit -m "feat(db): add relational schema migrations with check constraints"
git commit -m "feat(db): seed canonical story cast using Jashim and Bullet"

# Merge to master
git checkout master
git merge --no-ff feature/docker-db-setup -m "merge: feature/docker-db-setup into master"
```

### Step 3: Passenger Auth & Booking Feature Branch
```bash
git checkout -b feature/passenger-auth-booking
# [Implement JWT auth, role validation, ride booking endpoints]
git add backend/src/auth/
git commit -m "feat(auth): add passenger and driver jwt authentication"

git add backend/src/rides/
git commit -m "feat(rides): add ride request endpoint with integer poysha fare calculation"

# Merge to master
git checkout master
git merge --no-ff feature/passenger-auth-booking -m "merge: feature/passenger-auth-booking into master"
```

### Step 4: Tesla Pooling Engine & Concurrency Feature Branch
```bash
git checkout -b feature/tesla-pooling-concurrency
# [Implement Dhaka zone lookup, route matcher, SELECT FOR UPDATE lock]
git add backend/src/pooling/
git commit -m "feat(pool): implement Dhaka zone matching for Banani routes"
git commit -m "feat(pool): enforce Bullet seat capacity using row level locks"

git add backend/tests/concurrency.test.ts
git commit -m "test(concurrency): add automated test for concurrent seat allocation"

# Merge to master
git checkout master
git merge --no-ff feature/tesla-pooling-concurrency -m "merge: feature/tesla-pooling-concurrency into master"
```

### Step 5: Driver HUD & Frontend Telemetry Feature Branch
```bash
git checkout -b feature/driver-telemetry-hud
# [Implement Next.js driver console, seat map, functional color palette]
git add frontend/src/components/
git commit -m "feat(ui): implement 90fps seat manifest HUD with functional color tokens"
git commit -m "feat(driver): add online toggle and ride lifecycle transition controls"

# Merge to master
git checkout master
git merge --no-ff feature/driver-telemetry-hud -m "merge: feature/driver-telemetry-hud into master"
```

### Step 6: Integration, Pre-Release & Release v1.0.0
```bash
git checkout -b pre-release
# [Integration test run, documentation finalization, environment check]
git add docs/ README.md
git commit -m "docs: finalize architecture, testing matrix and evaluator instructions"
git commit -m "test(e2e): verify complete Nusrat and Rafiq pooling lifecycle"

# Cut final release branch
git checkout -b release/v1.0.0
git commit -m "chore(release): prepare v1.0.0 release candidate for evaluation"
```
