import { createBrowserRouter } from 'react-router-dom'
import AppLayout from '@/components/AppLayout'

// Profile & Resume Management
import ProfileOverviewPage from '@/sections/profile-resume-management/ProfileOverviewPage'
import ResumeEditorPage from '@/sections/profile-resume-management/ResumeEditorPage'
import ResumePreviewPage from '@/sections/profile-resume-management/ResumePreviewPage'
import LinkedInImportWizardPage from '@/sections/profile-resume-management/LinkedInImportWizardPage'

// Job Discovery & Matching
import JobListPage from '@/sections/job-discovery-matching/JobListPage'
import JobDetailPage from '@/sections/job-discovery-matching/JobDetailPage'

// Application Generator
import ApplicationListPage from '@/sections/application-generator/ApplicationListPage'
import ApplicationEditorPage from '@/sections/application-generator/ApplicationEditorPage'

// Application Tracker
import ApplicationTrackerListPage from '@/sections/application-tracker/ApplicationTrackerListPage'
import TrackerApplicationDetailPage from '@/sections/application-tracker/ApplicationDetailPage'

// Account & Billing
import SettingsPage from '@/sections/account-billing/SettingsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <ProfileOverviewPage />,
      },
      {
        path: 'profile',
        element: <ProfileOverviewPage />,
      },
      {
        path: 'profile/edit',
        element: <ResumeEditorPage />,
      },
      {
        path: 'profile/preview',
        element: <ResumePreviewPage />,
      },
      {
        path: 'profile/import',
        element: <LinkedInImportWizardPage />,
      },
      {
        path: 'jobs',
        element: <JobListPage />,
      },
      {
        path: 'jobs/:id',
        element: <JobDetailPage />,
      },
      {
        path: 'applications',
        element: <ApplicationListPage />,
      },
      {
        path: 'applications/:id',
        element: <ApplicationEditorPage />,
      },
      {
        path: 'tracker',
        element: <ApplicationTrackerListPage />,
      },
      {
        path: 'tracker/:id',
        element: <TrackerApplicationDetailPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
])
