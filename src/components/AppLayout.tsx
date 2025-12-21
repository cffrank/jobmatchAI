import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from './AppShell'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import type { NavigationItem } from './AppShell'

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logOut } = useAuth()

  // Map Firebase user to AppShell user format
  const appUser = {
    name: user?.displayName || user?.email?.split('@')[0] || 'User',
    email: user?.email || '',
    avatarUrl: user?.photoURL || undefined,
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
      label: 'Analytics',
      href: '/analytics',
      isActive: location.pathname === '/analytics',
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

  const handleLogout = async () => {
    try {
      await logOut()
      toast.success('Logged out successfully')
      navigate('/login')
    } catch {
      toast.error('Failed to log out')
    }
  }

  const handleNotificationsClick = () => {
    console.log('Notifications clicked')
    // TODO: Implement notifications
  }

  return (
    <AppShell
      navigationItems={navigationItems}
      user={appUser}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      notificationCount={3}
      onNotificationsClick={handleNotificationsClick}
    >
      <Outlet />
    </AppShell>
  )
}
