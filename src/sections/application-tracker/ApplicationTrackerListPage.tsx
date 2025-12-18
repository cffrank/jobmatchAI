import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApplicationList } from './components/ApplicationList'
import data from './data.json'
import type { TrackedApplication, ApplicationStatus, ApplicationFilters } from './types'

export default function ApplicationTrackerListPage() {
  const navigate = useNavigate()
  const [applications, setApplications] = useState<TrackedApplication[]>(data.applications)
  const [filters, setFilters] = useState<ApplicationFilters>({
    statuses: [],
    showArchived: false
  })

  const handleViewApplication = (id: string) => {
    navigate(`/tracker/${id}`)
  }

  const handleUpdateStatus = (id: string, status: ApplicationStatus) => {
    setApplications(prevApps =>
      prevApps.map(app =>
        app.id === id
          ? {
              ...app,
              status,
              lastUpdated: new Date().toISOString(),
              activityLog: [
                ...app.activityLog,
                {
                  id: `activity-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  type: 'status_change' as const,
                  description: `Status changed to ${status}`,
                  metadata: { previousStatus: app.status, newStatus: status }
                }
              ]
            }
          : app
      )
    )
    console.log('Update status:', id, status)
  }

  const handleArchive = (id: string) => {
    setApplications(prevApps =>
      prevApps.map(app =>
        app.id === id ? { ...app, archived: true } : app
      )
    )
    console.log('Archive application:', id)
  }

  const handleFilter = (newFilters: ApplicationFilters) => {
    setFilters(newFilters)
    console.log('Apply filters:', newFilters)
  }

  const handleSort = (field: keyof TrackedApplication, direction: 'asc' | 'desc') => {
    console.log('Sort by:', field, direction)
    // In a real app, this would sort the applications
  }

  const handleBulkUpdateStatus = (ids: string[], status: ApplicationStatus) => {
    setApplications(prevApps =>
      prevApps.map(app =>
        ids.includes(app.id) ? { ...app, status } : app
      )
    )
    console.log('Bulk update status:', ids, status)
  }

  const handleBulkArchive = (ids: string[]) => {
    setApplications(prevApps =>
      prevApps.map(app =>
        ids.includes(app.id) ? { ...app, archived: true } : app
      )
    )
    console.log('Bulk archive:', ids)
  }

  const handleExport = (ids: string[], format: 'csv' | 'excel') => {
    console.log('Export applications:', ids, 'as', format)
    // In a real app, this would generate and download the file
  }

  // Apply filters
  const filteredApplications = applications.filter(app => {
    if (!filters.showArchived && app.archived) return false
    if (filters.statuses && filters.statuses.length > 0 && !filters.statuses.includes(app.status)) return false
    if (filters.company && !app.company.toLowerCase().includes(filters.company.toLowerCase())) return false
    if (filters.jobTitle && !app.jobTitle.toLowerCase().includes(filters.jobTitle.toLowerCase())) return false
    if (filters.dateFrom && new Date(app.appliedDate) < new Date(filters.dateFrom)) return false
    if (filters.dateTo && new Date(app.appliedDate) > new Date(filters.dateTo)) return false
    return true
  })

  return (
    <ApplicationList
      applications={filteredApplications}
      filters={filters}
      onViewApplication={handleViewApplication}
      onUpdateStatus={handleUpdateStatus}
      onArchive={handleArchive}
      onFilter={handleFilter}
      onSort={handleSort}
      onBulkUpdateStatus={handleBulkUpdateStatus}
      onBulkArchive={handleBulkArchive}
      onExport={handleExport}
    />
  )
}
