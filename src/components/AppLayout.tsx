import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from './AppShell'
import { useAuth } from '@/contexts/AuthContext'
import { useProfile } from '@/hooks/useProfile'
import { toast } from 'sonner'
import type { NavigationItem } from './AppShell'

export default function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logOut } = useAuth()
  const { profile } = useProfile()

  // Map Supabase user to AppShell user format
  const displayName = profile?.firstName
    ? `${profile.firstName}${profile.lastName ? ' ' + profile.lastName : ''}`
    : user?.email?.split('@')[0] || 'User'

  const appUser = {
    name: displayName,
    email: user?.email || '',
    avatarUrl: profile?.profileImageUrl || undefined,
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
    navigate('/notifications')
  }

  return (
    <AppShell
      navigationItems={navigationItems}
      user={appUser}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      notificationCount={3}
      onNotificationsClick={handleNotificationsClick}
      isNotificationsActive={location.pathname === '/notifications'}
    >
      <Outlet />
    </AppShell>
  )
}
