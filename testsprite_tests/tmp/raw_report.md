
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** jobmatch-ai
- **Date:** 2025-12-18
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001
- **Test Name:** LinkedIn OAuth Authentication Success
- **Test Code:** [TC001_LinkedIn_OAuth_Authentication_Success.py](./TC001_LinkedIn_OAuth_Authentication_Success.py)
- **Test Error:** Reported the issue that LinkedIn OAuth login page or import wizard is not accessible from the profile page, preventing further testing of LinkedIn OAuth authentication and profile data import. Stopping the task as per instructions.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97c6fae7-e664-432d-b99c-8016a2f1b19e/8e120c70-5569-4b9e-8c66-bd9a30394e54
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002
- **Test Name:** LinkedIn OAuth Authentication Failure
- **Test Code:** [TC002_LinkedIn_OAuth_Authentication_Failure.py](./TC002_LinkedIn_OAuth_Authentication_Failure.py)
- **Test Error:** Testing of LinkedIn OAuth failure and cancellation scenarios is blocked because the LinkedIn OAuth page does not allow cancellation or simulate failure properly. The 'Dismiss' button and other UI elements do not cancel the process or show error messages. Further testing cannot proceed. Please investigate the LinkedIn OAuth integration or UI behavior for cancellation handling.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97c6fae7-e664-432d-b99c-8016a2f1b19e/4fec10b7-cd38-4dee-8c6d-c1baf886e2b9
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003
- **Test Name:** AI-Generated Resume Optimization
- **Test Code:** [TC003_AI_Generated_Resume_Optimization.py](./TC003_AI_Generated_Resume_Optimization.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97c6fae7-e664-432d-b99c-8016a2f1b19e/33146b53-0402-496b-b9ad-e674a7df141b
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004
- **Test Name:** Resume Preview and Multi-Format Download
- **Test Code:** [TC004_Resume_Preview_and_Multi_Format_Download.py](./TC004_Resume_Preview_and_Multi_Format_Download.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97c6fae7-e664-432d-b99c-8016a2f1b19e/4b14c639-baf7-4812-80ec-3a4aaac9307e
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005
- **Test Name:** Job Listing with AI-Powered Match Scores
- **Test Code:** [TC005_Job_Listing_with_AI_Powered_Match_Scores.py](./TC005_Job_Listing_with_AI_Powered_Match_Scores.py)
- **Test Error:** Testing of job listings display and filtering completed successfully. However, a critical application error was encountered when attempting to apply for a job, preventing further testing. The error details have been reported to the development team for resolution.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/3b82f6/ffffff?text=TF:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/8b5cf6/ffffff?text=IL:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/10b981/ffffff?text=SH:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/ef4444/ffffff?text=ES:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/f59e0b/ffffff?text=GE:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/06b6d4/ffffff?text=CS:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/ec4899/ffffff?text=DA:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/84cc16/ffffff?text=AV:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/6366f1/ffffff?text=SV:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/14b8a6/ffffff?text=B2B:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/3b82f6/ffffff?text=TF:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/8b5cf6/ffffff?text=IL:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/10b981/ffffff?text=SH:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/ef4444/ffffff?text=ES:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/f59e0b/ffffff?text=GE:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/06b6d4/ffffff?text=CS:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/ec4899/ffffff?text=DA:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/84cc16/ffffff?text=AV:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/6366f1/ffffff?text=SV:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/14b8a6/ffffff?text=B2B:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97c6fae7-e664-432d-b99c-8016a2f1b19e/141e25d0-5734-4a5d-91d1-94af411ec3ce
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006
- **Test Name:** Job Detail and Skill Gap Analysis
- **Test Code:** [TC006_Job_Detail_and_Skill_Gap_Analysis.py](./TC006_Job_Detail_and_Skill_Gap_Analysis.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97c6fae7-e664-432d-b99c-8016a2f1b19e/be78874f-322d-4e4a-b680-40278884f7bd
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007
- **Test Name:** AI-Generated Tailored Application Materials
- **Test Code:** [TC007_AI_Generated_Tailored_Application_Materials.py](./TC007_AI_Generated_Tailored_Application_Materials.py)
- **Test Error:** Testing stopped due to a critical application error preventing the generation of tailored resumes and cover letters. The error 'Cannot read properties of undefined (reading find)' was encountered in the application generator component. Please fix this issue to enable further testing.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/3b82f6/ffffff?text=TF:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/8b5cf6/ffffff?text=IL:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/10b981/ffffff?text=SH:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/ef4444/ffffff?text=ES:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/f59e0b/ffffff?text=GE:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/06b6d4/ffffff?text=CS:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/ec4899/ffffff?text=DA:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/84cc16/ffffff?text=AV:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/6366f1/ffffff?text=SV:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/14b8a6/ffffff?text=B2B:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/3b82f6/ffffff?text=TF:0:0)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'find')
    at ApplicationEditorPage (http://localhost:5173/src/sections/application-generator/ApplicationEditorPage.tsx:12:23)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopConcurrentByScheduler (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12555:11)
    at renderRootConcurrent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12537:71)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11764:152) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'find')
    at ApplicationEditorPage (http://localhost:5173/src/sections/application-generator/ApplicationEditorPage.tsx:12:23)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopConcurrentByScheduler (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12555:11)
    at renderRootConcurrent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12537:71)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11764:152) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'find')
    at ApplicationEditorPage (http://localhost:5173/src/sections/application-generator/ApplicationEditorPage.tsx:12:23)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'find')
    at ApplicationEditorPage (http://localhost:5173/src/sections/application-generator/ApplicationEditorPage.tsx:12:23)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] %o

%s

%s
 TypeError: Cannot read properties of undefined (reading 'find')
    at ApplicationEditorPage (http://localhost:5173/src/sections/application-generator/ApplicationEditorPage.tsx:12:23)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) The above error occurred in the <ApplicationEditorPage> component. React will try to recreate this component tree from scratch using the error boundary you provided, RenderErrorBoundary. (at http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:6998:18)
[ERROR] React Router caught the following error during render TypeError: Cannot read properties of undefined (reading 'find')
    at ApplicationEditorPage (http://localhost:5173/src/sections/application-generator/ApplicationEditorPage.tsx:12:23)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6199:14)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'find')
    at ApplicationEditorPage (http://localhost:5173/src/sections/application-generator/ApplicationEditorPage.tsx:12:23)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11764:189) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'find')
    at ApplicationEditorPage (http://localhost:5173/src/sections/application-generator/ApplicationEditorPage.tsx:12:23)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11764:189) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'find')
    at ApplicationEditorPage (http://localhost:5173/src/sections/application-generator/ApplicationEditorPage.tsx:12:23)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97c6fae7-e664-432d-b99c-8016a2f1b19e/aab3f286-f4f6-43cd-a150-01fda8112ea8
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008
- **Test Name:** Application Tracking and Status Lifecycle Management
- **Test Code:** [TC008_Application_Tracking_and_Status_Lifecycle_Management.py](./TC008_Application_Tracking_and_Status_Lifecycle_Management.py)
- **Test Error:** Testing stopped due to critical application error on the Applications page preventing further progress. Error details reported to development team for resolution.
Browser Console Logs:
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'filter')
    at ApplicationList (http://localhost:5173/src/sections/application-generator/components/ApplicationList.tsx:71:46)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopConcurrentByScheduler (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12555:11)
    at renderRootConcurrent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12537:71)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11764:152) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'filter')
    at ApplicationList (http://localhost:5173/src/sections/application-generator/components/ApplicationList.tsx:71:46)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopConcurrentByScheduler (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12555:11)
    at renderRootConcurrent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12537:71)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11764:152) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'filter')
    at ApplicationList (http://localhost:5173/src/sections/application-generator/components/ApplicationList.tsx:71:46)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'filter')
    at ApplicationList (http://localhost:5173/src/sections/application-generator/components/ApplicationList.tsx:71:46)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] %o

%s

%s
 TypeError: Cannot read properties of undefined (reading 'filter')
    at ApplicationList (http://localhost:5173/src/sections/application-generator/components/ApplicationList.tsx:71:46)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) The above error occurred in the <ApplicationList> component. React will try to recreate this component tree from scratch using the error boundary you provided, RenderErrorBoundary. (at http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:6998:18)
[ERROR] React Router caught the following error during render TypeError: Cannot read properties of undefined (reading 'filter')
    at ApplicationList (http://localhost:5173/src/sections/application-generator/components/ApplicationList.tsx:71:46)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6199:14)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'filter')
    at ApplicationList (http://localhost:5173/src/sections/application-generator/components/ApplicationList.tsx:71:46)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11764:189) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'filter')
    at ApplicationList (http://localhost:5173/src/sections/application-generator/components/ApplicationList.tsx:71:46)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11764:189) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'filter')
    at ApplicationList (http://localhost:5173/src/sections/application-generator/components/ApplicationList.tsx:71:46)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'filter')
    at ApplicationList (http://localhost:5173/src/sections/application-generator/components/ApplicationList.tsx:71:46)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] %o

%s

%s
 TypeError: Cannot read properties of undefined (reading 'filter')
    at ApplicationList (http://localhost:5173/src/sections/application-generator/components/ApplicationList.tsx:71:46)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) The above error occurred in the <ApplicationList> component. React will try to recreate this component tree from scratch using the error boundary you provided, RenderErrorBoundary. (at http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:6998:18)
[ERROR] React Router caught the following error during render TypeError: Cannot read properties of undefined (reading 'filter')
    at ApplicationList (http://localhost:5173/src/sections/application-generator/components/ApplicationList.tsx:71:46)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6199:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97c6fae7-e664-432d-b99c-8016a2f1b19e/03c68d41-4ef9-4dfa-95b0-2d26d7f9ad9b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009
- **Test Name:** Subscription Usage Limits and Upgrade Prompts
- **Test Code:** [TC009_Subscription_Usage_Limits_and_Upgrade_Prompts.py](./TC009_Subscription_Usage_Limits_and_Upgrade_Prompts.py)
- **Test Error:** Testing stopped due to critical error on Applications page preventing further progress on subscription usage and upgrade/downgrade testing.
Browser Console Logs:
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'filter')
    at ApplicationList (http://localhost:5173/src/sections/application-generator/components/ApplicationList.tsx:71:46)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopConcurrentByScheduler (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12555:11)
    at renderRootConcurrent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12537:71)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11764:152) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'filter')
    at ApplicationList (http://localhost:5173/src/sections/application-generator/components/ApplicationList.tsx:71:46)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopConcurrentByScheduler (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12555:11)
    at renderRootConcurrent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12537:71)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11764:152) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'filter')
    at ApplicationList (http://localhost:5173/src/sections/application-generator/components/ApplicationList.tsx:71:46)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'filter')
    at ApplicationList (http://localhost:5173/src/sections/application-generator/components/ApplicationList.tsx:71:46)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] %o

%s

%s
 TypeError: Cannot read properties of undefined (reading 'filter')
    at ApplicationList (http://localhost:5173/src/sections/application-generator/components/ApplicationList.tsx:71:46)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) The above error occurred in the <ApplicationList> component. React will try to recreate this component tree from scratch using the error boundary you provided, RenderErrorBoundary. (at http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:6998:18)
[ERROR] React Router caught the following error during render TypeError: Cannot read properties of undefined (reading 'filter')
    at ApplicationList (http://localhost:5173/src/sections/application-generator/components/ApplicationList.tsx:71:46)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6199:14)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'filter')
    at ApplicationList (http://localhost:5173/src/sections/application-generator/components/ApplicationList.tsx:71:46)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11764:189) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'filter')
    at ApplicationList (http://localhost:5173/src/sections/application-generator/components/ApplicationList.tsx:71:46)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11764:189) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'filter')
    at ApplicationList (http://localhost:5173/src/sections/application-generator/components/ApplicationList.tsx:71:46)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'filter')
    at ApplicationList (http://localhost:5173/src/sections/application-generator/components/ApplicationList.tsx:71:46)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] %o

%s

%s
 TypeError: Cannot read properties of undefined (reading 'filter')
    at ApplicationList (http://localhost:5173/src/sections/application-generator/components/ApplicationList.tsx:71:46)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) The above error occurred in the <ApplicationList> component. React will try to recreate this component tree from scratch using the error boundary you provided, RenderErrorBoundary. (at http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:6998:18)
[ERROR] React Router caught the following error during render TypeError: Cannot read properties of undefined (reading 'filter')
    at ApplicationList (http://localhost:5173/src/sections/application-generator/components/ApplicationList.tsx:71:46)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6199:14)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97c6fae7-e664-432d-b99c-8016a2f1b19e/2e55a6c3-b738-4b7f-8da8-d1ed654a88f8
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010
- **Test Name:** User Account Management and Security
- **Test Code:** [TC010_User_Account_Management_and_Security.py](./TC010_User_Account_Management_and_Security.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97c6fae7-e664-432d-b99c-8016a2f1b19e/58db79d0-ab9a-4271-bcfc-d8d96e9ec643
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011
- **Test Name:** Error Handling on Network Failures and API Issues
- **Test Code:** [TC011_Error_Handling_on_Network_Failures_and_API_Issues.py](./TC011_Error_Handling_on_Network_Failures_and_API_Issues.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97c6fae7-e664-432d-b99c-8016a2f1b19e/5ea9a174-dde4-4ae9-a09b-1ad4d79a3cd3
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012
- **Test Name:** UI Responsiveness and Accessibility Verification
- **Test Code:** [TC012_UI_Responsiveness_and_Accessibility_Verification.py](./TC012_UI_Responsiveness_and_Accessibility_Verification.py)
- **Test Error:** The UI responsiveness and accessibility testing has been performed on the Profile & Resume page across desktop, tablet, and mobile viewports, including keyboard navigation, screen reader accessibility with ARIA roles and labels, and color contrast compliance with WCAG standards. The Jobs page has been accessed on desktop viewport and keyboard navigation tested successfully. However, full accessibility testing on the Jobs page and other main pages (Applications, Tracker, Settings, Notifications) across all viewports is still pending. Therefore, the task is not fully complete.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/3b82f6/ffffff?text=TF:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/8b5cf6/ffffff?text=IL:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/10b981/ffffff?text=SH:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/ef4444/ffffff?text=ES:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/f59e0b/ffffff?text=GE:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/06b6d4/ffffff?text=CS:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/ec4899/ffffff?text=DA:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/84cc16/ffffff?text=AV:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/6366f1/ffffff?text=SV:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/14b8a6/ffffff?text=B2B:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/3b82f6/ffffff?text=TF:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/8b5cf6/ffffff?text=IL:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/10b981/ffffff?text=SH:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/ef4444/ffffff?text=ES:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/f59e0b/ffffff?text=GE:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/06b6d4/ffffff?text=CS:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/ec4899/ffffff?text=DA:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/84cc16/ffffff?text=AV:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/6366f1/ffffff?text=SV:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/14b8a6/ffffff?text=B2B:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97c6fae7-e664-432d-b99c-8016a2f1b19e/59f2a970-f0b7-4399-9d67-9665b8689bee
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013
- **Test Name:** Job Search Effectiveness Analytics Accuracy
- **Test Code:** [TC013_Job_Search_Effectiveness_Analytics_Accuracy.py](./TC013_Job_Search_Effectiveness_Analytics_Accuracy.py)
- **Test Error:** Testing stopped due to critical JavaScript errors on the Applications page preventing access to application data and status updates. Unable to verify analytics feature accurately. Please fix the errors and retry.
Browser Console Logs:
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/3b82f6/ffffff?text=TF:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/8b5cf6/ffffff?text=IL:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/10b981/ffffff?text=SH:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/ef4444/ffffff?text=ES:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/f59e0b/ffffff?text=GE:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/06b6d4/ffffff?text=CS:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/ec4899/ffffff?text=DA:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/84cc16/ffffff?text=AV:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/6366f1/ffffff?text=SV:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/14b8a6/ffffff?text=B2B:0:0)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'find')
    at ApplicationEditorPage (http://localhost:5173/src/sections/application-generator/ApplicationEditorPage.tsx:12:23)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopConcurrentByScheduler (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12555:11)
    at renderRootConcurrent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12537:71)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11764:152) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'find')
    at ApplicationEditorPage (http://localhost:5173/src/sections/application-generator/ApplicationEditorPage.tsx:12:23)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopConcurrentByScheduler (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12555:11)
    at renderRootConcurrent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12537:71)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11764:152) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'find')
    at ApplicationEditorPage (http://localhost:5173/src/sections/application-generator/ApplicationEditorPage.tsx:12:23)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] Error handled by React Router default ErrorBoundary: TypeError: Cannot read properties of undefined (reading 'find')
    at ApplicationEditorPage (http://localhost:5173/src/sections/application-generator/ApplicationEditorPage.tsx:12:23)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6160:12)
[ERROR] %o

%s

%s
 TypeError: Cannot read properties of undefined (reading 'find')
    at ApplicationEditorPage (http://localhost:5173/src/sections/application-generator/ApplicationEditorPage.tsx:12:23)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) The above error occurred in the <ApplicationEditorPage> component. React will try to recreate this component tree from scratch using the error boundary you provided, RenderErrorBoundary. (at http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:6998:18)
[ERROR] React Router caught the following error during render TypeError: Cannot read properties of undefined (reading 'find')
    at ApplicationEditorPage (http://localhost:5173/src/sections/application-generator/ApplicationEditorPage.tsx:12:23)
    at Object.react_stack_bottom_frame (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:18507:20)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:5652:24)
    at updateFunctionComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:7473:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:8523:20)
    at runWithFiberInDEV (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:995:72)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12559:98)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12422:43)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:12406:13)
    at performWorkOnRoot (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js?v=5fccd415:11825:37) (at http://localhost:5173/node_modules/.vite/deps/react-router-dom.js?v=5fccd415:6199:14)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/3b82f6/ffffff?text=TF:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/8b5cf6/ffffff?text=IL:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/10b981/ffffff?text=SH:0:0)
[ERROR] Failed to load resource: net::ERR_EMPTY_RESPONSE (at https://via.placeholder.com/80x80/ef4444/ffffff?text=ES:0:0)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97c6fae7-e664-432d-b99c-8016a2f1b19e/0f06e235-86a8-44a5-b4a6-5eb1985d467e
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **38.46** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---