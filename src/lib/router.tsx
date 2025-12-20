import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout from '@/components/AppLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'

// Profile & Resume Management
import ProfileOverviewPage from '@/sections/profile-resume-management/ProfileOverviewPage'
import ResumeEditorPage from '@/sections/profile-resume-management/ResumeEditorPage'
import ResumePreviewPage from '@/sections/profile-resume-management/ResumePreviewPage'
import LinkedInImportWizardPage from '@/sections/profile-resume-management/LinkedInImportWizardPage'
import EditProfilePage from '@/sections/profile-resume-management/EditProfilePage'
import WorkExperiencePage from '@/sections/profile-resume-management/WorkExperiencePage'
import EducationPage from '@/sections/profile-resume-management/EducationPage'
import SkillsPage from '@/sections/profile-resume-management/SkillsPage'

// Job Discovery & Matching
import JobListPage from '@/sections/job-discovery-matching/JobListPage'
import JobDetailPage from '@/sections/job-discovery-matching/JobDetailPage'

// Application Generator
import ApplicationListPage from '@/sections/application-generator/ApplicationListPage'
import ApplicationEditorPage from '@/sections/application-generator/ApplicationEditorPage'

// Application Tracker
import ApplicationTrackerListPage from '@/sections/application-tracker/ApplicationTrackerListPage'
import TrackerApplicationDetailPage from '@/sections/application-tracker/ApplicationDetailPage'
import ApplicationAnalyticsPage from '@/sections/application-tracker/ApplicationAnalyticsPage'

// Account & Billing
import SettingsPage from '@/sections/account-billing/SettingsPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <ProfileOverviewPage />,
      },
      {
        path: 'dashboard',
        element: <Navigate to="/" replace />,
      },
      {
        path: 'profile',
        element: <ProfileOverviewPage />,
      },
      {
        path: 'profile/edit-profile',
        element: <EditProfilePage />,
      },
      {
        path: 'profile/work-experience',
        element: <WorkExperiencePage />,
      },
      {
        path: 'profile/education',
        element: <EducationPage />,
      },
      {
        path: 'profile/skills',
        element: <SkillsPage />,
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
        path: 'analytics',
        element: <ApplicationAnalyticsPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
])
