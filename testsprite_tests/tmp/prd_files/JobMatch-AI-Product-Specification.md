# JobMatch AI - Complete Product Specification

## Product Overview

JobMatch AI is an intelligent job application assistant that saves active job seekers hours of work by automating the entire application process - from LinkedIn profile import and resume generation to AI-powered job matching, customized application materials, and smart follow-up tracking.

### Problems & Solutions

#### Problem 1: Time wasted customizing applications
JobMatch AI uses Claude AI to automatically generate tailored resumes and cover letters for each job, pulling from your LinkedIn profile and highlighting the most relevant experience.

#### Problem 2: Applying to wrong-fit jobs
AI-powered job matching analyzes every job posting against your skills and experience, generating a 0-100% compatibility score and flagging skill gaps before you apply.

#### Problem 3: Losing track of applications
Comprehensive application tracker with status management (applied, pending, interviewing, rejected) and AI-suggested follow-up timing with pre-generated email templates.

#### Problem 4: Generic, low-quality materials
LinkedIn integration auto-generates professional resumes in multiple formats, with AI analyzing your profile against best practices and suggesting improvements.

#### Problem 5: Manual job discovery
Automated job scraping from Indeed, LinkedIn, and other boards delivers relevant opportunities directly to your personalized dashboard.

### Key Features

- LinkedIn OAuth integration with one-time profile import
- AI-powered resume generation and optimization
- Automated job scraping and centralized job database
- Intelligent job-to-candidate matching with compatibility scores
- Customized cover letters and tailored resumes per application
- Application tracking dashboard with status management
- Smart follow-up suggestions and email template generation
- Tiered subscription model (Basic: limited applications, Premium: unlimited with advanced AI)

---

## Section 1: Profile & Resume Management

### Overview
Profile & Resume Management allows users to connect their LinkedIn account via a step-by-step wizard, import profile data, and manage their master resume. Users can view and edit their profile information, receive AI-powered optimization suggestions in a sidebar panel, and download their resume in multiple formats.

### User Flows
- Connect LinkedIn account via step-by-step import wizard
- View profile overview with personal info, work experience, skills, and education
- Edit resume content in dedicated resume editor
- Review AI optimization suggestions displayed in sidebar panel
- Preview and download master resume in multiple formats (PDF, DOCX, etc.)

### UI Requirements
- Profile overview page displaying personal info & contact, work experience timeline, skills & endorsements, and education history
- LinkedIn import wizard with step-by-step flow for connecting and importing data
- Resume editor interface for manual content editing
- Resume preview/download page with multiple format options
- AI suggestions sidebar panel showing optimization recommendations
- After completing LinkedIn import, redirect user to profile overview page

### Out of Scope
- Creating tailored resumes for specific jobs (handled in Application Generator section)
- Tracking which resume was used for which job (handled in Application Tracker)
- Subscription/payment features (handled in Account & Billing)
- Job search or matching functionality (handled in Job Discovery & Matching)

---

## Section 2: Job Discovery & Matching

### Overview
A job discovery interface where users browse jobs from multiple boards, view AI-powered compatibility scores and skill gap analysis, save interesting positions, and initiate the application process. Users can search and filter jobs to find the best matches based on their profile.

### User Flows
- Browse jobs in a card-based list view with real-time filtering and search
- Click on a job card to view full details, compatibility analysis, and skill gaps
- Save jobs using a bookmark icon for later review
- Filter jobs by keyword, match score range, location/remote options, and salary range
- View saved jobs in a filtered list view
- Click "Apply" button to start application process (transitions to Application Generator section)

### UI Requirements
- List view with job cards displaying: job title, company, location, salary range, prominent match score, top 3-5 required skills, skill gap indicator
- Search bar with keyword search across job title, company name, and skills
- Filter controls for match score range, location/remote options, and salary range
- Bookmark icon on each card to save/unsave jobs
- Job detail view containing: full job description, detailed compatibility breakdown explaining the match score, skill gap analysis with improvement recommendations, prominent "Apply" button
- Visual match score indicators (percentage with color coding - high/medium/low matches)
- Skill gap badges showing which required skills the user currently lacks

---

## Section 3: Application Generator

### Overview
The Application Generator uses AI to create tailored resumes and cover letters for specific job postings. Users can generate customized application materials with one click, review multiple AI-generated variants, edit content using form-based editing, and submit applications via multiple channels.

### User Flows
- Select a job from Job Discovery & Matching to generate application materials for
- Click "Generate" to have AI create tailored resume and cover letter automatically based on user's profile and job requirements
- Review multiple AI-generated versions/variants side-by-side with the original job posting
- View AI explanations showing why certain skills and experiences were highlighted
- Edit generated content using form-based editing (structured fields for summary, experience bullets, etc.)
- Track edit history to see changes from original AI output
- Save as draft for later refinement
- Export to PDF/DOCX for manual submission on company websites
- Send application via email directly from the platform
- Submit application (automatically creates tracking entry in Application Tracker section)

### UI Requirements
- One-click "Generate Application" button that triggers AI generation
- Side-by-side view showing job posting alongside generated resume/cover letter
- Multiple variants display (2-3 different AI-generated versions to choose from)
- AI rationale panel explaining the customization choices made
- Form-based editor with structured fields for editing (summary, work experience bullets, skills, etc.)
- Edit history indicator showing what has been modified from AI original
- Preview mode to see formatted output
- Action bar with: Save Draft, Export (PDF/DOCX), Email, and Submit buttons
- Status indicators (Draft, In Progress, Submitted)

---

## Section 4: Application Tracker

### Overview
A comprehensive application tracking system that helps users monitor the status of all submitted job applications, manage follow-ups, track timelines, and analyze their job search effectiveness. Provides a list/table view with detailed tracking, analytics, and actionable insights.

### Key Features

#### 1. Application List View
- **Primary View**: Sortable table/list showing all applications
- **Columns**: Company, Job Title, Status, Applied Date, Last Update, Next Action, Days Since Applied
- **Sorting & Filtering**:
  - Sort by any column (date, status, company)
  - Filter by status, date range, company
  - Search by job title or company name
- **Status Badges**: Color-coded visual indicators for each status stage
- **Quick Actions**: Update status, add note, schedule follow-up, archive

#### 2. Application Status Lifecycle
Track applications through these stages:
- **Applied**: Initial submission
- **Screening**: Under initial review
- **Interview Scheduled**: Interview date set
- **Interview Completed**: Waiting for feedback
- **Offer**: Job offer received
- **Accepted**: Offer accepted
- **Rejected**: Application/interview rejected
- **Withdrawn**: User withdrew application

#### 3. Follow-up Management
- **Automated Reminders**:
  - "It's been 2 weeks since you applied - consider following up"
  - "Interview tomorrow - review your prep notes"
  - "Offer decision deadline approaching"
- **Action Items**:
  - Send thank-you email after interview
  - Prepare for upcoming interview
  - Research company before screening call
  - Negotiate offer
- **Timeline Tracking**:
  - Application submitted date
  - Each status change timestamp
  - Interview dates and times
  - Response deadlines
  - Follow-up activity log

#### 4. Application Detail View
When viewing a single application in detail:
- **Job Information**: Link to original job posting, company details, match score
- **Application Materials**: View submitted resume/cover letter, download documents
- **Interview Notes**: Free-form notes, interviewer names, questions asked
- **Contact Information**: Recruiter name, email, phone, hiring manager details
- **Activity Timeline**: All status changes, follow-up actions, email/call history

#### 5. Bulk Actions
- **Bulk Status Update**: Select multiple applications and update status at once
- **Archive Applications**: Move old/inactive applications to archive
- **Bulk Delete**: Remove applications from drafts or archived items
- **Export Selected**: Export application data to CSV/Excel

#### 6. Analytics Dashboard
Track job search effectiveness:
- **Response Rate**: Percentage of applications that get responses
- **Time Metrics**: Average time from application to first response, interview, offer
- **Success Patterns**: Response rate by company size/industry, best performing resume variants
- **Pipeline Health**: Applications by status (pie/bar chart), active applications trend

---

## Section 5: Account & Billing

### Overview
A comprehensive account management and subscription system that allows users to manage their profile, security settings, notification preferences, and subscription plans. Features a freemium model with Basic (free) and Premium (paid) tiers, with usage limits enforced on the Basic tier.

### Key Features

#### 1. Account Settings

**Profile Information**:
- Personal details (name, email, phone, avatar)
- Inline editing with save/cancel
- Email verification when changed

**Password & Security**:
- Change password functionality
- Two-Factor Authentication (2FA) with authenticator app
- Active sessions management
- Account activity log

**Notification Preferences**:
- Email notifications (application updates, reminders, job digest)
- In-app notifications (desktop, sound)
- Frequency settings (immediate, daily, weekly)

**Privacy Settings**:
- Data visibility controls
- Export personal data (GDPR compliance)
- Delete account option
- Manage third-party integrations (LinkedIn, Google)

#### 2. Subscription Plans

**Basic Tier (Free)**:
- Maximum 10 tracked applications
- Maximum 3 resume variants
- Maximum 50 job searches per month
- Core features included
- Upgrade prompts when hitting limits

**Premium Tier (Paid)**:
- Pricing: $19/month or $15/month (annual at $180/year - save $48)
- Unlimited tracked applications
- Unlimited resume variants
- Unlimited job searches
- Priority AI generation
- Advanced analytics
- Email support
- 14-day free trial for new users

#### 3. Billing Management

**Current Plan Overview**:
- Display current tier and billing cycle
- Next billing date
- Current usage vs. limits (for Basic tier)
- Plan features with checkmarks

**Usage Limits (Basic Tier Only)**:
- Visual progress bars for applications (X/10), resume variants (X/3), job searches (X/50)
- Warning states when approaching limits
- Upgrade prompts

**Billing History**:
- Invoice list with date, amount, payment method, status
- Download invoice (PDF)
- Pagination and filters

**Payment Methods**:
- Saved credit/debit cards (last 4 digits)
- Add/remove payment methods
- Set default payment method
- PCI-compliant security

**Subscription Actions**:
- Upgrade from Basic to Premium (immediate with prorated billing)
- Downgrade from Premium to Basic (effective at period end)
- Change billing cycle (monthly/annual)
- Cancel subscription with confirmation flow

#### 4. Integration with Other Sections

**Feature Gating**:
- Application Generator: Limit to 3 resume variants on Basic
- Application Tracker: Limit to 10 tracked applications on Basic
- Job Discovery: Limit to 50 job searches per month on Basic

**Upgrade Prompts**:
- Contextual prompts when hitting limits
- Clear explanation of benefits
- Direct CTA to upgrade page

**Post-Upgrade Experience**:
- Immediate feature access
- Confirmation message
- Optional quick tour of Premium features

---

## User Flow Examples

### Primary Flow: Complete Job Application Journey
1. User imports LinkedIn profile (Profile & Resume Management)
2. AI generates and optimizes master resume
3. User browses jobs with match scores (Job Discovery & Matching)
4. User clicks "Apply" on a 92% match job
5. AI generates tailored resume and cover letter (Application Generator)
6. User reviews and submits application
7. Application automatically tracked (Application Tracker)
8. User receives follow-up reminders at appropriate times
9. User updates status after interview
10. User analyzes job search effectiveness in analytics dashboard

### Secondary Flow: Free to Premium Conversion
1. Basic tier user tracks 8 applications
2. User tries to track 11th application
3. Upgrade prompt appears: "You've reached your limit of 10 applications"
4. User clicks "Upgrade to Premium"
5. User views plan comparison
6. User selects Premium Annual ($15/month)
7. User enters payment information
8. Payment processed successfully
9. User immediately gets unlimited tracking
10. Confirmation email with invoice sent

---

## Technical Requirements

### Tech Stack
- React 19 with TypeScript
- Vite for build tooling
- React Router DOM 7 for navigation
- Tailwind CSS v4 for styling
- shadcn/ui components (new-york style)
- Radix UI primitives
- Lucide React for icons

### Authentication
- OAuth integration with LinkedIn
- Email/password authentication
- Two-Factor Authentication (2FA)
- Session management

### AI Integration
- Claude AI for resume optimization
- Job matching algorithms
- Cover letter generation
- Follow-up email templates

### Data Storage
- User profiles and resumes
- Job listings database
- Application tracking records
- Subscription and billing data

### External Integrations
- LinkedIn API (OAuth, profile import)
- Job board APIs (Indeed, LinkedIn Jobs)
- Payment processor (Stripe recommended)
- Email service provider

### Security & Compliance
- PCI-DSS compliance for payment processing
- GDPR compliance for data export and deletion
- Secure password hashing
- Encrypted data storage

---

## Success Metrics

- User onboarding completion rate
- LinkedIn import success rate
- Applications created per user
- Job match accuracy (user feedback)
- Conversion rate from Basic to Premium
- User retention and engagement
- Average time saved per application
- Job offer success rate

---

## Development Roadmap

### Phase 1: Profile & Resume Management
Set up LinkedIn integration, profile import, and resume generation

### Phase 2: Job Discovery & Matching
Build job database, implement AI matching, create search/filter UI

### Phase 3: Application Generator
Develop AI-powered resume/cover letter customization

### Phase 4: Application Tracker
Create tracking dashboard, analytics, and follow-up system

### Phase 5: Account & Billing
Implement subscription tiers, payment processing, usage limits

---

**Document Version**: 1.0
**Last Updated**: December 18, 2025
**Project**: JobMatch AI
