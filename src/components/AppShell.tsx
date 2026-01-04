import React, { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { MainNav } from './MainNav'
import { UserMenu } from './UserMenu'

export interface NavigationItem {
  label: string
  href: string
  icon?: React.ReactNode
  isActive?: boolean
  badge?: number
}

export interface User {
  name: string
  email?: string
  avatarUrl?: string
}

export interface AppShellProps {
  children: React.ReactNode
  navigationItems: NavigationItem[]
  user?: User
  onNavigate?: (href: string) => void
  onLogout?: () => void
  notificationCount?: number
  onNotificationsClick?: () => void
  isNotificationsActive?: boolean
}

export function AppShell({
  children,
  navigationItems,
  user,
  onNavigate,
  onLogout,
  notificationCount = 0,
  onNotificationsClick,
  isNotificationsActive = false,
}: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-40 lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {isMobileMenuOpen ? (
            <X className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          ) : (
            <Menu className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          )}
        </button>
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          JobMatch AI
        </span>
        <div className="w-9" /> {/* Spacer for centering */}
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 lg:w-60
          bg-white dark:bg-slate-900
          border-r border-slate-200 dark:border-slate-800
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            JobMatch AI
          </h1>
        </div>

        {/* Navigation */}
        <MainNav
          items={navigationItems}
          onNavigate={(href) => {
            onNavigate?.(href)
            setIsMobileMenuOpen(false)
          }}
          notificationCount={notificationCount}
          onNotificationsClick={onNotificationsClick}
          isNotificationsActive={isNotificationsActive}
        />

        {/* User Menu */}
        {user && (
          <UserMenu
            user={user}
            onLogout={onLogout}
          />
        )}
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-16 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
