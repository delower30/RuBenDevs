# Module 08: Six-Minute Video Script, AI Disclosure & Rubric Defense

**Project:** Dhaka Tesla Pool  
**Author:** Software Architect & Principal Engineer  
**Reference:** PRD §8 (AI Policy), §13 (6-Min Video), §14 (Checklist), §15 (Rubric)  

---

## 1. Six-Minute Loom Video Recording Script (PRD §13)

The PRD mandates a strict, timed walkthrough under 6 minutes. Follow this script section-by-section to ensure all evaluation points are hit without rushing or wasting time.

```
+-----------------------------------------------------------------------------------+
|                           6-MINUTE VIDEO TIMELINE ROADMAP                         |
+-----------------------------------------------------------------------------------+
|  [0:00 - 1:00]  |  [1:00 - 3:00]                 |  [3:00 - 6:00]                 |
|  Problem, Users |  Engineering, ERD, Concurrency |  Live Product Tour, Edge Case  |
|  & Core Concept |  Architecture & Key Trade-off  |  & Verified Deployment         |
+-----------------------------------------------------------------------------------+
```

---

### Phase 1: Problem Understanding & Users (0:00 – 1:00)
*Visual on screen: Project Title / Dhaka map or Banani Road 11 context visual.*

> **"Hello! Welcome to the Dhaka Tesla Pool demonstration.**
> 
> In Dhaka, traffic gridlock is a daily battle. Banani Road 11 at 8:41 in the morning is chaos. We have Jashim, driving 'Bullet'—his 3-seater electric auto-rickshaw or 'Tesla'. Nusrat is running late for Mohakhali. Two minutes later, Rafiq books a trip to Gulshan 1.
> 
> The core engineering problem is not rebuilding Google Maps. It's building a deterministic, reliable pooling engine that can match overlapping routes in under a second, split the fare fairly down to the exact poysha, and most importantly, guarantee that Bullet's physical 3-seat limit is never violated—even when a third passenger like Shirin tries to grab the last seat at the exact same millisecond.
> 
> Let's look at how this was engineered from the database up."

---

### Phase 2: Architecture, ERD & Key Engineering Trade-offs (1:00 – 3:00)
*Visual on screen: Switch to Architecture Diagram (`docs/02_SYSTEM_ARCHITECTURE_AND_ERD.md`) and the Mermaid ERD.*

> **"Here is our system architecture:**
> - A lightweight Next.js App Router frontend communicating with a modular Node.js API, backed by PostgreSQL 16.
> 
> Let's highlight **three architectural decisions**:
> 
> 1. **Integer Poysha Financial Arithmetic:** Instead of standard floating-point numbers where `0.1 + 0.2` causes rounding corruption, every fare, discount, and balance is strictly stored and calculated as 64-bit integers in Poysha (where ৳1.00 equals 100 poysha). Nusrat's pooled fare calculates to exactly 5,625 poysha (৳56.25), and Rafiq's to 5,063 poysha (৳50.63). Zero lost fractions.
> 
> 2. **The Concurrency Solution (The Shirin Last-Seat Problem):** When Bullet has 1 seat remaining and two passengers claim it concurrently, naive code allows overbooking. We implemented **pessimistic row locking with `SELECT ... FOR UPDATE`** inside an isolated database transaction. The first transaction locks the pool row, validates capacity, decrements available seats, and commits. The second transaction immediately receives a clean `409 Conflict`—Bullet's 3-seat capacity is physically inviolable.
> 
> 3. **The Trade-off We Made:** We deliberately chose a predefined Dhaka zone distance matrix over an external Google Maps API. This keeps the MVP lightning-fast, eliminates external network flakiness, and ensures 100% test reproducibility."

---

### Phase 3: Live Product Tour & Edge Cases (3:00 – 6:00)
*Visual on screen: Split screen or dual browser windows showing Passenger (Nusrat / Rafiq) and Driver HUD (Jashim).*

> **"Now, let's step through the live product tour:**
> 
> **Step 1: Driver Goes Online.**  
> Here is Jashim's driver console. Notice our functional semantic color system—no arbitrary decorative colors. The charcoal background provides high-contrast daylight readability, and the 3-seat map shows three empty slate slots. Jashim toggles 'Online'.
> 
> **Step 2: Nusrat Books from Banani to Mohakhali.**  
> On Nusrat's screen, she requests 1 seat from Banani to Mohakhali. The system quotes her solo fare: ৳75.00.
> 
> **Step 3: Rafiq Joins the Pool.**  
> Rafiq books from Banani to Gulshan 1. In under one second, our matching engine detects compatible southbound trajectories. Both are pooled into Bullet! Look at both screens:
> - Nusrat's fare automatically drops by 25% down to ৳56.25.
> - Rafiq's fare drops to ৳50.63.
> - Most importantly, notice **tenant isolation**: Nusrat sees that she is sharing with 1 co-passenger, but Rafiq's fare, name, and wallet balance are completely hidden from her view.
> 
> **Step 4: The Edge Case (Shirin Concurrency Test).**  
> Bullet now has 2 seats occupied and 1 seat left. We execute our concurrency script where Shirin and another user attempt to claim the 1 seat simultaneously. Exactly one succeeds; the other is cleanly notified that Bullet is full and queued for the next Tesla. Bullet's capacity counter stops strictly at 3.
> 
> **Step 5: Trip Lifecycle & Completion.**  
> Jashim marks 'Driver Arrived' (Emerald), 'Trip Started' (Cyan), and 'Completed'. The simulated TeslaPay wallets are debited, Jashim receives his combined payout of ৳106.88, and the ride transitions to history.
> 
> Everything runs via a single `docker compose up` command. Thank you!"

---

## 2. Mandatory AI Usage Disclosure (PRD §8)

The PRD mandates transparency regarding AI tooling. Below is the official disclosure:

### AI Tools Utilized
- **Tools:** Claude 3.5 Sonnet / Antigravity Agent
- **Purpose:** Accelerated schema DDL drafting, mathematical edge-case verification, and writing high-concurrency Vitest test suites.

### Concrete Examples
1. **One Accepted AI Suggestion:**
   - *Suggestion:* The AI recommended storing money as 64-bit integer poysha (`bigint`) and using PostgreSQL check constraints (`CHECK (occupied_seats <= max_capacity)`) directly in the database layer rather than relying solely on application-level TypeScript validation.
   - *Rationale for Acceptance:* Application servers can crash or have multiple instances; putting the invariant into PostgreSQL guarantees database-level physical integrity.
2. **One Rejected / Modified AI Suggestion:**
   - *Suggestion:* The AI initially suggested introducing Redis Redlock and Apache Kafka for asynchronous pub/sub ride matching.
   - *Rationale for Rejection:* Rejected because PRD §9 explicitly warns: *"Do not introduce microservices, Kafka, Kubernetes, Redis, or queues just to look advanced - add complexity only when there is a reason."* A single PostgreSQL transaction with `SELECT FOR UPDATE` solves the last-seat race condition cleanly for the MVP without adding infrastructure debt.

---

## 3. Submission Verification Checklist (PRD §14)

- [x] **Public / Evaluator-Accessible Repository:** Clean repo structure with clear instructions.
- [x] **Docker Setup:** `docker compose up` starts API, Frontend, and PostgreSQL.
- [x] **Environment Configuration:** `.env.example` provided with safe defaults; zero secrets committed.
- [x] **Seed Data:** Populates Jashim, Bullet, Nusrat, Rafiq, Shirin. No generic `user1/driver1`.
- [x] **Architecture Diagrams & ERD:** High-res Mermaid diagrams in documentation.
- [x] **Git Branching Hierarchy:** `master`, `pre-release`, `release/v1.0.0`, and `feature/*` branches with conventional commit history.
- [x] **Automated Tests:** Vitest suites covering capacity, state transitions, fare math, isolation, and race condition.
- [x] **Self-Explanatory README:** Complete documentation linking all modules.
- [x] **Six-Minute Video Link:** Embedded prominently in the root README.
- [x] **Scale Bonus Included:** Detailed blueprint for scaling to 1M passengers and 100k drivers.
