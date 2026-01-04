import React from 'react'
import {
  User,
  Briefcase,
  FileText,
  LayoutDashboard,
  Settings,
  HelpCircle,
  Bell,
  BarChart3,
} from 'lucide-react'
import type { NavigationItem } from './AppShell'

export interface MainNavProps {
  items: NavigationItem[]
  onNavigate?: (href: string) => void
  notificationCount?: number
  onNotificationsClick?: () => void
  isNotificationsActive?: boolean
}

const iconMap: Record<string, React.ReactNode> = {
  'Profile & Resume': <User className="w-5 h-5" />,
  'Jobs': <Briefcase className="w-5 h-5" />,
  'Applications': <FileText className="w-5 h-5" />,
  'Tracker': <LayoutDashboard className="w-5 h-5" />,
  'Analytics': <BarChart3 className="w-5 h-5" />,
  'Settings': <Settings className="w-5 h-5" />,
  'Help': <HelpCircle className="w-5 h-5" />,
}

export function MainNav({
  items,
  onNavigate,
  notificationCount = 0,
  onNotificationsClick,
  isNotificationsActive = false,
}: MainNavProps) {
  return (
    <nav className="flex-1 overflow-y-auto py-4 px-3">
      <ul className="space-y-1">
        {items.map((item) => {
          const icon = item.icon || iconMap[item.label]

          return (
            <li key={item.href}>
              <button
                onClick={() => onNavigate?.(item.href)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                  text-sm font-medium transition-colors
                  ${
                    item.isActive
                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }
                `}
              >
                {icon}
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </button>
            </li>
          )
        })}

        {/* Notifications */}
        {onNotificationsClick && (
          <li className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={onNotificationsClick}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                text-sm font-medium transition-colors relative
                ${
                  isNotificationsActive
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }
              `}
            >
              <Bell className="w-5 h-5" />
              <span className="flex-1 text-left">Notifications</span>
              {notificationCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500 text-white">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
          </li>
        )}
      </ul>
    </nav>
  )
}
