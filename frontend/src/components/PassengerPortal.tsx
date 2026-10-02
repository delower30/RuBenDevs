'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowRight, 
  RefreshCw, 
  X, 
  ShieldCheck, 
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Radio
} from 'lucide-react';

const PASSENGERS = [
  { id: 'nusrat', name: 'Nusrat Jahan', email: 'nusrat@dhakatesla.com', defaultDest: 'Mohakhali', defaultSeats: 1 },
  { id: 'rafiq', name: 'Rafiqul Islam', email: 'rafiq@dhakatesla.com', defaultDest: 'Gulshan 1', defaultSeats: 2 },
  { id: 'shirin', name: 'Shirin Akter', email: 'shirin@dhakatesla.com', defaultDest: 'Mohakhali', defaultSeats: 1 },
];

const ZONES = ['Banani', 'Gulshan 1', 'Gulshan 2', 'Mohakhali', 'Farmgate', 'Dhanmondi', 'Mirpur 10', 'Uttara', 'Bashundhara'];

const ZONE_DISTANCES: Record<string, Record<string, number>> = {
  Banani: {
    Banani: 0.0,
    'Gulshan 1': 2.5,
    'Gulshan 2': 1.5,
    Mohakhali: 3.0,
    Farmgate: 5.5,
    Dhanmondi: 8.0,
    'Mirpur 10': 7.0,
    Uttara: 9.5,
    Bashundhara: 4.2,
  },
};

interface PassengerPortalProps {
  onRideBooked?: () => void;
  currentUser?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    phone?: string;
    walletBalanceBdt?: string;
  } | null;
  authToken?: string | null;
  refreshTrigger?: number;
}

export default function PassengerPortal({ 
  onRideBooked, 
  currentUser, 
  authToken, 
  refreshTrigger = 0 
}: PassengerPortalProps) {
  const [selectedUser, setSelectedUser] = useState(
    currentUser 
      ? { id: currentUser.id, name: currentUser.fullName, email: currentUser.email, defaultDest: 'Mohakhali', defaultSeats: 1 }
      : PASSENGERS[0]
  );

  const [pickupZone, setPickupZone] = useState('Banani');
  const [destinationZone, setDestinationZone] = useState(selectedUser.defaultDest);
  const [seats, setSeats] = useState(selectedUser.defaultSeats);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStage, setSearchStage] = useState(1);
  const cancelSearchRef = React.useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(authToken || null);
  const [fleetStatus, setFleetStatus] = useState<{
    isOnline: boolean;
    vehicleName: string;
    pilotName: string;
    currentZone: string;
    occupiedSeats: number;
    availableSeats: number;
    maxCapacity: number;
  } | null>(null);

  // Sync active passenger when currentUser changes
  useEffect(() => {
    if (currentUser) {
      const isRafiq = currentUser.email.includes('rafiq');
      const dest = isRafiq ? 'Gulshan 1' : 'Mohakhali';
      const seatCount = isRafiq ? 2 : 1;

      setSelectedUser({
        id: currentUser.id,
        name: currentUser.fullName,
        email: currentUser.email,
        defaultDest: dest,
        defaultSeats: seatCount,
      });
      setDestinationZone(dest);
      setSeats(seatCount);
      setErrorMsg(null);
    }
    if (authToken) {
      setToken(authToken);
    }
  }, [currentUser, authToken]);

  // Fetch active ride for current passenger
  const fetchActiveRide = useCallback(async (activeTokenParam?: string) => {
    const t = activeTokenParam || token;
    if (!t) return;
    try {
      const res = await fetch('http://localhost:5000/api/rides/active', {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.activeRide) {
          setActiveRide(data.activeRide);
        } else {
          setActiveRide(null);
        }
      }
    } catch (e) {
      console.error('Error fetching active ride', e);
    }
  }, [token]);

  // Fetch live physical fleet location and seat availability
  const fetchFleetStatus = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:5000/api/rides/fleet-status');
      if (res.ok) {
        const data = await res.json();
        setFleetStatus(data);
      }
    } catch (e) {
      console.error('Error fetching fleet status', e);
    }
  }, []);

  // Poll fleet status every 3s
  useEffect(() => {
    fetchFleetStatus();
    const interval = setInterval(fetchFleetStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchFleetStatus, refreshTrigger]);

  // Initial load and on token sync
  useEffect(() => {
    if (token) {
      fetchActiveRide(token);
    }
  }, [token, fetchActiveRide, refreshTrigger]);

  // REAL-TIME HEARTBEAT: Auto-poll active ride status every 2.5s
  useEffect(() => {
    if (!token || !activeRide?.id) return;
    if (activeRide.status === 'CANCELLED') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/rides/${activeRide.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const updatedRide = await res.json();
          setActiveRide(updatedRide);
        }
      } catch (err) {
        console.error('Live sync poll error', err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [token, activeRide?.id, activeRide?.status]);

  // Request a ride with realistic radar searching
  async function handleBookRide() {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    setIsSearching(true);
    setSearchStage(1);
    cancelSearchRef.current = false;

    const startTime = Date.now();
    const stage2Timer = setTimeout(() => {
      if (!cancelSearchRef.current) setSearchStage(2);
    }, 550);
    const stage3Timer = setTimeout(() => {
      if (!cancelSearchRef.current) setSearchStage(3);
    }, 1100);

    try {
      const res = await fetch('http://localhost:5000/api/rides', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Idempotency-Key': `idemp-${selectedUser.id}-${Date.now()}`,
        },
        body: JSON.stringify({
          pickupZone,
          destinationZone,
          requestedSeats: seats,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        clearTimeout(stage2Timer);
        clearTimeout(stage3Timer);
        setIsSearching(false);
        if (res.status === 409) {
          setErrorMsg(data.message || 'Capacity Exceeded: Bullet is full.');
        } else {
          setErrorMsg(data.message || data.error || 'No vehicle available in this route');
        }
        return;
      }

      // Fetch the ride details
      const rideRes = await fetch(`http://localhost:5000/api/rides/${data.rideId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      let rideData: any = null;
      if (rideRes.ok) {
        rideData = await rideRes.json();
      }

      // Ensure search radar is visible for at least 1400ms to feel real
      const elapsed = Date.now() - startTime;
      const remainingDelay = Math.max(0, 1400 - elapsed);
      if (remainingDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingDelay));
      }

      if (cancelSearchRef.current) {
        return;
      }

      if (rideData) {
        setActiveRide(rideData);
      }
      setIsSearching(false);
      if (onRideBooked) onRideBooked();
    } catch (e: any) {
      clearTimeout(stage2Timer);
      clearTimeout(stage3Timer);
      setIsSearching(false);
      setErrorMsg(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  function handleCancelSearch() {
    cancelSearchRef.current = true;
    setIsSearching(false);
    setLoading(false);
  }

  // Cancel ride
  async function handleCancel() {
    if (!token || !activeRide) return;
    try {
      const res = await fetch(`http://localhost:5000/api/rides/${activeRide.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setActiveRide(null);
        if (onRideBooked) onRideBooked();
      }
    } catch (e) {
      console.error('Failed to cancel ride', e);
    }
  }

  // Refresh current ride manually
  async function refreshRide() {
    if (!token || !activeRide?.id) return;
    try {
      const res = await fetch(`http://localhost:5000/api/rides/${activeRide.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveRide(data);
      }
    } catch (e) {
      console.error('Refresh error', e);
    }
  }

  // Estimated dynamic fare calculations
  const distanceKm = ZONE_DISTANCES[pickupZone]?.[destinationZone] ?? 3.0;
  const seatMultiplier = Math.max(1, seats);
  const baseFare = 30.0 * seatMultiplier;
  const distanceFare = distanceKm * 15.0 * seatMultiplier;
  const subtotal = baseFare + distanceFare;
  const discount = subtotal * 0.25;
  const estimatedPooledFare = subtotal - discount;

  const passengerName = currentUser?.fullName || selectedUser.name;
  const passengerInitial = passengerName.charAt(0);

  return (
    <div className="space-y-4">
      {/* 1. Passenger Identity & Wallet Header: Open, breathable */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs">
              {passengerInitial}
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-sm text-slate-900 block truncate">
                {passengerName}
              </span>
              <span className="text-[11px] text-slate-500 font-mono truncate block">
                {currentUser?.email || selectedUser.email}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] uppercase font-mono text-slate-400 block whitespace-nowrap">
              TeslaPay Balance
            </span>
            <span className="font-mono text-base font-semibold text-emerald-700 tabular-nums whitespace-nowrap">
              ৳{currentUser?.walletBalanceBdt || '1,000.00'}
            </span>
          </div>
        </div>
      </section>

      {/* 2. Main Booking Flow vs. Realistic Radar Search vs. Active Trip Stepper */}
      {isSearching ? (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 space-y-4 text-center">
          {/* Animated Radar Visual */}
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/25 duration-1000" />
            <span className="absolute inline-flex h-14 w-14 animate-pulse rounded-full bg-amber-400/20" />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-amber-400 shadow-sm">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
          </div>

          {/* Stage Progress & Live Status */}
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
              Searching for Dhaka Tesla...
            </h3>
            <p className="text-xs text-amber-800 font-mono">
              {searchStage === 1 && `Scanning ${pickupZone} corridor for active pilots...`}
              {searchStage === 2 && `Matching Pilot Jashim in Bullet (${seats} ${seats === 1 ? 'seat' : 'seats'} fit)...`}
              {searchStage === 3 && `Tesla confirmed! Locking reservation...`}
            </p>
          </div>

          {/* Staged Route Telemetry */}
          <div className="inline-flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-1.5 text-[11px] text-slate-600 font-medium mx-auto">
            <span className="truncate">{pickupZone}</span>
            <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
            <span className="truncate">{destinationZone}</span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-amber-700 shrink-0">{seats} {seats === 1 ? 'Seat' : 'Seats'}</span>
          </div>

          {/* Cancel Search Action */}
          <div>
            <button
              type="button"
              onClick={handleCancelSearch}
              className="text-[11px] text-slate-400 hover:text-slate-700 transition font-mono"
            >
              Cancel Search
            </button>
          </div>
        </section>
      ) : !activeRide || activeRide.status === 'CANCELLED' ? (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-4">
          <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100">
            <span className="font-semibold text-slate-900">Seat Reservation</span>
            <span className="text-[11px] text-slate-400 font-mono">Electric Corridor</span>
          </div>

          {/* Live Fleet Stationing Telemetry Indicator */}
          {fleetStatus && (
            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
              <div className="flex items-center gap-1.5 truncate">
                <span className={`h-2 w-2 rounded-full shrink-0 ${fleetStatus.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span className="font-semibold text-slate-800 truncate">{fleetStatus.vehicleName}</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600 truncate">
                  Stationed at <strong className="text-slate-900 font-semibold">{fleetStatus.currentZone}</strong> Hub
                </span>
                <span className="text-slate-400 text-[10px] font-mono shrink-0">
                  ({fleetStatus.availableSeats}/{fleetStatus.maxCapacity} free)
                </span>
              </div>
              {fleetStatus.isOnline && pickupZone !== fleetStatus.currentZone && (
                <button
                  type="button"
                  onClick={() => setPickupZone(fleetStatus.currentZone)}
                  className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 transition whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Set Pickup
                </button>
              )}
            </div>
          )}

          {/* Staging Hub Route Pickers: Clean single-line dropdowns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Pickup Hub
              </label>
              <select
                value={pickupZone}
                onChange={(e) => setPickupZone(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-800 focus:bg-white focus:border-slate-400 focus:outline-none transition truncate"
              >
                {ZONES.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Destination
              </label>
              <select
                value={destinationZone}
                onChange={(e) => setDestinationZone(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 text-xs text-slate-800 focus:bg-white focus:border-slate-400 focus:outline-none transition truncate"
              >
                {ZONES.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Seat Picker: 3 Geometric Buttons */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
              <span className="font-medium">Seats Required</span>
              <span className="text-slate-400 font-mono">Max 3</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((num) => {
                const isSelected = seats === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setSeats(num)}
                    className={`h-9 rounded-xl font-mono text-xs font-semibold transition border ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {num} {num === 1 ? 'Seat' : 'Seats'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Fare Breakdown: Single-line tabular rows */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500 text-[11px] whitespace-nowrap">
              <span>Standard Fare ({distanceKm} km • {seats} {seats === 1 ? 'Seat' : 'Seats'})</span>
              <span className="font-mono tabular-nums text-slate-700">৳{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-amber-700 text-[11px] whitespace-nowrap">
              <span>Pool Sharing Discount (25%)</span>
              <span className="font-mono tabular-nums font-medium">-৳{discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-slate-900 pt-1 border-t border-slate-100 whitespace-nowrap">
              <span>Estimated Fare ({seats} {seats === 1 ? 'Seat' : 'Seats'})</span>
              <span className="font-mono text-emerald-700 tabular-nums text-sm">
                ৳{estimatedPooledFare.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Error Banner: Single-line alert */}
          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
              <span className="truncate">{errorMsg}</span>
            </div>
          )}

          {/* Primary Action Button */}
          <button
            onClick={handleBookRide}
            disabled={loading}
            className="w-full h-10 flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
            ) : (
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            )}
            <span className="truncate">Reserve {seats} {seats === 1 ? 'Seat' : 'Seats'} ({pickupZone} → {destinationZone})</span>
          </button>
        </section>
      ) : (
        /* Active Trip Telemetry: Refined single-line layout */
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-4">
          {/* Trip Header */}
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">
                Active Ride
              </span>
              <span className="font-semibold text-sm text-slate-900 truncate block">
                {activeRide.pickupZone} → {activeRide.destinationZone}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Semantic Status Badge */}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                activeRide.status === 'COMPLETED'
                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                  : activeRide.status === 'STARTED'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : activeRide.status === 'DRIVER_ARRIVED'
                  ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {activeRide.status === 'COMPLETED'
                  ? 'Completed'
                  : activeRide.status === 'STARTED'
                  ? 'On the Way'
                  : activeRide.status === 'DRIVER_ARRIVED'
                  ? 'Driver Arrived'
                  : 'Driver on the Way'}
              </span>

              <button
                onClick={refreshRide}
                title="Sync Status"
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 active:scale-95 transition"
              >
                <RefreshCw className="h-3 w-3" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Telemetry Status Line: Minimalist single-line live indicator */}
          <div className="py-0.5">
            {activeRide.status === 'MATCHED' && (
              <div className="flex items-center gap-2 text-xs text-amber-900">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span className="font-medium truncate">Pilot Jashim is on the way in Bullet • ETA ~2 min</span>
              </div>
            )}

            {activeRide.status === 'DRIVER_ARRIVED' && (
              <div className="flex items-center gap-2 text-xs text-cyan-900">
                <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse shrink-0" />
                <span className="font-medium truncate">Bullet has arrived at {activeRide.pickupZone} • Please board now</span>
              </div>
            )}

            {activeRide.status === 'STARTED' && (
              <div className="flex items-center gap-2 text-xs text-blue-900">
                <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                <span className="font-medium truncate">Heading to {activeRide.destinationZone} • Cruising smoothly</span>
              </div>
            )}

            {activeRide.status === 'COMPLETED' && (
              <div className="flex items-center gap-2 text-xs text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="font-medium truncate">Arrived safely at {activeRide.destinationZone} • Fare paid</span>
              </div>
            )}
          </div>

          {/* Trip Details: Single-line tabular list */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500 text-[11px] whitespace-nowrap">
              <span>Pilot & Vehicle</span>
              <span className="text-slate-800 font-medium">
                {activeRide.pool?.driverName || 'Jashim Uddin'} • {activeRide.pool?.vehicleName || 'Bullet'}
              </span>
            </div>

            <div className="flex justify-between text-slate-500 text-[11px] whitespace-nowrap">
              <span>Co-Passengers</span>
              <span className="text-slate-800 font-mono font-medium">
                {activeRide.pool?.isShared ? `${activeRide.pool.coPassengersCount} Sharing` : 'Solo'}
              </span>
            </div>

            <div className="flex justify-between text-slate-900 font-semibold pt-1 border-t border-slate-100 whitespace-nowrap">
              <span>Trip Fare</span>
              <span className="font-mono text-emerald-700 tabular-nums text-sm">
                ৳{activeRide.fare?.totalFareBdt}
              </span>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 whitespace-nowrap">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" strokeWidth={2} />
            <span className="truncate">Zero-Trust Privacy: Passenger details strictly isolated</span>
          </div>

          {/* Action Button */}
          {activeRide.status !== 'COMPLETED' && activeRide.status !== 'STARTED' ? (
            <button
              onClick={handleCancel}
              className="w-full h-9 flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/60 text-rose-700 text-xs font-medium hover:bg-rose-100 transition"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
              <span>Cancel Reservation</span>
            </button>
          ) : activeRide.status === 'COMPLETED' ? (
            <button
              onClick={() => setActiveRide(null)}
              className="w-full h-10 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shadow-xs transition"
            >
              <span>Book Another Ride</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </section>
      )}
    </div>
  );
}
