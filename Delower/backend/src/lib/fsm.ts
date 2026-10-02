// backend/src/lib/fsm.ts
// Finite State Machine (FSM) for Ride & Pool Lifecycle (PRD §3)

export type RideStatus =
  | 'REQUESTED'
  | 'MATCHED'
  | 'DRIVER_ARRIVED'
  | 'STARTED'
  | 'COMPLETED'
  | 'CANCELLED';

export type PoolStatus = 'OPEN' | 'DISPATCHED' | 'IN_TRANSIT' | 'CLOSED';

// Permitted transition graph: Current -> Set of allowed Target states
export const PERMITTED_RIDE_TRANSITIONS: Record<RideStatus, RideStatus[]> = {
  REQUESTED: ['MATCHED', 'CANCELLED'],
  MATCHED: ['DRIVER_ARRIVED', 'CANCELLED'],
  DRIVER_ARRIVED: ['STARTED', 'CANCELLED'],
  STARTED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

/**
 * Validates whether a state transition is legal according to FSM graph.
 */
export function isValidRideTransition(current: RideStatus, target: RideStatus): boolean {
  const allowed = PERMITTED_RIDE_TRANSITIONS[current];
  return allowed ? allowed.includes(target) : false;
}
