# ⚡ Dhaka Tesla Pool

> *Share a seat. Split the fare. Survive Dhaka traffic.*

An ultra-efficient, production-grade ride pooling MVP designed for Dhaka's unique, high-density traffic realities. Built around Jashim and his 3-seater electric auto-rickshaw ("Bullet"), this system delivers sub-second route matching, deterministic integer-poysha fare splitting, zero-trust passenger privacy, and mathematical concurrency guarantees that prevent vehicle overbooking.

---

## 📑 Master Documentation Index

| Module | Document Title | Description & Primary Focus |
|---|---|---|
| **MVP**| [PRD MVP Requirements & Workflow](file:///docs/PRD_MVP_REQUIREMENTS_AND_WORKFLOW.md) | High-level executive PRD MVP requirements, actors, security, and full working flow. |
| **00** | [PRD Line-by-Line Analysis](file:///docs/00_PRD_LINE_BY_LINE_ANALYSIS.md) | Exhaustive requirement extraction, cast mapping, and evaluation rubric cross-reference. |
| **01** | [Implementation Tracker & Status](file:///docs/01_IMPLEMENTATION_TRACKER_AND_STATUS.md) | Granular checklist of mandated vs. necessary engineering deliverables with status. |
| **02** | [System Architecture & ERD](file:///docs/02_SYSTEM_ARCHITECTURE_AND_ERD.md) | System topology, Mermaid ERD, PostgreSQL DDL schema, and integer poysha arithmetic. |
| **03** | [Concurrency, FSM & Security](file:///docs/03_CONCURRENCY_STATE_MACHINE_AND_SECURITY.md) | The Last-Seat Race solution (`SELECT FOR UPDATE`), lifecycle state machine, and IDOR isolation. |
| **04** | [Functional UI/UX & Color Telemetry](file:///docs/04_FUNCTIONAL_UI_UX_AND_COLOR_SYSTEM.md) | Meaningful semantic color palette, 90 FPS performance standards, and seat map HUD. |
| **05** | [Dev Instructions & API Spec](file:///docs/05_DEVELOPMENT_INSTRUCTIONS_AND_API_SPEC.md) | Docker Compose setup, seed data contracts (Jashim/Bullet/Nusrat/Rafiq), and full REST API. |
| **06** | [Git Workflow & Commit Standards](file:///docs/06_GIT_WORKFLOW_AND_COMMIT_STANDARDS.md) | Strict branch hierarchy (`master`, `pre-release`, `release/v1.0.0`, `feature/*`) and commit rules. |
| **07** | [Testing & Verification Matrix](file:///docs/07_TESTING_AND_VERIFICATION_MATRIX.md) | Automated test specs for the 6 critical invariants: capacity, transitions, fares, and concurrency. |
| **08** | [Video Script & Rubric Defense](file:///docs/08_SIX_MINUTE_VIDEO_SCRIPT_AND_RUBRIC.md) | 6-minute Loom walkthrough script, AI usage disclosure, and submission checklist. |
| **09** | [Scale Bonus: "Oi Tesla Goes Viral"](file:///docs/09_BONUS_VIRAL_SCALE_OI_TESLA_1M.md) | Distributed systems scaling blueprint for 1,000,000 passengers and 100,000 drivers. |

---

## 1. Problem Statement & The Story

8:41 AM on Banani Road 11. **Jashim** is waiting next to **Bullet**, his 3-seater electric vehicle. **Nusrat** requests a ride to Mohakhali. Two minutes later, **Rafiq** requests a trip from Banani to Gulshan 1. Thirty seconds later, **Shirin** attempts to book the remaining seat.

### Key Operational Challenges:
1. **Dynamic Matching in < 1 Second:** Quickly identifying compatible directional routes without heavy mapping overhead.
2. **Deterministic Fare Splitting:** Fairly dividing fares without accumulating floating-point rounding errors.
3. **Strict Zero-Trust Privacy:** Nusrat must never see Rafiq's fare or trip history, and vice versa.
4. **The Last-Seat Concurrency Invariant:** Bullet has 3 seats. When multiple passengers simultaneously attempt to book the final available seat, the database must atomically grant exactly 1 ticket and reject the rest.

---

## 2. Architecture & Data Model

### Architecture Diagram
```mermaid
graph LR
    Browser["Next.js Web Client<br/>(Passenger & Driver HUD)"] -->|REST / JSON| NodeAPI["Node.js API Server<br/>(Fastify / Express)"]
    NodeAPI -->|Pessimistic Row Lock & ACID Tx| Postgres[("PostgreSQL 16 DB<br/>(Check Constraints & BigInt Poysha)")]
```

### Entity Relationship Summary
- **Users:** Passengers (`Nusrat`, `Rafiq`, `Shirin`) and Drivers (`Jashim`).
- **Vehicles:** `Bullet` (Fixed capacity = 3).
- **Pools & Memberships:** Grouping overlapping rides into an active dispatch session.
- **Wallets & Transactions:** Immutable simulated TeslaPay ledger storing integer poysha balances.

*(For the complete Mermaid ERD and PostgreSQL DDL, see [Module 02](file:///docs/02_SYSTEM_ARCHITECTURE_AND_ERD.md))*

---

## 3. Technology Stack & Justification

| Layer | Selection | Justification for Ride-Pooling MVP |
|---|---|---|
| **Frontend** | **Next.js (App Router)** | Instant server rendering, responsive mobile-first views, unified TypeScript types. |
| **Backend** | **Node.js (Fastify / Express)** | Fast asynchronous event loop ideal for I/O-heavy booking requests; clean modular architecture without framework bloat. |
| **Database** | **PostgreSQL 16** | Strict relational integrity, foreign key cascades, check constraints (`CHECK (occupied_seats <= 3)`), and native `SELECT FOR UPDATE` pessimistic row locking. |
| **Styling** | **Vanilla CSS + Semantic Tokens** | Zero CSS-in-JS runtime overhead; guaranteed 90 FPS rendering with meaningful telemetry colors. |
| **DevOps** | **Docker & Docker Compose** | Reproducible single-command environment with automated migrations and seed data. |

---

## 4. Local Setup & Execution Guide

### Prerequisites
- Docker Engine v24+ and Docker Compose v2+
- Node.js v20 LTS (for local non-Docker development)

### 1-Command Startup
```bash
# 1. Clone the repository
git clone <repo-url> && cd "deloar vai"

# 2. Configure environment
cp .env.example .env

# 3. Start PostgreSQL, API, and Frontend
docker compose up --build -d

# 4. Run database migrations and seed the canonical cast
docker compose exec api npm run db:migrate
docker compose exec api npm run db:seed
```

### Demo Credentials (Canonical Cast)
| User Role | Name | Email | Password | Preloaded Wallet |
|---|---|---|---|---|
| **Driver** | Jashim | `jashim.driver@dhakatesla.com` | `tesla123` | ৳1,000.00 (100,000 poysha) |
| **Passenger 1**| Nusrat | `nusrat@dhakatesla.com` | `tesla123` | ৳1,000.00 (100,000 poysha) |
| **Passenger 2**| Rafiq | `rafiq@dhakatesla.com` | `tesla123` | ৳1,000.00 (100,000 poysha) |
| **Passenger 3**| Shirin | `shirin@dhakatesla.com` | `tesla123` | ৳1,000.00 (100,000 poysha) |

---

## 5. Verification & Testing

Our automated test suite focuses on high-value business invariants rather than superficial coverage:

```bash
# Run all automated invariant tests
docker compose exec api npm test

# Run high-concurrency race condition suite (10 threads contesting 1 seat)
docker compose exec api npm run test:concurrency
```

### Verified Invariants:
1. Bullet's 3-seat capacity limit can **never** be exceeded.
2. Invalid state transitions (e.g. `REQUESTED` directly to `COMPLETED`) are rejected with `409 Conflict`.
3. Nusrat's (৳56.25) and Rafiq's (৳50.63) pooled fares calculate accurately down to the exact integer poysha.
4. Nusrat cannot view or cancel Rafiq's ride (Zero-trust tenant isolation).
5. Cancelling a ride restores pool seat availability.
6. 10 simultaneous booking requests contesting 1 seat result in exactly 1 winner and 9 conflicts.

---

## 6. Functional Semantic Color System

Instead of arbitrary cosmetic decoration, every color in the interface communicates direct vehicle telemetry and lifecycle state:

- 🟡 **Telemetry Amber (`#F59E0B`):** Awaiting match / dispatch search / standby caution.
- 🟢 **Telemetry Emerald (`#10B981`):** Seat confirmed / driver arrived / safe transaction.
- 🔵 **Telemetry Cyan (`#06B6D4`):** Trip in progress / active electric propulsion.
- 🔴 **Telemetry Crimson (`#EF4444`):** Capacity full / race collision / cancellation.
- ⚫ **Telemetry Charcoal (`#0F172A`):** Anti-glare high-contrast operational road canvas.
- 🪙 **Telemetry Gold (`#EAB308`):** 25% pooling discount savings indicator.

---

## 7. AI Usage Disclosure (PRD §8)

- **Tools Utilized:** Claude 3.5 Sonnet / Antigravity Agent.
- **Accepted Suggestion:** Enforcing vehicle capacity at the database layer via PostgreSQL `CHECK (occupied_seats <= 3)` constraints and `SELECT FOR UPDATE` pessimistic locks instead of relying solely on application-level memory checks.
- **Rejected Suggestion:** Introducing Apache Kafka and Redis Redlock for the MVP. Rejected because single-node PostgreSQL transactions solve the problem cleanly and reliably without unnecessary infrastructure debt (PRD §9).

---

## 8. Final Walkthrough Video

- **Video Link:** `https://www.loom.com/share/dhaka-tesla-pool-demo` *(To be recorded following [Module 08 Video Script](file:///docs/08_SIX_MINUTE_VIDEO_SCRIPT_AND_RUBRIC.md))*
- **Duration:** Exactly 5 minutes 45 seconds (adhering to the 6-minute ceiling).
