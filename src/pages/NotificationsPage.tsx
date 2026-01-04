import React from 'react'
import { Bell, CheckCircle, AlertCircle, Info, BriefcaseIcon } from 'lucide-react'

interface Notification {
  id: string
  type: 'success' | 'warning' | 'info' | 'job'
  title: string
  message: string
  timestamp: string
  read: boolean
}

// Mock notifications data - this will be replaced with actual data from backend
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'job',
    title: 'New Job Match',
    message: 'A new Software Engineer position at Google matches your profile',
    timestamp: '2 hours ago',
    read: false,
  },
  {
    id: '2',
    type: 'success',
    title: 'Application Submitted',
    message: 'Your application to Meta was successfully submitted',
    timestamp: '1 day ago',
    read: false,
  },
  {
    id: '3',
    type: 'info',
    title: 'Profile Updated',
    message: 'Your resume has been updated successfully',
    timestamp: '3 days ago',
    read: true,
  },
]

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-5 h-5 text-emerald-500" />
    case 'warning':
      return <AlertCircle className="w-5 h-5 text-amber-500" />
    case 'job':
      return <BriefcaseIcon className="w-5 h-5 text-blue-500" />
    default:
      return <Info className="w-5 h-5 text-slate-500" />
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = React.useState(mockNotifications)

  const handleMarkAsRead = (id: string) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    ))
  }

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Bell className="w-8 h-8" />
              Notifications
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-12 text-center">
              <Bell className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`
                  bg-white dark:bg-slate-900 rounded-lg border
                  ${notification.read
                    ? 'border-slate-200 dark:border-slate-800'
                    : 'border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20'
                  }
                  p-4 transition-all hover:shadow-md
                `}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`
                        text-sm font-semibold
                        ${notification.read
                          ? 'text-slate-900 dark:text-slate-100'
                          : 'text-slate-900 dark:text-slate-100'
                        }
                      `}>
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-slate-500 dark:text-slate-500">
                        {notification.timestamp}
                      </span>
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Empty state info */}
        {notifications.length > 0 && (
          <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
              <Info className="w-4 h-4 inline mr-2" />
              This is a placeholder notifications page. Real-time notifications will be implemented in a future update.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
