'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import {
  Home, Store, MessageCircle, User as UserIcon,
  Plus, LogOut, LayoutDashboard, Settings, ChevronDown, Package, Heart, Shield
} from 'lucide-react'

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [hasShop, setHasShop] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        supabase
          .from('shops')
          .select('id')
          .eq('owner_id', data.user.id)
          .maybeSingle()
          .then(({ data: shop }) => setHasShop(!!shop))

        supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle()
          .then(({ data: profile }) => setIsAdmin(!!profile?.role && profile.role !== 'user'))
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    setDropdownOpen(false)
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'ME'

  return (
    <>
      {/* ── Desktop Nav ── */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{ background: 'rgba(15,15,19,0.95)', borderColor: 'var(--border)', backdropFilter: 'blur(12px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="36" height="36" rx="9" fill="url(#logo-grad)"/>
              <defs>
                <linearGradient id="logo-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#f97316"/>
                  <stop offset="1" stop-color="#f59e0b"/>
                </linearGradient>
              </defs>
              {/* Nozzle body */}
              <rect x="15" y="5" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.95"/>
              {/* Nozzle tip */}
              <polygon points="15,11 18,15 21,11" fill="white" fillOpacity="0.95"/>
              {/* Top face of cube */}
              <polygon points="18,15 27,19.5 18,24 9,19.5" fill="white" fillOpacity="0.97"/>
              {/* Left face */}
              <polygon points="9,19.5 9,27 18,31.5 18,24" fill="white" fillOpacity="0.62"/>
              {/* Right face */}
              <polygon points="27,19.5 27,27 18,31.5 18,24" fill="white" fillOpacity="0.82"/>
              {/* Layer lines on right face */}
              <line x1="18.5" y1="26" x2="26.5" y2="21.8" stroke="#f97316" strokeWidth="0.8" strokeOpacity="0.55"/>
              <line x1="18.5" y1="28.5" x2="26.5" y2="24.3" stroke="#f97316" strokeWidth="0.8" strokeOpacity="0.55"/>
            </svg>
            <span className="text-xl font-black tracking-tight">
              3DPrinting<span style={{ color: 'var(--accent)' }}>BG</span>
            </span>
          </Link>

          {/* Center Links */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { href: '/', label: 'Обяви' },
              { href: '/stores', label: 'Магазини' },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  color: pathname === link.href ? 'var(--text)' : 'var(--muted)',
                  background: pathname === link.href ? 'var(--bg3)' : 'transparent',
                }}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <Link
                href="/messages"
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  color: pathname === '/messages' ? 'var(--text)' : 'var(--muted)',
                  background: pathname === '/messages' ? 'var(--bg3)' : 'transparent',
                }}
              >
                Съобщения
              </Link>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* New listing button — only if has shop */}
                {hasShop && (
                  <Link href="/dashboard/listings/new" className="btn-primary btn-sm hidden md:flex items-center gap-1.5">
                    <Plus size={15} />
                    Нова обява
                  </Link>
                )}

                {/* Open shop button — only if no shop */}
                {!hasShop && (
                  <Link href="/plans" className="btn-accent btn-sm hidden md:flex items-center gap-1.5">
                    🏪 Отвори магазин
                  </Link>
                )}

                {/* User avatar dropdown — always visible when logged in */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(o => !o)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all"
                    style={{
                      background: dropdownOpen ? 'var(--bg3)' : 'transparent',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Avatar circle */}
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                      style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)', color: '#fff' }}
                    >
                      {initials}
                    </div>
                    <ChevronDown size={13} style={{ color: 'var(--muted)', transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>

                  {/* Dropdown menu */}
                  {dropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-52 rounded-2xl border overflow-hidden shadow-2xl"
                      style={{ background: 'var(--card)', borderColor: 'var(--border)', zIndex: 100 }}
                    >
                      {/* User info header */}
                      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--muted)' }}>
                          {user.email}
                        </p>
                      </div>

                      {/* Menu items */}
                      <div className="p-1.5">
                        {hasShop && (
                          <Link
                            href="/dashboard"
                            onClick={() => setDropdownOpen(false)}
                            className="dropdown-item"
                          >
                            <LayoutDashboard size={15} />
                            Dashboard
                          </Link>
                        )}

                        {!hasShop && (
                          <Link
                            href="/plans"
                            onClick={() => setDropdownOpen(false)}
                            className="dropdown-item"
                          >
                            <Store size={15} />
                            Отвори магазин
                          </Link>
                        )}

                        {isAdmin && (
                          <Link
                            href="/admin"
                            onClick={() => setDropdownOpen(false)}
                            className="dropdown-item"
                            style={{ color: '#f97316' }}
                          >
                            <Shield size={15} />
                            Админ панел
                          </Link>
                        )}

                        <Link
                          href="/favorites"
                          onClick={() => setDropdownOpen(false)}
                          className="dropdown-item"
                        >
                          <Heart size={15} />
                          Любими
                        </Link>

                        <Link
                          href="/dashboard/my-orders"
                          onClick={() => setDropdownOpen(false)}
                          className="dropdown-item"
                        >
                          <Package size={15} />
                          Моите поръчки
                        </Link>

                        <Link
                          href="/dashboard/settings"
                          onClick={() => setDropdownOpen(false)}
                          className="dropdown-item"
                        >
                          <Settings size={15} />
                          Настройки
                        </Link>
                      </div>

                      {/* Sign out */}
                      <div className="p-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
                        <button
                          onClick={handleSignOut}
                          className="dropdown-item w-full text-left"
                          style={{ color: '#f87171' }}
                        >
                          <LogOut size={15} />
                          Излез
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-ghost btn-sm hidden md:block">Вход</Link>
                <Link href="/register" className="btn-primary btn-sm">Регистрация</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile Bottom Nav ── */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        <div className="flex justify-around items-center py-2 pb-safe">
          {[
            { href: '/', icon: <Home size={22} />, label: 'Начало' },
            { href: '/stores', icon: <Store size={22} />, label: 'Магазини' },
            { href: '/messages', icon: <MessageCircle size={22} />, label: 'Чат' },
            { href: user ? '/dashboard/settings' : '/login', icon: <UserIcon size={22} />, label: 'Профил' },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-3 py-1"
              style={{ color: pathname === item.href ? 'var(--accent)' : 'var(--muted)' }}
            >
              {item.icon}
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Global button styles */}
      <style>{`
        .btn-primary {
          display: inline-flex; align-items: center; gap: 6px;
          background: var(--accent); color: #fff;
          padding: 8px 16px; border-radius: 8px;
          font-size: 13px; font-weight: 600; border: none; cursor: pointer;
          transition: opacity 0.15s;
          text-decoration: none;
        }
        .btn-primary:hover { opacity: 0.88; }
        .btn-ghost {
          display: inline-flex; align-items: center; gap: 6px;
          background: transparent; color: var(--muted);
          padding: 8px 16px; border-radius: 8px;
          font-size: 13px; font-weight: 600;
          border: 1px solid var(--border); cursor: pointer;
          transition: all 0.15s; text-decoration: none;
        }
        .btn-ghost:hover { color: var(--text); border-color: var(--muted); }
        .btn-accent {
          display: inline-flex; align-items: center; gap: 6px;
          background: transparent; color: var(--accent);
          padding: 8px 16px; border-radius: 8px;
          font-size: 13px; font-weight: 600;
          border: 1.5px solid var(--accent); cursor: pointer;
          transition: all 0.15s; text-decoration: none;
        }
        .btn-accent:hover { background: rgba(249,115,22,0.1); }
        .btn-sm { padding: 7px 13px; font-size: 13px; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 8px); }
        .dropdown-item {
          display: flex; align-items: center; gap: 10px;
          width: 100%; padding: 9px 12px; border-radius: 10px;
          font-size: 13px; font-weight: 600;
          color: var(--text); text-decoration: none;
          background: transparent; border: none; cursor: pointer;
          transition: background 0.15s;
        }
        .dropdown-item:hover { background: var(--bg3); }
      `}</style>
    </>
  )
}
