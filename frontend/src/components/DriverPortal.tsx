'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Power, 
  RefreshCw, 
  Navigation2, 
  Check, 
  Play, 
  MapPin, 
  AlertCircle,
  ShieldCheck,
  Star
} from 'lucide-react';
import SeatManifestHUD, { SeatInfo } from './SeatManifestHUD';

const ZONES = ['Banani', 'Gulshan 1', 'Gulshan 2', 'Mohakhali', 'Farmgate', 'Dhanmondi', 'Mirpur 10', 'Uttara', 'Bashundhara'];

interface DriverPortalProps {
  onStateUpdate?: () => void;
  currentUser?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    walletBalanceBdt?: string;
    vehicle?: any;
  } | null;
  authToken?: string | null;
  refreshTrigger?: number;
}

export default function DriverPortal({ 
  onStateUpdate, 
  currentUser, 
  authToken, 
  refreshTrigger = 0 
}: DriverPortalProps) {
  const [token, setToken] = useState<string | null>(authToken || null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [manifest, setManifest] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [transitioningId, setTransitioningId] = useState<string | null>(null);
  const [driverBalanceBdt, setDriverBalanceBdt] = useState<string>(currentUser?.walletBalanceBdt || '1000.00');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Authenticate Jashim automatically if no valid driver auth token provided
  const loginDriver = useCallback(async () => {
    if (authToken && currentUser?.role === 'DRIVER') {
      setToken(authToken);
      return authToken;
    }
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'jashim.driver@dhakatesla.com', password: 'tesla123' }),
      });
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        if (data.user?.walletBalanceBdt) {
          setDriverBalanceBdt(data.user.walletBalanceBdt);
        }
        return data.token;
      }
    } catch (e) {
      console.error('Failed to log in Driver', e);
    }
    return null;
  }, [authToken, currentUser]);

  // Fetch driver manifest & vehicle status
  const fetchManifest = useCallback(async (authTokenParam?: string) => {
    const activeToken = authTokenParam || token;
    if (!activeToken) return;

    try {
      const res = await fetch('http://localhost:5000/api/driver/manifest', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve manifest');
      }

      const data = await res.json();
      setManifest(data);
      if (data.driverWalletBalanceBdt) {
        setDriverBalanceBdt(data.driverWalletBalanceBdt);
      }
      if (data.vehicle) {
        setIsOnline(data.vehicle.isActive);
      }
    } catch (err: any) {
      console.error('Error fetching driver manifest', err);
    }
  }, [token]);

  // Sync token on prop change
  useEffect(() => {
    if (authToken && currentUser?.role === 'DRIVER') {
      setToken(authToken);
      fetchManifest(authToken);
    } else {
      (async () => {
        const activeToken = await loginDriver();
        if (activeToken) {
          fetchManifest(activeToken);
        }
      })();
    }
  }, [authToken, currentUser, fetchManifest, loginDriver]);

  // Initial load
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const activeToken = await loginDriver();
      if (isMounted && activeToken) {
        fetchManifest(activeToken);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [loginDriver, fetchManifest]);

  // REAL-TIME CONNECTION HEARTBEAT: Auto-sync manifest every 2.5s when Online
  useEffect(() => {
    if (!token || !isOnline) return;

    const interval = setInterval(() => {
      fetchManifest(token);
    }, 2500);

    return () => clearInterval(interval);
  }, [token, isOnline, fetchManifest]);

  // Sync on external refresh trigger
  useEffect(() => {
    if (token) {
      fetchManifest(token);
    }
  }, [refreshTrigger, token, fetchManifest]);

  // Toggle Online/Offline State
  async function handleToggleOnline() {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('http://localhost:5000/api/driver/toggle-online', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setIsOnline(data.isOnline);
        fetchManifest();
        if (onStateUpdate) onStateUpdate();
      } else {
        setErrorMsg(data.error || 'Failed to toggle status');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  }

  // FSM Transition Handler for Individual Passenger
  async function handleTransition(rideId: string, targetState: string) {
    if (!token) return;
    setTransitioningId(rideId);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`http://localhost:5000/api/driver/rides/${rideId}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetState }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.message || data.error || 'Transition rejected');
        return;
      }

      await fetchManifest();
      if (onStateUpdate) onStateUpdate();
    } catch (e: any) {
      setErrorMsg(e.message || 'Network error');
    } finally {
      setTransitioningId(null);
    }
  }

  // FSM Batch Transition Handler for All Passengers in Pool
  async function handleBatchTransition(targetState: string) {
    if (!token || activePassengers.length === 0) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      for (const p of (activePassengers as any[])) {
        await fetch(`http://localhost:5000/api/driver/rides/${p.rideId}/transition`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ targetState }),
        });
      }
      await fetchManifest();
      if (onStateUpdate) onStateUpdate();
    } catch (e: any) {
      setErrorMsg(e.message || 'Batch transition error');
    } finally {
      setLoading(false);
    }
  }

  // Driver repositioning handler (only allowed when occupiedCount === 0)
  async function handleReposition(zone: string) {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5000/api/driver/reposition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ zone }),
      });
      if (res.ok) {
        await fetchManifest();
        if (onStateUpdate) onStateUpdate();
      }
    } catch (e) {
      console.error('Reposition error', e);
    }
  }

  const pool = manifest?.pool;
  const vehicle = manifest?.vehicle || { name: 'Bullet', model: 'Tesla Electric', plate: 'DHA-HA-11-2024', capacity: 3 };
  const occupiedCount = pool?.occupiedSeats || 0;
  const rawSeats: SeatInfo[] = pool?.seats || [
    { seatNumber: 1, status: 'AVAILABLE', passengerName: null, destinationZone: null, fareBdt: null, allocatedSeats: 0 },
    { seatNumber: 2, status: 'AVAILABLE', passengerName: null, destinationZone: null, fareBdt: null, allocatedSeats: 0 },
    { seatNumber: 3, status: 'AVAILABLE', passengerName: null, destinationZone: null, fareBdt: null, allocatedSeats: 0 },
  ];

  // Unique active passenger rides
  const activePassengers = pool?.seats
    ? Array.from(
        new Map(
          pool.seats
            .filter((s: any) => s.status === 'OCCUPIED' && s.rideId)
            .map((s: any) => [s.rideId, s])
        ).values()
      )
    : [];

  const driverName = currentUser?.fullName || 'Jashim Uddin';
  const driverInitials = driverName.split(' ').map((n: string) => n[0]).join('').slice(0, 2);

  // State checks for batch actions
  const hasMatchedRides = activePassengers.some((p: any) => (p.rideStatus || 'MATCHED') === 'MATCHED');
  const hasArrivedRides = activePassengers.some((p: any) => p.rideStatus === 'DRIVER_ARRIVED');
  const hasStartedRides = activePassengers.some((p: any) => p.rideStatus === 'STARTED');

  return (
    <div className="space-y-4">
      {/* 1. Driver Profile & Live Telemetry: Open Layout */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3.5">
        {/* Top Bar: Driver Identity & Online Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white font-semibold text-xs tracking-wider">
                {driverInitials}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${
                isOnline ? 'bg-emerald-500' : 'bg-slate-400'
              }`} />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="font-semibold text-sm text-slate-900 truncate">{driverName}</span>
                <span className="text-[10px] text-slate-400 font-mono truncate">{vehicle.plate}</span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 whitespace-nowrap">
                <span className="inline-flex items-center gap-0.5 font-medium text-slate-700">
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  4.95
                </span>
                <span>•</span>
                <span className="truncate">{vehicle.name} (3 Seats)</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleToggleOnline}
            disabled={loading}
            className={`shrink-0 h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border whitespace-nowrap ${
              isOnline
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Power className="h-3 w-3" strokeWidth={2} />
            {isOnline ? 'Online' : 'Offline'}
          </button>
        </div>

        {/* Telemetry Metrics: Single-Line De-Containerized Layout */}
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block whitespace-nowrap">
              Wallet Balance
            </span>
            <span className="font-mono text-base font-semibold text-emerald-700 tabular-nums whitespace-nowrap block mt-0.5">
              ৳{driverBalanceBdt}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block whitespace-nowrap">
              Staging Hub
            </span>
            {occupiedCount === 0 ? (
              <div className="flex items-center gap-1 mt-0.5 text-xs font-medium text-slate-800 whitespace-nowrap">
                <MapPin className="h-3 w-3 text-emerald-600 shrink-0" strokeWidth={2} />
                <select
                  value={pool?.currentZone || 'Banani'}
                  onChange={(e) => handleReposition(e.target.value)}
                  className="bg-transparent font-medium text-xs text-slate-900 border-none outline-none cursor-pointer truncate p-0 hover:text-emerald-700 transition"
                  title="Click to relocate idle vehicle to another hub"
                >
                  {ZONES.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1 mt-0.5 text-xs font-medium text-slate-800 whitespace-nowrap truncate">
                <MapPin className="h-3 w-3 text-emerald-600 shrink-0" strokeWidth={2} />
                <span className="truncate">{pool?.currentZone || 'Banani'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span className="truncate">{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span className="truncate">{successMsg}</span>
          </div>
        )}
      </section>

      {/* 2. Physical 3-Seat Manifest HUD */}
      <SeatManifestHUD
        vehicleName={vehicle.name}
        vehicleModel={vehicle.model}
        capacity={vehicle.capacity || 3}
        occupiedSeats={occupiedCount}
        seats={rawSeats}
      />

      {/* 3. Passenger Dispatch & Lifecycle FSM Controls */}
      <section className="space-y-3 pt-1">
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="font-semibold text-slate-800">Active Passengers</span>
            {activePassengers.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
                {activePassengers.length}
              </span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {isOnline ? 'Live 2.5s' : 'Offline'}
          </span>
        </div>

        {/* BATCH ACTION CONTROLS: Single-line, purposeful */}
        {hasMatchedRides && (
          <button
            onClick={() => handleBatchTransition('DRIVER_ARRIVED')}
            disabled={loading}
            className="w-full h-9 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 active:scale-98 transition flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-900"
          >
            <Navigation2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span className="truncate">Confirm Arrival for All (Banani Hub)</span>
          </button>
        )}

        {hasArrivedRides && (
          <button
            onClick={() => handleBatchTransition('STARTED')}
            disabled={loading}
            className="w-full h-9 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 active:scale-98 transition flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-900"
          >
            <Play className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span className="truncate">Start Pooled Trip</span>
          </button>
        )}

        {hasStartedRides && (
          <button
            onClick={() => handleBatchTransition('COMPLETED')}
            disabled={loading}
            className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 transition flex items-center justify-center gap-1.5 text-xs font-semibold text-white shadow-xs"
          >
            <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span className="truncate">Complete Trips & Collect Fares</span>
          </button>
        )}

        {/* Passenger List: Clean borderless cards with single-line typography */}
        {activePassengers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 rounded-xl border border-dashed border-slate-200">
            Waiting for passengers at {pool?.currentZone || 'Banani'} Hub
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200/80 bg-white divide-y divide-slate-100 overflow-hidden">
            {activePassengers.map((p: any) => {
              const rideStatus = p.rideStatus || 'MATCHED';
              const isTransitioning = transitioningId === p.rideId;

              // Semantic badge class
              let statusBadge = 'bg-amber-50 text-amber-800 border-amber-200';
              let statusLabel = 'Reserved';

              if (rideStatus === 'DRIVER_ARRIVED') {
                statusBadge = 'bg-cyan-50 text-cyan-800 border-cyan-200';
                statusLabel = 'Boarding';
              } else if (rideStatus === 'STARTED') {
                statusBadge = 'bg-blue-50 text-blue-800 border-blue-200';
                statusLabel = 'Onboard';
              } else if (rideStatus === 'COMPLETED') {
                statusBadge = 'bg-slate-100 text-slate-600 border-slate-200';
                statusLabel = 'Paid';
              }

              return (
                <div key={p.rideId} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {p.passengerName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                        {p.allocatedSeats} {p.allocatedSeats > 1 ? 'Seats' : 'Seat'}
                      </span>
                      <span className="text-slate-300 text-xs">•</span>
                      <span className="text-[11px] text-slate-500 truncate">
                        {p.destinationZone}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 whitespace-nowrap">
                      <span className="font-mono font-medium text-emerald-700 tabular-nums">
                        ৳{p.fareBdt}
                      </span>
                      <span>•</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${statusBadge}`}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>

                  {/* Individual State Action Button */}
                  <div className="shrink-0">
                    {rideStatus === 'MATCHED' && (
                      <button
                        onClick={() => handleTransition(p.rideId, 'DRIVER_ARRIVED')}
                        disabled={isTransitioning}
                        className="h-8 px-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs font-medium flex items-center gap-1 hover:bg-amber-100 active:scale-95 transition whitespace-nowrap"
                      >
                        {isTransitioning ? (
                          <RefreshCw className="h-3 w-3 animate-spin" strokeWidth={2} />
                        ) : (
                          <Navigation2 className="h-3 w-3" strokeWidth={2} />
                        )}
                        Arrived
                      </button>
                    )}

                    {rideStatus === 'DRIVER_ARRIVED' && (
                      <button
                        onClick={() => handleTransition(p.rideId, 'STARTED')}
                        disabled={isTransitioning}
                        className="h-8 px-2.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-900 text-xs font-medium flex items-center gap-1 hover:bg-blue-100 active:scale-95 transition whitespace-nowrap"
                      >
                        {isTransitioning ? (
                          <RefreshCw className="h-3 w-3 animate-spin" strokeWidth={2} />
                        ) : (
                          <Play className="h-3 w-3" strokeWidth={2} />
                        )}
                        Start
                      </button>
                    )}

                    {rideStatus === 'STARTED' && (
                      <button
                        onClick={() => handleTransition(p.rideId, 'COMPLETED')}
                        disabled={isTransitioning}
                        className="h-8 px-2.5 rounded-lg bg-emerald-600 text-white text-xs font-medium flex items-center gap-1 hover:bg-emerald-500 active:scale-95 transition whitespace-nowrap shadow-xs"
                      >
                        {isTransitioning ? (
                          <RefreshCw className="h-3 w-3 animate-spin" strokeWidth={2} />
                        ) : (
                          <Check className="h-3 w-3" strokeWidth={2} />
                        )}
                        Complete
                      </button>
                    )}

                    {rideStatus === 'COMPLETED' && (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md whitespace-nowrap">
                        <Check className="h-3 w-3" strokeWidth={2} /> Paid
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
