# UI/UX Optimization Task Plan: Minimalist, High-Breathing Room Design

This task plan executes systematic UI/UX refinements across all screens, enforcing **clarity over decoration**, **whitespace over containers**, **functional telemetry colors**, and strict **single-line typography**.

---

### Progress Checklist

- [x] **Task 1: Architecture & Clean Shell Cleanup (`page.tsx`)**
  - [x] Remove the bottom user switching `<nav>` tab bar entirely.
  - [x] Remove the top horizontal persona selection tab bar.
  - [x] Streamline the header: Clean title, live status indicator, minimalist profile pill (Name, Role, Logout), and subtle Reset/Guide utilities.
  - [x] Ensure natural role routing: Logged in as Passenger ➔ Passenger Cockpit; Logged in as Driver ➔ Driver Cockpit.
  - [x] Clean up redundant containers and card nesting.

- [x] **Task 2: Refine & De-Containerize Seat Manifest HUD (`SeatManifestHUD.tsx`)**
  - [x] Remove bulky container backgrounds; rely on crisp borders, geometric spacing, and whitespace.
  - [x] Ensure strict single-line display for each seat: `#1`, Status, Passenger Name, Route, Fare.
  - [x] Guarantee no text wrapping or clipped double-lines.
  - [x] Badges strictly for state meaning: Amber for `Reserved`, Cyan for `Boarding`, Blue for `Onboard`, Slate for `Paid`.

- [x] **Task 3: Polish Driver Cockpit Layout (`DriverPortal.tsx`)**
  - [x] Reduce card nesting; let driver metrics and vehicle details breathe.
  - [x] Eliminate double-lined text across metrics, manifest rows, and buttons.
  - [x] Clean, accessible single-line passenger dispatch rows with aligned actions.
  - [x] Minimalist batch actions with clear functional hierarchy.

- [x] **Task 4: Polish Passenger Booking & En-Route HUD (`PassengerPortal.tsx`)**
  - [x] Remove unnecessary inner card containers; use clean section dividers and generous vertical spacing.
  - [x] Eliminate double-lined text across hub selections, seat picker, and dynamic fare readout.
  - [x] Streamline the En-Route waiting state: Minimalist amber telemetry beacon + clean single-line 3-step progress track.
  - [x] Ensure zero layout shift (CLS) between Booking view and Active Trip view.

- [x] **Task 5: Refine Auth & Quick Login Experience (`AuthView.tsx`)**
  - [x] Streamline hero section and remove decorative noise.
  - [x] Format 1-tap evaluator persona cards into compact, single-line items without crowded subtitles.
  - [x] Optimize form spacing, inputs, and button typography.

- [x] **Task 6: Verification & Visual Smoke Test**
  - [x] Validate TypeScript and Next.js compilation (`npx tsc --noEmit`).
  - [x] Verify hot-reload and rendering on `http://localhost:3000`.
  - [x] Check responsive viewport fit, single-line integrity, and semantic color telemetry in browser subagent.

- [x] **Task 7: Dynamic Seat Fare Scaling**
  - [x] Base and distance fare dynamically scale by `seats` in frontend `PassengerPortal.tsx`.
  - [x] Backend `pricing.ts`, `rides.ts`, and `poolService.ts` support `seats` multiplier.
  - [x] Manifest HUD displays per-seat fare breakdown.

- [x] **Task 8: Page Refresh State Persistence**
  - [x] Fix Express route ordering in `rides.ts` where `GET /:id` was intercepting `GET /api/rides/active` as `id = "active"` (returning 404).
  - [x] Ensure `GET /api/rides/active` runs and returns current active ride (`MATCHED`, `DRIVER_ARRIVED`, `STARTED`) on page refresh.
  - [x] Verified full database persistence across browser reloads.

- [x] **Task 9: Idle Vehicle Route Repositioning & Ghost Reservation Cleanup**
  - [x] Allow idle vehicle (0 passengers) to reposition and serve any valid Dhaka pickup corridor (e.g., Gulshan 1, Banani).
  - [x] Clean up rejected ride requests on match failure so no orphan `REQUESTED` records remain in SQLite.
  - [x] Restrict `GET /api/rides/active` strictly to confirmed rides (`MATCHED`, `DRIVER_ARRIVED`, `STARTED`) to prevent ghost bookings on reload.

- [x] **Task 10: Realistic Radar Searching Animation & Humanized Progress Labels**
  - [x] Added realistic 1.4-second radar scanning animation (`Scanning corridor...` -> `Matching Pilot Jashim...` -> `Confirmed`) to simulate real-world Tesla dispatch without violating sub-second PRD automated matching invariants.
  - [x] Simplified and humanized ride lifecycle labels:
    - `1. En Route` ➔ `1. Driver on the Way` (Status: `Driver on the Way`, Amber)
    - `2. Boarding / At Curb` ➔ `2. Driver Arrived` (Status: `Driver Arrived`, Cyan)
    - `3. In Transit` ➔ `3. On the Way` (Status: `On the Way`, Blue)
  - [x] Zero text-wrapping, fully responsive single-line layout preserved.
  - [x] All 7 backend Vitest suites passing and frontend TypeScript compilation verified.

- [x] **Task 11: Dynamic Pilot Location & Staging Hub Relocation**
  - [x] Backend automatically updates vehicle/pool `currentZone` to passenger's drop-off `destinationZone` upon trip `COMPLETED`.
  - [x] Added `POST /api/driver/reposition` endpoint allowing idle drivers (`occupiedSeats === 0`) to relocate to any Dhaka hub.
  - [x] Driver HUD dynamically displays live staging hub (`pool.currentZone`), replacing hardcoded "Banani Rd 11".
  - [x] Added interactive hub selector on the Driver Cockpit for idle relocation across all 9 Dhaka zones.

- [x] **Task 12: Strict Physical Geographic Matching & Fleet Telemetry Invariant**
  - [x] Eliminated artificial driver teleportation in `poolService.ts`. Idle vehicles stationed in another zone (e.g. Mohakhali) are never silently relocated by incoming booking requests from Banani.
  - [x] Strict physical location matching: Requests for pickup in unserved hubs return HTTP 409 with exact stationing feedback: `"No Tesla available in Banani. Bullet is currently stationed at Mohakhali."`
  - [x] Added `GET /api/rides/fleet-status` providing live vehicle location, pilot identity, online status, and seat vacancy.
  - [x] Integrated real-time fleet stationing badge with 1-tap "Set Pickup" synchronization in `PassengerPortal.tsx`.
  - [x] Enforced single-pool invariant in `driver.ts` to automatically prune duplicate zombie pools from test runs.
  - [x] 100% test pass rate across all 7 Vitest suites and 0 TypeScript compilation errors.
