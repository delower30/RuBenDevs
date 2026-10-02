# Module 04: Functional UI/UX Design System & Semantic Color Telemetry

**Project:** Dhaka Tesla Pool  
**Author:** Software Architect & Principal UI/UX Engineer  
**Engineering Standard:** 90 FPS Performance, Semantic Telemetry, Zero-Decoration Meaningful Palette  

---

## 1. Design Philosophy: Functional Telemetry Over Decoration

In mission-critical transportation software operating in the chaotic, high-density environment of Dhaka, **visual fluff is an anti-pattern**. Drivers like Jashim operate in direct sunlight, dust, and rain, while passengers like Nusrat and Rafiq are rushing to meetings across gridlocked intersections.

### Core UI Principles
1. **Zero Decorative Color:** Every single color token encodes an operational state, safety invariant, or transaction outcome. If a color has no functional meaning, it is prohibited.
2. **Cognitive Ergonomics & High Contrast:** Optimized for low-end mobile LCD screens under harsh sunlight (meeting WCAG 2.1 AAA contrast ratios).
3. **90 FPS Fluidity:** Tabular alignment, GPU-accelerated compositing (`transform`, `opacity`), zero layout shifts during dynamic fare re-calculations.
4. **Instant Comprehensibility:** A user must comprehend their seat status, vehicle arrival, and fare within 250 milliseconds of glancing at the screen.

---

## 2. The Semantic Color Palette (Meaning & Purpose)

```
+-----------------------------------------------------------------------------------+
|                           FUNCTIONAL TELEMETRY PALETTE                            |
+-----------------------------------------------------------------------------------+
|  [ AMBER ]      [ EMERALD ]      [ CYAN ]         [ CRIMSON ]      [ CHARCOAL ]   |
|  #F59E0B        #10B981          #06B6D4          #EF4444          #0F172A        |
|  Waiting /      Seat Confirmed / En Route /       Capacity Full /  Road Surface / |
|  Matching       Safe Solved      In-Transit       Cancelled        Base Contrast  |
+-----------------------------------------------------------------------------------+
```

### Complete Color Token Definition Table

| Color Token | Hex / HSL | Semantic Meaning & State | Physical & Operational Real-World Analogy | Allowed Usage Context |
|---|---|---|---|---|
| `--color-telemetry-amber` | `#F59E0B`<br>`hsl(38, 92%, 50%)` | **Awaiting Match / Dispatch Search / Standby Caution** | Amber traffic signal; battery pre-charge indicator; high-visibility Dhaka caution hazard. | Pulsing radar during ride search; pending match badge; driver awaiting passenger arrival. |
| `--color-telemetry-emerald` | `#10B981`<br>`hsl(160, 84%, 39%)` | **Seat Confirmed / Safe Match / Driver Arrived / Solved State** | Green traffic signal; successful electrical circuit completion; verified passenger ticket. | Confirmed seat in Bullet's manifest; "Driver Arrived" status badge; successful wallet balance deduction. |
| `--color-telemetry-cyan` | `#06B6D4`<br>`hsl(189, 94%, 43%)` | **Trip In Progress / En Route / Active Electric Propulsion** | High-voltage electric vehicle motor active; dynamic GPS route corridor vector. | "Trip In Progress" progress bar; live route vector connecting Banani to Mohakhali; active trip timer. |
| `--color-telemetry-crimson` | `#EF4444`<br>`hsl(0, 84%, 60%)` | **Capacity Exhausted / Race Collision / Ride Cancelled** | Emergency braking light; circuit breaker trip; vehicle overload sensor alarm. | 0 seats available warning; race condition rejection modal; cancelled trip state; insufficient wallet funds. |
| `--color-telemetry-charcoal` | `#0F172A`<br>`hsl(222, 47%, 11%)` | **Operational Asphalt / Structural Base Canvas** | Dhaka road surface; anti-glare night HUD for driver eye fatigue reduction. | Root background surface; primary container background for driver telemetry. |
| `--color-telemetry-slate` | `#334155`<br>`hsl(215, 25%, 27%)` | **Unallocated Capacity / Empty Neutral Grid** | Unoccupied vehicle bench; inert hardware chassis. | Empty seat icon in Bullet's 3-seat map; inactive tab controls; subtle border dividers. |
| `--color-telemetry-gold` | `#EAB308`<br>`hsl(48, 96%, 53%)` | **Pool Split Savings / Economic Incentive** | Hard currency; tangible financial benefit of sharing the ride. | 25% pool discount badge; money saved indicator; wallet poysha balance. |

---

## 3. Physical Seat Manifest HUD: Bullet's 3-Seat Map

Jashim's "Bullet" has exactly three physical passenger seats. The UI renders this physical layout deterministically on both the Driver and Passenger screens:

```
+-------------------------------------------------------+
|          BULLET SEAT TELEMETRY - BANANI ROAD 11       |
+-------------------------------------------------------+
|                                                       |
|                     [ DRIVER ]                        |
|                  Jashim (Online)                      |
|                                                       |
|    +----------------+ +----------------+ +-------+    |
|    |     SEAT 1     | |     SEAT 2     | |SEAT 3 |    |
|    |  [EMERALD]     | |  [EMERALD]     | |[SLATE]|    |
|    | Nusrat (1 seat)| | Rafiq (1 seat) | | EMPTY |    |
|    | -> Mohakhali   | | -> Gulshan 1   | | 1 Avl |    |
|    | ৳56.25 (Pool)  | | ৳50.63 (Pool)  | |       |    |
|    +----------------+ +----------------+ +-------+    |
|                                                       |
|  OCCUPANCY: 2 / 3 SEATS FILLED  |  STATUS: DISPATCHED |
+-------------------------------------------------------+
```

### Visual State Rules for Seats
1. **Empty Seat:** Rendered with `--color-telemetry-slate` border and dashed fill. Displays text `"Available"`.
2. **Reserved / Claimed Seat:** Instant transition to `--color-telemetry-emerald` solid fill. Displays passenger first name, drop zone, and allocated seat count.
3. **Contested Seat (Concurrent Claim in Progress):** Pulsing border with `--color-telemetry-amber`.
4. **Seat Overflow Rejection:** If a user attempts to book a 4th seat, the 3-seat cluster shakes with a 200ms CSS animation and transitions briefly to `--color-telemetry-crimson`.

---

## 4. Screen-by-Screen Functional UX Flows

### Screen 1: Passenger Booking & Live Fare Estimator
- **Actor:** Nusrat / Rafiq / Shirin
- **Functional Components:**
  - **Zone Selectors:** Segmented control for predefined Dhaka zones (`Banani`, `Gulshan 1`, `Mohakhali`, etc.).
  - **Seat Stepper:** Discrete selector `[ 1 ] [ 2 ] [ 3 ]`.
  - **Fare Breakdown Telemetry Box:**
    - Base Fare: `৳30.00`
    - Distance (`3.0 km`): `৳45.00`
    - Solo Subtotal: `৳75.00`
    - **Pool Match Discount (25%):** Highlighted in `--color-telemetry-gold`: `-৳18.75`
    - **Your Estimated Fare:** `৳56.25` (`5625 poysha`)
  - **Action Button:** `"Request Pool Seat"` (Full width, high-contrast, disabled if wallet balance < estimated fare).

### Screen 2: Passenger Live Trip Tracking HUD
- **Actor:** Nusrat (while riding with Rafiq in Bullet)
- **Functional Components:**
  - **Live State Pill:** Displays current FSM state (`MATCHED` in Amber $\rightarrow$ `DRIVER ARRIVED` in Emerald $\rightarrow$ `STARTED` in Cyan).
  - **Vehicle & Driver Telemetry:** Driver Name: `Jashim`, Vehicle: `Bullet (3-Wheeler Tesla)`, Plate: `DHA-HA-11-2024`.
  - **Strict Privacy Shield:**
    - Displays: `"Sharing with 1 other passenger"`.
    - **Hidden:** Rafiq's name, Rafiq's fare, Rafiq's exact drop-off point, and Rafiq's wallet balance are completely omitted from the DOM.
  - **Emergency / Cancel Action:** Visible only while status is `REQUESTED` or `MATCHED`. Disappears when status transitions to `STARTED`.

### Screen 3: Driver Dispatch Console & Manifest HUD
- **Actor:** Jashim (Driver)
- **Functional Components:**
  - **Online / Offline Toggle Switch:** High-contrast toggle controlling vehicle availability.
  - **Active Pool Manifest:**
    - Pickup Stop 1: `Banani Road 11` $\rightarrow$ Collect Nusrat (1 seat) & Rafiq (1 seat).
    - Drop-off Stop 1: `Gulshan 1` $\rightarrow$ Drop Rafiq.
    - Drop-off Stop 2: `Mohakhali` $\rightarrow$ Drop Nusrat.
  - **State Action Trigger:** Big primary thumb-friendly tactile button:
    - `"Mark Arrived at Banani"`
    - `"Start Trip (All Onboard)"`
    - `"Complete Drop-off & Settle Fare"`

---

## 5. 90 FPS Performance & Anti-Stutter Standards

To meet the user's strict engineering standard of an ultra-smooth, responsive 90 FPS interface:

1. **Tabular Numeric Typography (`tabular-nums`):**
   ```css
   .telemetry-fare-display {
     font-family: 'JetBrains Mono', 'Roboto Mono', monospace;
     font-variant-numeric: tabular-nums;
     letter-spacing: -0.02em;
   }
   ```
   *Rationale:* Prevents width jitter and horizontal layout reflow when live poysha figures recalculate.

2. **Hardware-Accelerated State Transitions:**
   Animations must exclusively animate `transform` and `opacity`. No layout properties (`width`, `height`, `margin`, `top`) may be animated.
   ```css
   .seat-card {
     will-change: transform, opacity;
     transition: transform 150ms cubic-bezier(0.16, 1, 0.3, 1), 
                 opacity 150ms ease-out;
   }
   ```

3. **Decoupled Polling & Memoized Render Trees:**
   Background status polling hooks must not trigger top-level page re-renders. Only the isolated `<StatusBadge />` and `<SeatManifest />` components re-render when receiving state updates.
