import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApplicationList } from './components/ApplicationList'
import { useTrackedApplications } from '@/hooks/useTrackedApplications'
import { X } from 'lucide-react'
import type { TrackedApplication, ApplicationStatus, ApplicationFilters } from './types'

export default function ApplicationTrackerListPage() {
  const navigate = useNavigate()
  const { trackedApplications, loading, error, updateTrackedApplication, archiveTrackedApplication, addTrackedApplication } = useTrackedApplications()
  const [filters, setFilters] = useState<ApplicationFilters>({
    statuses: [],
    showArchived: false
  })
  const [showNewApplicationDialog, setShowNewApplicationDialog] = useState(false)
  const [newApplicationForm, setNewApplicationForm] = useState({
    company: '',
    jobTitle: '',
    location: '',
    status: 'applied' as ApplicationStatus,
    appliedDate: new Date().toISOString().split('T')[0],
    matchScore: 0,
    notes: ''
  })

  const handleViewApplication = (id: string) => {
    navigate(`/tracker/${id}`)
  }

  const handleUpdateStatus = async (id: string, status: ApplicationStatus) => {
    try {
      await updateTrackedApplication(id, { status })
      console.log('Update status:', id, status)
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handleArchive = async (id: string) => {
    try {
      await archiveTrackedApplication(id)
      console.log('Archive application:', id)
    } catch (error) {
      console.error('Error archiving application:', error)
    }
  }

  const handleFilter = (newFilters: ApplicationFilters) => {
    setFilters(newFilters)
    console.log('Apply filters:', newFilters)
  }

  const handleSort = (field: keyof TrackedApplication, direction: 'asc' | 'desc') => {
    console.log('Sort by:', field, direction)
    // In a real app, this would sort the applications
  }

  const handleBulkUpdateStatus = async (ids: string[], status: ApplicationStatus) => {
    try {
      await Promise.all(ids.map(id => updateTrackedApplication(id, { status })))
      console.log('Bulk update status:', ids, status)
    } catch (error) {
      console.error('Error bulk updating status:', error)
    }
  }

  const handleBulkArchive = async (ids: string[]) => {
    try {
      await Promise.all(ids.map(id => archiveTrackedApplication(id)))
      console.log('Bulk archive:', ids)
    } catch (error) {
      console.error('Error bulk archiving:', error)
    }
  }

  const handleExport = (ids: string[], format: 'csv' | 'excel') => {
    console.log('Export applications:', ids, 'as', format)
    // In a real app, this would generate and download the file
  }

  const handleAddNewApplication = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addTrackedApplication({
        jobId: '',
        applicationId: '',
        company: newApplicationForm.company,
        jobTitle: newApplicationForm.jobTitle,
        location: newApplicationForm.location,
        matchScore: newApplicationForm.matchScore,
        status: newApplicationForm.status,
        appliedDate: newApplicationForm.appliedDate,
        statusHistory: [{
          status: newApplicationForm.status,
          date: newApplicationForm.appliedDate,
          note: 'Manually added application'
        }],
        interviews: [],
        followUpActions: [],
        notes: newApplicationForm.notes,
        activityLog: [{
          id: Date.now().toString(),
          date: new Date().toISOString(),
          type: 'note',
          description: 'Application created',
          details: newApplicationForm.notes
        }],
        archived: false
      })
      setShowNewApplicationDialog(false)
      setNewApplicationForm({
        company: '',
        jobTitle: '',
        location: '',
        status: 'applied',
        appliedDate: new Date().toISOString().split('T')[0],
        matchScore: 0,
        notes: ''
      })
    } catch (error) {
      console.error('Error adding new application:', error)
    }
  }

  // Apply filters - use trackedApplications from Firestore
  const filteredApplications = trackedApplications.filter(app => {
    if (!filters.showArchived && app.archived) return false
    if (filters.statuses && filters.statuses.length > 0 && !filters.statuses.includes(app.status)) return false
    if (filters.company && !app.company.toLowerCase().includes(filters.company.toLowerCase())) return false
    if (filters.jobTitle && !app.jobTitle.toLowerCase().includes(filters.jobTitle.toLowerCase())) return false
    if (filters.dateFrom && new Date(app.appliedDate) < new Date(filters.dateFrom)) return false
    if (filters.dateTo && new Date(app.appliedDate) > new Date(filters.dateTo)) return false
    return true
  })

  // Show loading state
  if (loading) {
    return <div className="p-8 text-center">Loading tracked applications...</div>
  }

  // Show error state
  if (error) {
    return <div className="p-8 text-center text-red-600">Error loading applications: {error.message}</div>
  }

  return (
    <>
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
        onAddNew={() => setShowNewApplicationDialog(true)}
      />

      {/* New Application Dialog */}
      {showNewApplicationDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Add New Application</h2>
              <button
                onClick={() => setShowNewApplicationDialog(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleAddNewApplication} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Company *
                  </label>
                  <input
                    type="text"
                    required
                    value={newApplicationForm.company}
                    onChange={(e) => setNewApplicationForm({ ...newApplicationForm, company: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Google"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newApplicationForm.jobTitle}
                    onChange={(e) => setNewApplicationForm({ ...newApplicationForm, jobTitle: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Software Engineer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={newApplicationForm.location}
                    onChange={(e) => setNewApplicationForm({ ...newApplicationForm, location: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., San Francisco, CA"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Applied Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newApplicationForm.appliedDate}
                    onChange={(e) => setNewApplicationForm({ ...newApplicationForm, appliedDate: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Status
                  </label>
                  <select
                    value={newApplicationForm.status}
                    onChange={(e) => setNewApplicationForm({ ...newApplicationForm, status: e.target.value as ApplicationStatus })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="applied">Applied</option>
                    <option value="screening">Screening</option>
                    <option value="interview_scheduled">Interview Scheduled</option>
                    <option value="interview_completed">Interview Completed</option>
                    <option value="offer">Offer</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                    <option value="withdrawn">Withdrawn</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Match Score (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newApplicationForm.matchScore}
                    onChange={(e) => setNewApplicationForm({ ...newApplicationForm, matchScore: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={newApplicationForm.notes}
                  onChange={(e) => setNewApplicationForm({ ...newApplicationForm, notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any notes about this application..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowNewApplicationDialog(false)}
                  className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                  Add Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
