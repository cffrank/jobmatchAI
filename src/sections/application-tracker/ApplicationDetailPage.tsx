import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ApplicationDetail } from './components/ApplicationDetail'
import data from './data.json'
import type { TrackedApplication, ApplicationStatus, InterviewEntry, FollowUpAction } from './types'

export default function ApplicationDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const [application, setApplication] = useState<TrackedApplication | undefined>(
    data.trackedApplications.find(app => app.id === id)
  )

  if (!application) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Application Not Found
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            The application you're looking for doesn't exist.
          </p>
          <button
            onClick={() => navigate('/tracker')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Back to Tracker
          </button>
        </div>
      </div>
    )
  }

  const handleBack = () => {
    navigate('/tracker')
  }

  const handleUpdateStatus = (status: ApplicationStatus, note?: string) => {
    setApplication({
      ...application,
      status,
      lastUpdated: new Date().toISOString(),
      activityLog: [
        ...application.activityLog,
        {
          id: `activity-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'status_change',
          description: `Status changed to ${status}${note ? `: ${note}` : ''}`,
          metadata: { previousStatus: application.status, newStatus: status, note }
        }
      ]
    })
    console.log('Update status:', status, note)
  }

  const handleAddNote = (note: string) => {
    setApplication({
      ...application,
      notes: [...application.notes, note],
      activityLog: [
        ...application.activityLog,
        {
          id: `activity-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'note',
          description: note,
          metadata: {}
        }
      ]
    })
    console.log('Add note:', note)
  }

  const handleAddFollowUp = (action: Omit<FollowUpAction, 'id'>) => {
    const newAction: FollowUpAction = {
      ...action,
      id: `followup-${Date.now()}`
    }
    setApplication({
      ...application,
      followUps: [...application.followUps, newAction]
    })
    console.log('Add follow-up:', newAction)
  }

  const handleScheduleInterview = (interview: Omit<InterviewEntry, 'id'>) => {
    const newInterview: InterviewEntry = {
      ...interview,
      id: `interview-${Date.now()}`
    }
    setApplication({
      ...application,
      interviews: [...application.interviews, newInterview],
      activityLog: [
        ...application.activityLog,
        {
          id: `activity-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'interview',
          description: `Interview scheduled: ${interview.round}`,
          metadata: { interview: newInterview }
        }
      ]
    })
    console.log('Schedule interview:', newInterview)
  }

  const handleArchive = () => {
    setApplication({
      ...application,
      archived: true
    })
    console.log('Archive application:', application.id)
    navigate('/tracker')
  }

  const handleDelete = () => {
    console.log('Delete application:', application.id)
    // In a real app, this would delete from backend
    navigate('/tracker')
  }

  return (
    <ApplicationDetail
      application={application}
      onBack={handleBack}
      onUpdateStatus={handleUpdateStatus}
      onAddNote={handleAddNote}
      onAddFollowUp={handleAddFollowUp}
      onScheduleInterview={handleScheduleInterview}
      onArchive={handleArchive}
      onDelete={handleDelete}
    />
  )
}
