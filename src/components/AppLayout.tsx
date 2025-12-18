import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from './AppShell'
import type { NavigationItem } from './AppShell'

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  const user = {
    name: 'Sarah Chen',
    email: 'sarah.chen@email.com',
  }

  const navigationItems: NavigationItem[] = [
    {
      label: 'Profile & Resume',
      href: '/',
      isActive: location.pathname === '/',
    },
    {
      label: 'Jobs',
      href: '/jobs',
      isActive: location.pathname === '/jobs',
    },
    {
      label: 'Applications',
      href: '/applications',
      isActive: location.pathname === '/applications',
    },
    {
      label: 'Tracker',
      href: '/tracker',
      isActive: location.pathname === '/tracker',
    },
    {
      label: 'Settings',
      href: '/settings',
      isActive: location.pathname === '/settings',
    },
  ]

  const handleNavigate = (href: string) => {
    navigate(href)
  }

  const handleLogout = () => {
    console.log('Logout clicked')
  }

  const handleNotificationsClick = () => {
    console.log('Notifications clicked')
  }

  return (
    <AppShell
      navigationItems={navigationItems}
      user={user}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      notificationCount={3}
      onNotificationsClick={handleNotificationsClick}
    >
      <Outlet />
    </AppShell>
  )
}
