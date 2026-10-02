'use client';

import React from 'react';

export interface SeatInfo {
  seatNumber: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'CONTESTED';
  passengerName?: string | null;
  destinationZone?: string | null;
  fareBdt?: string | null;
  rideStatus?: string | null;
  allocatedSeats?: number;
}

interface SeatManifestProps {
  vehicleName?: string;
  vehicleModel?: string;
  capacity?: number;
  occupiedSeats?: number;
  seats?: SeatInfo[];
}

export default function SeatManifestHUD({
  vehicleName = 'Bullet',
  vehicleModel = 'Tesla Electric',
  capacity = 3,
  occupiedSeats = 0,
  seats = [],
}: SeatManifestProps) {
  const isFull = occupiedSeats >= capacity;

  return (
    <section className="space-y-2.5">
      {/* Manifest Header: Single-line, minimal labeling */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-2 whitespace-nowrap min-w-0">
          <span className="font-semibold text-slate-800 truncate">
            {vehicleName}
          </span>
          <span className="text-slate-400 text-[11px]">•</span>
          <span className="text-[11px] text-slate-500 font-normal truncate">
            {vehicleModel}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-mono text-xs font-medium text-slate-600 tabular-nums">
            {occupiedSeats}/{capacity}
          </span>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md ${
              isFull
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            {isFull ? 'Full' : 'Open'}
          </span>
        </div>
      </div>

      {/* 3 Physical Seat Slots: Equal width, clean geometric breathing room */}
      <div className="grid grid-cols-3 gap-2.5">
        {seats.map((seat) => {
          const isOccupied = seat.status === 'OCCUPIED';
          const rideStatus = seat.rideStatus || 'MATCHED';

          // Semantic Telemetry Status: Reserved (Amber), Boarding (Cyan), Onboard (Blue), Paid (Slate)
          let statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
          let statusLabel = 'Reserved';

          if (rideStatus === 'DRIVER_ARRIVED') {
            statusBadgeClass = 'bg-cyan-50 text-cyan-800 border-cyan-200';
            statusLabel = 'Boarding';
          } else if (rideStatus === 'STARTED') {
            statusBadgeClass = 'bg-blue-50 text-blue-800 border-blue-200';
            statusLabel = 'Onboard';
          } else if (rideStatus === 'COMPLETED') {
            statusBadgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
            statusLabel = 'Paid';
          }

          return (
            <div
              key={seat.seatNumber}
              className={`flex flex-col justify-between rounded-xl p-3 min-h-[92px] border transition-all ${
                isOccupied
                  ? 'border-slate-200 bg-white shadow-xs'
                  : 'border-dashed border-slate-200 bg-slate-50/50 text-slate-400'
              }`}
            >
              {/* Slot Header */}
              <div className="flex items-center justify-between gap-1 text-[11px] whitespace-nowrap">
                <span className="font-mono font-semibold text-slate-500">
                  #{seat.seatNumber}
                </span>
                {isOccupied ? (
                  <span
                    className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${statusBadgeClass} shrink-0`}
                  >
                    {statusLabel}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">
                    Empty
                  </span>
                )}
              </div>

              {/* Slot Body */}
              {isOccupied ? (
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate whitespace-nowrap">
                    {seat.passengerName}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate whitespace-nowrap">
                    {seat.destinationZone}
                  </p>
                  <p className="font-mono text-[11px] font-medium text-emerald-700 tabular-nums whitespace-nowrap pt-0.5">
                    ৳{seat.fareBdt}
                  </p>
                </div>
              ) : (
                <div className="py-2 text-center">
                  <span className="text-[11px] text-slate-300 font-light">
                    Available
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
