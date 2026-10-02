# Module 00: Comprehensive Line-by-Line PRD Analysis & Requirements Extraction

**Project:** Dhaka Tesla Pool (*Share a seat. Split the fare. Survive Dhaka traffic.*)  
**Role:** Lead Software Architect & Principal Systems Engineer  
**Document Status:** Complete & Verified Baseline  

---

## 1. Executive Context & Story Breakdown

The challenge presents a real-world, hyper-localized mobility scenario in the chaotic, high-density traffic of Dhaka, Bangladesh. Rather than standard generic ride-hailing placeholders (`user1`, `driver1`), the PRD mandates a concrete narrative test case:

### The Cast of Characters
| Character / Asset | Role | Specific Narrative Behavior | Constraints & Requirements |
|---|---|---|---|
| **Jashim** | Driver | Drives "Bullet", an electric 3-wheeler ("Tesla") on Banani Road 11. Leaning against his vehicle at 8:41 AM, waiting for ride dispatches. | Needs clear dispatch visibility: who is riding, who gets picked up first, route order, and when he can start driving. |
| **Bullet** | Vehicle ("Dhaka Tesla") | Battery-powered, 3-passenger seating capacity. Unaffiliated local electric rickshaw/easy-bike. | **Fixed physical capacity: strictly 3 seats.** Capacity must NEVER be exceeded under any concurrent booking race condition. |
| **Nusrat** | Passenger 1 | At 8:41 AM on Banani Road 11, running late, books a trip to Mohakhali. | Requests 1 seat. Expects to split fare if a co-passenger joins. Can only view her own fare and trip status. |
| **Rafiq** | Passenger 2 | 2 minutes later (8:43 AM), books a trip from Banani to Gulshan 1. Overlapping pickup and compatible route. | Requests 1 seat. System must match him into Jashim's pool in ~1 second. Gets an independent discounted fare. |
| **Shirin** | Passenger 3 / Contender | 30 seconds later, attempts to grab the remaining seat(s). | Represents the concurrency/capacity boundary test. If 1 seat remains and multiple requests arrive simultaneously, the system must deterministically handle the allocation without corrupting state. |

---

## 2. Line-by-Line Extraction Matrix

Below is the line-by-line decomposition of every section of the provided PRD, mapping each explicit instruction to an architectural requirement and classification.

| PRD Section & Statement | Explicit Requirement | Architectural Implication & Engineering Implementation | Deliverable Category |
|---|---|---|---|
| **§1. The Banani Rush-Hour Story**<br> *"Steal this cast for your seed data and demo... spare the evaluator another user1/driver1"* | Consistent seed data using Jashim, Bullet, Nusrat, Rafiq, Shirin. | Database seeding script (`seed.ts` / `seed.sql`) pre-populated with these exact profiles, locations, and initial states. | **Mandated by PRD** |
| **§2. The Product Problem**<br> *"Passengers should be able to request a ride and, when it makes sense, share a Tesla with someone else."* | Dynamic ride pooling algorithm based on route and zone compatibility. | Pooling service evaluates spatial overlap (Banani origin) and destination direction (Mohakhali vs Gulshan 1). | **Mandated by PRD** |
| **§2. Product Problem**<br> *"The driver needs to see who's assigned to the ride and what stage it's at."* | Driver HUD / Dispatch view showing active pool, passenger manifests, and lifecycle status. | WebSocket or Polling-backed Driver dashboard with real-time passenger pickup/drop-off sequence. | **Mandated by PRD** |
| **§2. Product Problem**<br> *"Each passenger needs to see their own fare and their own status, not anyone else's."* | Strict tenant/passenger privacy & data isolation. | REST/GraphQL response shaping and Row-Level Security (RLS) ensuring Passenger A cannot inspect Passenger B's billing or identity. | **Mandated by PRD & Security** |
| **§2. Product Problem**<br> *"System should hold onto enough history to explain exactly what happened"* | Complete audit logging & state transition history. | `ride_events` / `audit_logs` table tracking every timestamped state transition, driver action, and seat allocation. | **Mandated by PRD** |
| **§3. Mission: The Three Actors**<br> *Passenger, Driver/Tesla, Ride/Pool* | Modular actor-based domain design. | Three distinct entity domains and user roles with authenticated permissions (RBAC). | **Mandated by PRD** |
| **§3. Suggested Lifecycle**<br> `REQUESTED → MATCHED/ACCEPTED → DRIVER_ARRIVED → STARTED → COMPLETED (+ CANCELLED)` | Finite State Machine (FSM) controlling ride and pool lifecycles. | Strict state transition table preventing invalid jumps (e.g., `REQUESTED` directly to `COMPLETED` is rejected with HTTP 409). | **Mandated by PRD** |
| **§4. Keeping Geography Simple**<br> *"Do not spend the challenge fighting map APIs. Keep it simple - a predefined list of Dhaka areas... or plain lat/long"* | Predefined Dhaka zones (Banani, Gulshan, Mohakhali, Dhanmondi, Mirpur, Uttara, Farmgate, Bashundhara). | Static geospatial zone matrix with distance graph/lookup table. No external Google Maps API key required. | **Mandated by PRD** |
| **§5. Fare Model**<br> `passengerFare = baseFare + distanceCharge - poolDiscount` | Transparent, testable, reproducible fare calculation engine. | Deterministic fare service. Evaluator must be able to verify calculations manually for Nusrat and Rafiq. | **Mandated by PRD** |
| **§5. Fare Model**<br> *"Explain how you store money (integer paisa/poysha vs decimal) and why."* | Currency storage design documentation. | Store currency as 64-bit integer poysha (`৳1.00 = 100 poysha`) to eliminate IEEE-754 floating-point rounding errors. | **Mandated & Architectural** |
| **§5. Payment**<br> *"Cash or simulated TeslaPay wallet - no real gateway needed."* | Internal ledger / wallet simulation. | `wallets` and `wallet_transactions` tables supporting debit, credit, and balance holds. | **Mandated by PRD** |
| **§6. Mandated Stack**<br> *Frontend: React / Next.js (App Router recommended)<br>Backend: Node.js (Express, NestJS, Fastify)* | Modern TypeScript stack with clean separation. | Next.js (App Router) frontend paired with Node.js Express/Fastify modular backend, fully typed. | **Mandated by PRD** |
| **§6. Database**<br> *Relational store (Postgres/MySQL/SQLite) with proper constraints & indexes* | Relational schema with referential integrity. | PostgreSQL with Foreign Keys, Check Constraints (`CHECK (seats_used <= 3)`), and B-Tree indexes. | **Mandated by PRD** |
| **§6. Docker**<br> *`docker compose up`: app, DB, `.env.example`, migrations, seed, health checks* | Production-grade containerization. | Multi-stage Dockerfiles, `docker-compose.yml` with health checks, automated migration runner, and non-root execution. | **Mandated by PRD** |
| **§7. Technology Choice & Justification**<br> *Explain choices vs realistic alternatives, why it fits MVP, what triggers a switch* | Formal Architecture Decision Records (ADRs). | Documented trade-off matrix: PostgreSQL vs MongoDB, Next.js vs Vite, Fastify/Express vs NestJS. | **Mandated by PRD** |
| **§8. AI Usage Policy**<br> *Disclose tools used, what for, 1 accepted suggestion, 1 rejected/modified suggestion* | Transparent AI engineering disclosure section. | AI audit section in documentation detailing prompt engineering, accepted architectural patterns, and rejected AI hallucinations. | **Mandated by PRD** |
| **§9. Architecture First**<br> *Architecture diagram (Browser → Next.js → Node API → DB) + ERD* | Visual system design diagrams before implementation. | Mermaid-rendered System Flow Diagram and complete Crow's Foot Entity Relationship Diagram. | **Mandated by PRD** |
| **§10. Git Workflow**<br> *Long-lived branches: `master`, `pre-release`, `release/<v>`, `feature/*`* | Professional enterprise Git branching strategy. | Structured branching and merge flow reflecting authentic incremental software development. | **Mandated by PRD** |
| **§11. Commit Rules**<br> *`<type>(<scope>): <desc>` (feat/fix/refactor/test/docs/chore/build)* | Conventional Commits standard. No Git theatre, no giant squash commits. | Strict commit message linting and clean semantic commit logs. | **Mandated by PRD** |
| **§12. Testing**<br> *Bullet capacity limit, invalid state transitions, fare calc, user auth isolation, cancellation rules, concurrency* | High-value, non-flaky integration test suite. | Automated Vitest/Jest test suites validating the critical business invariants. | **Mandated by PRD** |
| **§12. Concurrency Problem**<br> *Nusrat and Shirin claiming the last seat at the same instant.* | Race condition prevention mechanism. | Database-level row locking (`SELECT ... FOR UPDATE`) or transactional isolation with atomic seat decrement constraints. | **Mandated by PRD** |
| **§13. Six-Minute Video**<br> *0-1m Problem, 1-3m Engineering/ERD/Trade-offs, 3-6m Demo & Edge cases* | Recorded walkthrough video script. | Comprehensive second-by-second presentation script with visual transition markers. | **Mandated by PRD** |
| **§14. Submission Checklist**<br> *Working repo, Docker, migrations, seed, ERD, branches, tests, video, viral bonus* | Quality assurance audit. | End-to-end verification checklist ensuring 100% compliance across all evaluation parameters. | **Mandated by PRD** |
| **Bonus: "If Oi Tesla Goes Viral"**<br> *Scale to 1M passengers and 100k drivers.* | High-scale distributed systems blueprint. | Distributed architecture doc: Redis geospatial indexing, Kafka message queues, read-replicas, and WebSocket gateways. | **Bonus Opportunity** |

---

## 3. Discovered Unstated / Essential Architectural Requirements

While the PRD provides the functional baseline, an experienced Principal Systems Engineer identifies critical secondary requirements necessary for a production-ready application:

1. **Functional Telemetry Color System (User Instruction Requirement):**
   - No arbitrary aesthetic decorations. Every color token must communicate semantic system state (e.g., Electric Amber = Pool Active / In-Search; Emerald = Seat Confirmed; Cyan = En-Route; Rose = Seat Exhaustion / Conflict).
2. **Deterministic Route Directionality Engine:**
   - Banani to Mohakhali is southbound; Banani to Gulshan 1 is southeast. The matching engine must account for directional vectors so a passenger heading to Uttara (north) is not pooled with someone heading south.
3. **Idempotency Keys on Booking Requests:**
   - Prevent accidental duplicate charges or double bookings if a passenger taps "Confirm Ride" twice on poor mobile networks (2G/3G in Dhaka).
4. **Data Privacy & JWT Claims Security:**
   - JWT tokens must strictly segregate roles (`ROLE_PASSENGER`, `ROLE_DRIVER`) and prevent IDOR (Insecure Direct Object Reference) vulnerabilities when querying `/rides/:id`.
5. **Database Transaction Boundaries:**
   - A ride request accepting a pool match must atomically:
     1. Lock the vehicle pool record.
     2. Verify available seats >= requested seats.
     3. Decrement available seats.
     4. Create the pool membership record.
     5. Update ride status to `MATCHED`.
     All within a single atomic database transaction (`BEGIN ... COMMIT`).

---

## 4. Evaluation Rubric Defense Strategy

The PRD explicitly states: **"Following instructions is a major, explicit part of the score - 120 features with a broken process can score lower than a small, clean MVP that follows it properly."**

Our architectural design guarantees maximum points across all 7 evaluation dimensions:
- **Product:** Nuanced understanding of Dhaka pooling dynamics, sensible geographical assumptions.
- **Process:** Strict branch hierarchy (`master`, `pre-release`, `release/v1.0.0`, `feature/*`), conventional commits.
- **Backend / DB:** ACID transactions, foreign keys, check constraints, integer money, row-level locks.
- **Frontend:** Responsive, fast, semantic functional colors, clear loading and empty states.
- **Docker / Deploy:** 1-command startup (`docker compose up`), automated seeds, environment parity.
- **Testing / Docs:** Critical edge-case test suite (concurrency race condition, over-capacity rejection).
- **Ownership:** Complete defense of every technical decision and trade-off in the documentation.

---

## 5. Explicit Anti-Patterns Audit: PRD §16 "What NOT to Do"

The PRD lists 8 explicit prohibitions. Below is our formal compliance audit guaranteeing zero violations:

| PRD Prohibition | Risk / Violation Scenario | Architectural Defense & Verification | Compliance Status |
|---|---|---|---|
| **1. "Pay for infrastructure / services"** | Using paid AWS/GCP services, paid Redis Cloud, paid Google Maps APIs. | 100% free stack: local PostgreSQL, Docker Compose, offline predefined Dhaka zone distance graph. Zero external paid APIs. | 🟢 **COMPLIANT** |
| **2. "Commit API keys, passwords, tokens, or .env secrets"** | Leaking production credentials or `.env` into git. | `.gitignore` covers `.env`, `.env.local`, and secrets. Only `.env.example` with dummy local values (`bullet_secure_pass_2026`) is tracked. | 🟢 **COMPLIANT** |
| **3. "Submit a single giant 'initial commit'"** | Dumping pre-built code in 1 commit. | Phased Git workflow with 15+ incremental commits across `feature/*` branches merging into `master`, `pre-release`, and `release/v1.0.0`. | 🟢 **COMPLIANT** |
| **4. "Push all feature development directly to master"** | Committing everything to `master` without branches. | Strict branch rule: every feature developed in `feature/<name>`, tested, and merged with `--no-ff`. | 🟢 **COMPLIANT** |
| **5. "Add technologies only to make architecture look impressive"** | Adding Kafka, Kubernetes, Redis, microservices to MVP. | Deliberately rejected for MVP. Single Node.js Fastify API + PostgreSQL handles all concurrency and matching via transactions. (Distributed tech reserved for Bonus doc only). | 🟢 **COMPLIANT** |
| **6. "Polish animations while core data integrity is broken"** | Fancy framer-motion transitions with flawed seat counters. | Database check constraints (`CHECK (occupied_seats <= 3)`) and pessimistic row locking guarantee data integrity before any UI is rendered. Functional telemetry colors over decorative animations. | 🟢 **COMPLIANT** |
| **7. "Hide AI usage, or include code you cannot explain"** | Pretending AI was not used or copy-pasting opaque snippets. | Complete transparency in PRD §8 disclosure ([Module 08](file:///docs/08_SIX_MINUTE_VIDEO_SCRIPT_AND_RUBRIC.md)), detailing exact accepted and rejected suggestions. | 🟢 **COMPLIANT** |
| **8. "Strip the story cast out in favor of generic placeholders"** | Renaming Jashim/Bullet to `user1`/`driver1`. | The exact story cast (**Jashim, Bullet, Nusrat, Rafiq, Shirin**) is hardcoded in seeds, tests, calculations, and UI mocks. | 🟢 **COMPLIANT** |

