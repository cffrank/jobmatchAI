import { Calendar, ChevronDown, ChevronUp, Clock, Filter, Search, Archive, Download, MoreVertical, Eye, CheckCircle2, XCircle, AlertCircle, MinusCircle, TrendingUp, Plus, Mail, ArchiveIcon } from 'lucide-react'
import { useState } from 'react'
import type { ApplicationTrackerProps, TrackedApplication, ApplicationStatus } from '../types'
import { getStatusColor, getStatusLabel, formatDate, getDaysSince } from '../utils/statusHelpers'

export function ApplicationList({
  applications,
  // filters: placeholder for future implementation
  onViewApplication,
  onUpdateStatus,
  // onArchive: placeholder for future implementation
  // onFilter: placeholder for future implementation
  onSort,
  // onBulkUpdateStatus: placeholder for future implementation
  onBulkArchive,
  onExport,
  onAddNew
}: ApplicationTrackerProps & { onAddNew?: () => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [sortField, setSortField] = useState<keyof TrackedApplication>('lastUpdated')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus[]>([])

  const handleSort = (field: keyof TrackedApplication) => {
    const newDirection = field === sortField && sortDirection === 'desc' ? 'asc' : 'desc'
    setSortField(field)
    setSortDirection(newDirection)
    onSort?.(field, newDirection)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    setSelectedIds(prev =>
      prev.length === applications.length ? [] : applications.map(a => a.id)
    )
  }


  const getStatusIcon = (status: ApplicationStatus) => {
    switch (status) {
      case 'accepted':
      case 'offer_accepted':
        return <CheckCircle2 className="w-4 h-4" />
      case 'offer':
        return <TrendingUp className="w-4 h-4" />
      case 'interview_completed':
      case 'interview_scheduled':
        return <Clock className="w-4 h-4" />
      case 'screening':
        return <Eye className="w-4 h-4" />
      case 'applied':
        return <Clock className="w-4 h-4" />
      case 'response_received':
        return <Mail className="w-4 h-4" />
      case 'rejected':
      case 'offer_declined':
        return <XCircle className="w-4 h-4" />
      case 'withdrawn':
        return <MinusCircle className="w-4 h-4" />
      case 'abandoned':
        return <ArchiveIcon className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  // Filter and search applications
  const filteredApplications = applications.filter(app => {
    const matchesSearch =
      !searchQuery ||
      app.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter.length === 0 || statusFilter.includes(app.status)

    return matchesSearch && matchesStatus
  })

  // Stats
  const activeApplications = applications.filter(
    app => !['accepted', 'offer_accepted', 'rejected', 'offer_declined', 'withdrawn', 'abandoned'].includes(app.status)
  )
  const pendingActions = applications.filter(app => app.followUpActions.some(a => !a.completed))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 dark:from-slate-950 dark:via-blue-950/10 dark:to-slate-950">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2 tracking-tight">
                Application Tracker
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                Monitor status, manage follow-ups, and track your job search progress
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => onAddNew?.()}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">New Application</span>
              </button>
              <button
                onClick={() => onExport?.(applications.map(a => a.id), 'csv')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                <span className="hidden sm:inline">Export All</span>
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Applications</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{applications.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Active</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{activeApplications.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Pending Actions</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{pendingActions.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by company or job title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg font-medium transition-colors flex items-center gap-2 text-slate-700 dark:text-slate-300"
              >
                <Filter className="w-5 h-5" />
                Filters
                {statusFilter.length > 0 && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white rounded-full text-xs">
                    {statusFilter.length}
                  </span>
                )}
              </button>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Status</p>
                <div className="flex flex-wrap gap-2">
                  {(['applied', 'response_received', 'screening', 'interview_scheduled', 'interview_completed', 'offer', 'offer_accepted', 'offer_declined', 'accepted', 'rejected', 'withdrawn', 'abandoned'] as ApplicationStatus[]).map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        setStatusFilter(prev =>
                          prev.includes(status)
                            ? prev.filter(s => s !== status)
                            : [...prev, status]
                        )
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                        statusFilter.includes(status)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {getStatusLabel(status)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="mb-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                {selectedIds.length} application{selectedIds.length > 1 ? 's' : ''} selected
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => onBulkArchive?.(selectedIds)}
                  className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </button>
                <button
                  onClick={() => onExport?.(selectedIds, 'csv')}
                  className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Applications Table */}
        {filteredApplications.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-16 text-center">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">No applications found</h3>
            <p className="text-slate-600 dark:text-slate-400">
              {searchQuery || statusFilter.length > 0
                ? 'Try adjusting your search or filters'
                : 'Start tracking your job applications'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === applications.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                      />
                    </th>
                    <SortableHeader
                      field="company"
                      label="Company"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      field="jobTitle"
                      label="Job Title"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      field="status"
                      label="Status"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      field="appliedDate"
                      label="Applied"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      field="lastUpdated"
                      label="Last Update"
                      sortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Next Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      Days
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredApplications.map((app) => (
                    <tr
                      key={app.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                      onClick={() => onViewApplication?.(app.id)}
                    >
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(app.id)}
                          onChange={() => toggleSelect(app.id)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-50">
                          {app.company}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {app.location}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900 dark:text-slate-50">
                          {app.jobTitle}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          Match: {app.matchScore}%
                        </div>
                      </td>
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onUpdateStatus?.(app.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-sm font-medium transition-all hover:shadow-md ${getStatusColor(app.status)}`}
                        >
                          {getStatusIcon(app.status)}
                          <span>{getStatusLabel(app.status)}</span>
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-slate-900 dark:text-slate-50">
                          {formatDate(app.appliedDate)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-slate-900 dark:text-slate-50">
                          {formatDate(app.lastUpdated)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {app.nextAction ? (
                          <div className="text-sm">
                            <div className="font-medium text-slate-900 dark:text-slate-50">
                              {app.nextAction}
                            </div>
                            {app.nextActionDate && (
                              <div className="text-slate-500 dark:text-slate-400">
                                {formatDate(app.nextActionDate)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          {getDaysSince(app.appliedDate)}d
                        </div>
                      </td>
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                          <MoreVertical className="w-5 h-5 text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface SortableHeaderProps {
  field: keyof TrackedApplication
  label: string
  sortField: keyof TrackedApplication
  sortDirection: 'asc' | 'desc'
  onSort: (field: keyof TrackedApplication) => void
}

function SortableHeader({ field, label, sortField, sortDirection, onSort }: SortableHeaderProps) {
  const isActive = sortField === field

  return (
    <th
      className="px-4 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        <div className="flex flex-col">
          <ChevronUp
            className={`w-3 h-3 ${
              isActive && sortDirection === 'asc'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-300 dark:text-slate-600'
            }`}
          />
          <ChevronDown
            className={`w-3 h-3 -mt-1 ${
              isActive && sortDirection === 'desc'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-300 dark:text-slate-600'
            }`}
          />
        </div>
      </div>
    </th>
  )
}
