# PrepRoute Test Management

A production-ready Test Management application built with React 18 + TypeScript on the frontend and a local Node/HTTP server on the backend.

## Key Features & Capabilities

### 1. Unified Question Bank (`/questions`)
- **Centralized Management**: Explore, search, and manage all questions globally in one place.
- **Cascading Filters**: Narrow down questions by Cascading Subject -> Topic -> Subtopic, and Difficulty.
- **Usage Scanner**: Deleting questions scans all active tests to check for dependencies and warns administrators if a question is currently in use.
- **Bulk Operations**: Perform bulk deletion, bulk assign topic/subtopic, bulk difficulty assignment, and client-side CSV exports.
- **Inline Preview**: Inspect full details (solution explanation, options, correct answer highlighting) using a clean details slide-out drawer.

### 2. Bulk CSV Import with Auto-Registration
- **CSV Import Tool**: Import multiple questions at once via file upload or raw copy-pasting.
- **Auto-Registration Taxonomy**: Supports columns for `subject`, `topic`, and `subtopic`. If any taxonomy name is not registered, the backend automatically registers it case-insensitively on import.
- **Interactive Parsing & Inline Editing**: Edit taxonomy names and check validations (e.g. missing options, duplicate entries) directly in a parsed preview table before final import.

### 3. Direct Question Bank Selection in Test Wizard (`/tests/:id/questions`)
- **Interactive Selector**: Replaced manual question input fields with a direct, paginated selection table showing all available questions in the Question Bank (scoped to the test's subject).
- **Dual-Tab Layout**:
  - **Question Bank (Available)**: View, filter, and select matching questions.
  - **Selected Questions**: Review the checked questions and quickly remove any.
- **Inline Expansion**: Click any question in the list to expand it inline to inspect options and solution explanation.
- **Auto-Shuffling Limit**: If a test is configured to have `K` questions and the administrator selects `N > K` questions, the wizard randomly shuffles and selects exactly `K` questions upon saving.

### 4. CBT Simulator & Security
- **Simulator Mode**: Clean exam simulator for students with complete CBT navigation controls and questions palette.
- **Exam Integrity**: "Show Correct Answer" option is removed during active exams to prevent answers exposure.

### 5. Media Uploads & ImageKit Integration
- **Secure Image Uploads**: Drag-and-drop image uploading in the question editor, connected with real-time upload progress.
- **Backend Signature Auth**: Seamless secure integration with ImageKit utilizing backend auth signature endpoints (`/api/imagekit/auth`).


## Setup

1. Install dependencies at the project root:
   ```bash
   npm install
   ```
2. Start both the backend mock server and frontend development server:
   ```bash
   npm run dev
   ```

- **Frontend**: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- **Backend**: [http://127.0.0.1:4000](http://127.0.0.1:4000)

## Environment Setup

Ensure environment variables are configured correctly:

- **Frontend (`frontend/.env`)**:
  - `VITE_API_BASE_URL`: Set to the local backend URL (`http://127.0.0.1:4000/api`).
  - `VITE_DEV_AUTH_TOKEN`: Development authorization token.
- **Backend (`backend/.env`)**:
  - `PORT`: Server port (defaults to `4000`).
  - `FRONTEND_ORIGIN`: Allowed origin for CORS requests (`http://127.0.0.1:5173`).

All API queries and mutations interact directly with the local database (`backend/src/db.json`).

## Architecture & Structure

- **`frontend/`**: React 18 + Vite + TypeScript frontend.
  - `src/api/`: Modular API integration layer using Axios instances with request and response interceptors (JWT header injection, automatic 401 logouts).
  - `src/context/`: Authentication state managed via React Context (`AuthContext.tsx`) and the custom `useAuth()` hook.
  - `src/hooks/`: TanStack Query (React Query) wrapper hooks (`useTests`, `useQuestions`, `useSubjects`, `useTopics`).
  - `src/components/`: Reusable premium UI controls (such as `AppTable`, `MultiSelect`, `QuestionCard`, `ConfirmDialog`, and `LoadingSkeleton`).
  - `src/pages/`: Workflows for Login, Dashboard, Create/Edit Test, Add Questions, and Preview/Publish.
- **`backend/`**: Node server executing locally.
  - `src/server.ts`: HTTP endpoints managing mock CRUD operations for subjects, topics, questions, and tests.
  - `src/db.json`: JSON mock database file.

## Railway Deployment

This repository is optimized for seamless deployment on Railway:

1. **Deploy Repository**: Connect this GitHub repository directly to a new service on Railway.
2. **Automatic Configuration**: Railway detects the root `package.json` and runs the appropriate scripts:
   - **Build**: `npm run build` compiles both the backend server and compiles the frontend application into the `frontend/dist` directory.
   - **Start**: `npm start` launches the Node HTTP server.
3. **Unified Single-Port Hosting**: The backend server is configured to serve the compiled frontend static files. Both the REST APIs (under `/api`) and the frontend client UI run on the single `PORT` assigned by Railway, eliminating CORS configuration issues in production.
4. **Environment Variables**:
   - `PORT`: Provided automatically by Railway.
   - `FRONTEND_ORIGIN`: (Optional) The production domain URL to allow explicit CORS origins.


