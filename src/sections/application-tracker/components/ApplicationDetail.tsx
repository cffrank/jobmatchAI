import { ArrowLeft, Calendar, Mail, Phone, Building2, MapPin, DollarSign, TrendingUp, Users, Clock, CheckCircle2, Circle, Trash2, Plus, ExternalLink, Sparkles, Edit2 } from 'lucide-react'
import { useState } from 'react'
import type { ApplicationDetailProps, InterviewEntry, FollowUpAction } from '../types'
import { getStatusColor, getStatusLabel, formatDate } from '../utils/statusHelpers'
import { StatusUpdateDialog } from './StatusUpdateDialog'

export function ApplicationDetail({
  application,
  onBack,
  onUpdateStatus,
  onAddNote,
  // onAddFollowUp: placeholder for future implementation
  onCompleteAction,
  // onScheduleInterview: placeholder for future implementation
  // onUpdateInterview: placeholder for future implementation
  onViewJob,
  onViewApplication,
  onArchive,
  onDelete
}: ApplicationDetailProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'interviews' | 'notes' | 'timeline'>('overview')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [showStatusDialog, setShowStatusDialog] = useState(false)


  const handleAddNote = () => {
    if (noteText.trim()) {
      onAddNote?.(noteText)
      setNoteText('')
      setIsAddingNote(false)
    }
  }

  const pendingActions = application.followUpActions.filter(a => !a.completed)

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50 dark:from-slate-950 dark:via-blue-950/10 dark:to-slate-950">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="mb-4 px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 transition-colors flex items-center gap-2 font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Applications
          </button>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                    {application.jobTitle}
                  </h1>
                  <button
                    onClick={() => setShowStatusDialog(true)}
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border text-sm font-medium transition-all hover:shadow-md ${getStatusColor(application.status)}`}
                  >
                    <span>{getStatusLabel(application.status)}</span>
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400 mb-4">
                  <div className="flex items-center gap-2 font-semibold text-lg">
                    <Building2 className="w-5 h-5" />
                    {application.company}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {application.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    {application.matchScore}% match
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Applied {formatDate(application.appliedDate)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    Last updated {formatDate(application.lastUpdated)}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onArchive}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
                >
                  Archive
                </button>
                <button
                  onClick={onDelete}
                  className="px-4 py-2 bg-red-100 dark:bg-red-950/30 hover:bg-red-200 dark:hover:bg-red-950/50 text-red-700 dark:text-red-400 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={onViewJob}
                className="flex-1 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                View Original Job Posting
              </button>
              <button
                onClick={onViewApplication}
                className="flex-1 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                View Application Materials
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="border-b border-slate-200 dark:border-slate-800">
                <div className="flex gap-1 p-1">
                  {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'interviews', label: `Interviews (${application.interviews.length})` },
                    { id: 'notes', label: 'Notes' },
                    { id: 'timeline', label: 'Timeline' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Contacts */}
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Contacts
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {application.recruiter && (
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Recruiter</p>
                            <p className="font-semibold text-slate-900 dark:text-slate-50 mb-2">{application.recruiter.name}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{application.recruiter.role}</p>
                            {application.recruiter.email && (
                              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mb-1">
                                <Mail className="w-4 h-4" />
                                {application.recruiter.email}
                              </div>
                            )}
                            {application.recruiter.phone && (
                              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                <Phone className="w-4 h-4" />
                                {application.recruiter.phone}
                              </div>
                            )}
                          </div>
                        )}
                        {application.hiringManager && (
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Hiring Manager</p>
                            <p className="font-semibold text-slate-900 dark:text-slate-50 mb-2">{application.hiringManager.name}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{application.hiringManager.role}</p>
                            {application.hiringManager.email && (
                              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mb-1">
                                <Mail className="w-4 h-4" />
                                {application.hiringManager.email}
                              </div>
                            )}
                            {application.hiringManager.phone && (
                              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                <Phone className="w-4 h-4" />
                                {application.hiringManager.phone}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Offer Details */}
                    {application.offerDetails && (
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4 flex items-center gap-2">
                          <DollarSign className="w-5 h-5" />
                          Offer Details
                        </h3>
                        <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-4">
                            <div>
                              <p className="text-sm text-emerald-700 dark:text-emerald-400 mb-1">Base Salary</p>
                              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-300">{application.offerDetails.salary}</p>
                            </div>
                            {application.offerDetails.equity && (
                              <div>
                                <p className="text-sm text-emerald-700 dark:text-emerald-400 mb-1">Equity</p>
                                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-300">{application.offerDetails.equity}</p>
                              </div>
                            )}
                          </div>
                          {application.offerDetails.benefits && application.offerDetails.benefits.length > 0 && (
                            <div className="mb-4">
                              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300 mb-2">Benefits</p>
                              <ul className="space-y-1">
                                {application.offerDetails.benefits.map((benefit, idx) => (
                                  <li key={idx} className="text-sm text-emerald-800 dark:text-emerald-400 flex items-start gap-2">
                                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>{benefit}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {application.offerDetails.deadline && (
                            <div className="pt-4 border-t border-emerald-200 dark:border-emerald-800">
                              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                                Decision deadline: <span className="font-semibold">{formatDate(application.offerDetails.deadline)}</span>
                              </p>
                            </div>
                          )}
                          {application.offerDetails.notes && (
                            <div className="mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-800">
                              <p className="text-sm text-emerald-800 dark:text-emerald-400">{application.offerDetails.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'interviews' && (
                  <div className="space-y-4">
                    {application.interviews.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                        <p className="text-slate-600 dark:text-slate-400">No interviews scheduled yet</p>
                      </div>
                    ) : (
                      application.interviews.map((interview) => (
                        <InterviewCard key={interview.id} interview={interview} />
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-900 dark:text-blue-300">{application.notes || 'No notes added yet'}</p>
                    </div>

                    {!isAddingNote ? (
                      <button
                        onClick={() => setIsAddingNote(true)}
                        className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-slate-700 dark:text-slate-300"
                      >
                        <Plus className="w-5 h-5" />
                        Add Note
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Add your notes here..."
                          rows={4}
                          className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-50 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddNote}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                          >
                            Save Note
                          </button>
                          <button
                            onClick={() => {
                              setIsAddingNote(false)
                              setNoteText('')
                            }}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'timeline' && (
                  <div className="space-y-4">
                    {application.activityLog.map((entry, idx) => (
                      <div key={entry.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full bg-blue-600 dark:bg-blue-400" />
                          {idx < application.activityLog.length - 1 && (
                            <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="flex items-start justify-between mb-1">
                            <p className="font-semibold text-slate-900 dark:text-slate-50">{entry.description}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{formatDate(entry.date)}</p>
                          </div>
                          {entry.details && (
                            <p className="text-sm text-slate-600 dark:text-slate-400">{entry.details}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Follow-up Actions */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">Follow-up Actions</h3>

              {pendingActions.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">No pending actions</p>
              ) : (
                <div className="space-y-3 mb-4">
                  {pendingActions.map((action) => (
                    <ActionCard
                      key={action.id}
                      action={action}
                      onComplete={() => onCompleteAction?.(action.id)}
                    />
                  ))}
                </div>
              )}

              <button className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" />
                Add Action
              </button>
            </div>

            {/* Status History */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">Status History</h3>
              <div className="space-y-3">
                {application.statusHistory.map((status, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        idx === 0 ? 'bg-blue-600 dark:bg-blue-400' : 'bg-slate-300 dark:bg-slate-600'
                      }`} />
                      {idx < application.statusHistory.length - 1 && (
                        <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1.5" />
                      )}
                    </div>
                    <div className="flex-1 pb-3">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {getStatusLabel(status.status)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(status.date)}</p>
                      {status.note && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{status.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Status Update Dialog */}
      {showStatusDialog && (
        <StatusUpdateDialog
        currentStatus={application.status}
        applicationTitle={`${application.jobTitle} at ${application.company}`}
        onUpdate={async (newStatus, note) => {
          if (onUpdateStatus) {
            await onUpdateStatus(newStatus, note)
            setShowStatusDialog(false)
          }
        }}
        onClose={() => setShowStatusDialog(false)}
        />
      )}
    </>
  )
}

interface InterviewCardProps {
  interview: InterviewEntry
}

function InterviewCard({ interview }: InterviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-slate-900 dark:text-slate-50">{interview.round}</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400">{new Date(interview.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-3 py-1 bg-blue-100 dark:bg-blue-950/30 hover:bg-blue-200 dark:hover:bg-blue-950/50 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium transition-colors"
        >
          {isExpanded ? 'Show Less' : 'Show More'}
        </button>
      </div>

      <div className="mb-3">
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Interviewers</p>
        <p className="text-sm text-slate-900 dark:text-slate-50">{interview.interviewers.join(', ')}</p>
      </div>

      <div className="mb-3">
        <p className="text-sm text-slate-900 dark:text-slate-50">{interview.notes}</p>
      </div>

      {isExpanded && (
        <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          {interview.preparation && interview.preparation.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Preparation</p>
              <ul className="space-y-1">
                {interview.preparation.map((item, idx) => (
                  <li key={idx} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                    <Circle className="w-3 h-3 mt-1 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {interview.questionsAsked && interview.questionsAsked.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Questions Asked</p>
              <ul className="space-y-1">
                {interview.questionsAsked.map((q, idx) => (
                  <li key={idx} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                    <Circle className="w-3 h-3 mt-1 flex-shrink-0" />
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {interview.reflection && (
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Reflection</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{interview.reflection}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ActionCardProps {
  action: FollowUpAction
  onComplete: () => void
}

function ActionCard({ action, onComplete }: ActionCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400'
      case 'medium':
        return 'bg-orange-100 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400'
      case 'low':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
      <div className="flex items-start gap-3">
        <button
          onClick={onComplete}
          className="mt-0.5 w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors flex items-center justify-center"
        >
          {action.completed && <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="font-medium text-slate-900 dark:text-slate-50 text-sm">{action.title}</p>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(action.priority)}`}>
              {action.priority}
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{action.description}</p>
          {action.dueDate && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Due: {new Date(action.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
