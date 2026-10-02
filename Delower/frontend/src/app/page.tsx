'use client';

import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  ShieldCheck, 
  LogOut, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import DriverPortal from '@/components/DriverPortal';
import PassengerPortal from '@/components/PassengerPortal';
import AuthView from '@/components/AuthView';

export default function MobileAppShell() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshSync, setRefreshSync] = useState(0);
  const [showScenarioGuide, setShowScenarioGuide] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('dhaka_tesla_token');
      const storedUser = localStorage.getItem('dhaka_tesla_user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setCurrentUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Session restoration error', e);
    } finally {
      setAuthInitialized(true);
    }
  }, []);

  const handleAuthSuccess = (user: any, authToken: string) => {
    setCurrentUser(user);
    setToken(authToken);
    try {
      localStorage.setItem('dhaka_tesla_token', authToken);
      localStorage.setItem('dhaka_tesla_user', JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save session', e);
    }
    setRefreshSync((prev) => prev + 1);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    try {
      localStorage.removeItem('dhaka_tesla_token');
      localStorage.removeItem('dhaka_tesla_user');
    } catch (e) {
      console.error('Logout error', e);
    }
  };

  const handleDataRefresh = () => {
    setRefreshSync((prev) => prev + 1);
  };

  // 1-Click Reset Fleet to pristine 0/3 seats state
  const handleResetFleet = async () => {
    if (!token) return;
    setIsResetting(true);
    setResetNotice(null);
    try {
      const res = await fetch('http://localhost:5000/api/driver/reset-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setResetNotice('Bullet fleet reset: 3 seats available, ৳1,000 balances restored.');
        setTimeout(() => setResetNotice(null), 3500);
        setRefreshSync((prev) => prev + 1);
      }
    } catch (e) {
      console.error('Failed to reset demo fleet', e);
    } finally {
      setIsResetting(false);
    }
  };

  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center font-sans antialiased">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
          <span>Initializing Dhaka Tesla...</span>
        </div>
      </div>
    );
  }

  const isDriver = currentUser?.role === 'DRIVER';

  return (
    <div className="min-h-screen bg-slate-100/80 sm:py-6 flex items-center justify-center font-sans antialiased text-slate-900">
      {/* Viewport Shell: 420px clean standard without container clutter */}
      <div className="w-full max-w-[420px] min-h-screen sm:min-h-[840px] sm:max-h-[890px] bg-white flex flex-col justify-between sm:rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden relative">
        
        {/* Minimalist Top App Bar */}
        <header className="bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-40">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="font-semibold text-sm tracking-tight text-slate-900">
                  Dhaka Tesla Pool
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                {!currentUser 
                  ? 'Identity Portal' 
                  : isDriver 
                  ? 'Tesla Pilot • Bullet' 
                  : `${currentUser.fullName} • Passenger`}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Reset Fleet Utility Button */}
              {currentUser && (
                <button
                  onClick={handleResetFleet}
                  disabled={isResetting}
                  title="Reset Fleet & Pool to 0/3 Seats"
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 active:scale-95 transition"
                >
                  <RotateCcw className={`h-3.5 w-3.5 ${isResetting ? 'animate-spin text-emerald-600' : ''}`} />
                </button>
              )}

              {/* Scenario Guide Toggle Button */}
              <button
                onClick={() => setShowScenarioGuide(!showScenarioGuide)}
                title="Scenario Guide"
                className={`h-8 px-2 flex items-center gap-1 rounded-lg text-xs font-medium transition ${
                  showScenarioGuide 
                    ? 'bg-emerald-50 text-emerald-800' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <HelpCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span className="text-[11px] hidden sm:inline">Guide</span>
                {showScenarioGuide ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {/* User Profile Pill & Logout Button */}
              {currentUser && (
                <button
                  onClick={handleLogout}
                  title="Sign Out to Switch Persona"
                  className="h-8 px-2 flex items-center gap-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200/60 transition active:scale-95 text-[11px] font-semibold"
                >
                  <span className="truncate max-w-[65px]">{currentUser.fullName.split(' ')[0]}</span>
                  <LogOut className="h-3 w-3 text-slate-400 hover:text-rose-600 shrink-0" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Mobile Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Fleet Reset Banner */}
          {resetNotice && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-xs text-emerald-900 font-medium flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span className="truncate">{resetNotice}</span>
            </div>
          )}

          {/* Minimalist Collapsible PRD Story Guide */}
          {showScenarioGuide && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs text-slate-700 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500">
                  PRD Story Walkthrough
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  4 Invariant Steps
                </span>
              </div>
              
              <div className="space-y-1 text-[11px]">
                <div className="flex items-baseline justify-between py-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-900">1. Nusrat (1 Seat)</span>
                  <span className="text-slate-500">Banani → Mohakhali (Allocates #1)</span>
                </div>
                <div className="flex items-baseline justify-between py-1 border-b border-slate-100">
                  <span className="font-semibold text-slate-900">2. Rafiq (2 Seats)</span>
                  <span className="text-slate-500">Banani → Gulshan 1 (Bullet 3/3 Full)</span>
                </div>
                <div className="flex items-baseline justify-between py-1 border-b border-slate-100 text-rose-700">
                  <span className="font-semibold">3. Shirin (Cap Test)</span>
                  <span>Rejected with HTTP 409</span>
                </div>
                <div className="flex items-baseline justify-between py-1">
                  <span className="font-semibold text-slate-900">4. Jashim (Pilot)</span>
                  <span className="text-slate-500">Confirm Arrived → Start → Complete</span>
                </div>
              </div>
            </div>
          )}

          {/* AUTH ROUTED VIEW: Unauthenticated vs Role-Based Portal */}
          {!currentUser || !token ? (
            <AuthView onAuthSuccess={handleAuthSuccess} />
          ) : isDriver ? (
            <DriverPortal 
              onStateUpdate={handleDataRefresh} 
              currentUser={currentUser} 
              authToken={token} 
              refreshTrigger={refreshSync} 
            />
          ) : (
            <PassengerPortal 
              onRideBooked={handleDataRefresh} 
              currentUser={currentUser} 
              authToken={token} 
              refreshTrigger={refreshSync} 
            />
          )}

          {/* Micro Footer Invariant Note */}
          <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between whitespace-nowrap">
            <span className="flex items-center gap-1 font-medium">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
              <span>3-Seat Capacity Invariant</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-medium">
              <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
              <span>Integer Poysha Math</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
