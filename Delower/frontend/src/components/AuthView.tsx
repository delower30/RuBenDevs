'use client';

import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  User, 
  Phone, 
  Car, 
  Users, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface AuthViewProps {
  onAuthSuccess: (user: any, token: string) => void;
}

const DEMO_PERSONAS = [
  {
    name: 'Jashim Uddin',
    email: 'jashim.driver@dhakatesla.com',
    role: 'DRIVER',
    label: 'Pilot • Bullet (3 Seats)',
    badge: 'Driver',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
    icon: Car,
  },
  {
    name: 'Nusrat Jahan',
    email: 'nusrat@dhakatesla.com',
    role: 'PASSENGER',
    label: '1 Seat • Banani → Mohakhali',
    badge: 'Passenger 1',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: Users,
  },
  {
    name: 'Rafiqul Islam',
    email: 'rafiq@dhakatesla.com',
    role: 'PASSENGER',
    label: '2 Seats • Banani → Gulshan 1',
    badge: 'Passenger 2',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: Users,
  },
  {
    name: 'Shirin Akter',
    email: 'shirin@dhakatesla.com',
    role: 'PASSENGER',
    label: 'Capacity Test (Rejection 409)',
    badge: 'Passenger 3',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    icon: Users,
  },
];

export default function AuthView({ onAuthSuccess }: AuthViewProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form state
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [role, setRole] = useState<'PASSENGER' | 'DRIVER'>('PASSENGER');
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Manual Login
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Authentication failed. Please verify credentials.');
        return;
      }

      onAuthSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMsg(err.message || 'Connection error.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Persona 1-Tap Login
  const handleQuickLogin = async (email: string) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'tesla123' }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Quick login failed.');
        return;
      }

      onAuthSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMsg(err.message || 'Connection error.');
    } finally {
      setLoading(false);
    }
  };

  // User Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !regEmail || !phone || !regPassword) {
      setErrorMsg('All fields are required.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: regEmail.trim(),
          phone: phone.trim(),
          password: regPassword,
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Registration failed.');
        return;
      }

      setSuccessMsg('Account created with ৳1,000 wallet balance! Logging in...');
      setTimeout(() => {
        onAuthSuccess(data.user, data.token);
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration connection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Brand Header: Quiet, de-containerized */}
      <div className="text-center py-2 space-y-1">
        <h2 className="text-base font-semibold text-slate-900 tracking-tight">
          Dhaka Tesla Pool
        </h2>
        <p className="text-xs text-slate-500">
          Electric rickshaw shared pooling
        </p>
      </div>

      {/* Segmented Auth Switcher */}
      <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => { setTab('login'); setErrorMsg(null); }}
          className={`flex-1 py-1.5 rounded-lg transition ${
            tab === 'login' 
              ? 'bg-white text-slate-900 shadow-xs' 
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => { setTab('register'); setErrorMsg(null); }}
          className={`flex-1 py-1.5 rounded-lg transition ${
            tab === 'register' 
              ? 'bg-white text-slate-900 shadow-xs' 
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Create Account
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
          <span className="truncate">{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
          <span className="truncate">{successMsg}</span>
        </div>
      )}

      {/* TAB 1: LOGIN */}
      {tab === 'login' && (
        <div className="space-y-4">
          {/* 1-Tap Fast Persona Switcher: Clean single-line rows */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs px-0.5">
              <span className="font-semibold text-slate-800">
                1-Tap Demo Personas
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Evaluator Cast
              </span>
            </div>

            <div className="space-y-1.5">
              {DEMO_PERSONAS.map((p) => {
                const IconComponent = p.icon;
                return (
                  <button
                    key={p.email}
                    type="button"
                    onClick={() => handleQuickLogin(p.email)}
                    disabled={loading}
                    className="w-full h-11 px-3 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100/80 active:scale-[0.99] transition flex items-center justify-between gap-2.5 text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <IconComponent className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={1.75} />
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-900 block truncate">
                          {p.name}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate block">
                          {p.label}
                        </span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0 ${p.badgeClass}`}>
                      {p.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Standard Credentials Form */}
          <form onSubmit={handleLogin} className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="nusrat@dhakatesla.com"
                  className="w-full pl-9 pr-3 h-9 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:border-slate-400 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 h-9 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:border-slate-400 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50 mt-1"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: REGISTER */}
      {tab === 'register' && (
        <form onSubmit={handleRegister} className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3">
          {/* Role Selection */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Account Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('PASSENGER')}
                className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  role === 'PASSENGER'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span>Passenger</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('DRIVER')}
                className={`h-9 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                  role === 'DRIVER'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 bg-slate-50/60 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Car className="h-3.5 w-3.5 shrink-0" />
                <span>Tesla Pilot</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tania Ahmed"
                className="w-full pl-9 pr-3 h-9 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:border-slate-400 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="tania@dhakatesla.com"
                className="w-full pl-9 pr-3 h-9 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:border-slate-400 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880 1711-000000"
                className="w-full pl-9 pr-3 h-9 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:border-slate-400 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-9 pr-3 h-9 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white focus:outline-none focus:border-slate-400 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50 mt-1"
          >
            <span>{loading ? 'Creating Account...' : 'Create Account (৳1,000 Wallet)'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </form>
      )}

      {/* Security Note */}
      <div className="text-[11px] text-slate-400 text-center py-1">
        Zero-Trust Privacy • Signed JWT Auth
      </div>
    </div>
  );
}
