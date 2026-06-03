


# PrepRoute Frontend Developer Assessment

## Overview

This project is a submission for the **Frontend Developer Assessment** conducted by **Preproute**.

The application is a Test Management System that allows administrators to:

* Authenticate into the system
* View all available tests
* Create new tests
* Edit existing tests
* Add MCQ questions
* Configure marking schemes
* Preview test details
* Publish tests

The application has been developed according to the provided Figma design and integrates with the APIs provided by Preproute.



---

## Tech Stack

### Frontend

* React 18
* TypeScript
* Vite
* Tailwind CSS
* React Router DOM
* Axios
* Zustand
* React Hook Form
* React Query

### Backend

* Node.js
* Express.js
* TypeScript

---

## Features Implemented

### Authentication

* Login using provided credentials
* Protected routes
* Persistent authentication using localStorage
* Automatic logout on unauthorized requests

### Dashboard

* View all tests
* Search and browse tests
* Responsive layout

### Test Management

* Create new tests
* Edit existing tests
* Update marking scheme
* Assign subjects and topics

### Question Management

* Add MCQ questions
* Multiple options support
* Correct answer selection
* Form validation

### Preview & Publish

* Preview complete test
* Review questions and configurations
* Publish test

---

## Folder Structure

```text
PrepRoute/
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── store/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── .env
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── db.json
│   │   └── server.ts
│   │
│   ├── dist/
│   ├── package.json
│   └── tsconfig.json
│
└── README.md
```

---

## Installation

Clone the repository:

```bash
git clone <repository-url>
cd PrepRoute
```

Install dependencies:

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd ../frontend
npm install
```

---

## Environment Setup

Frontend:

```bash
cp .env.example .env
```

Backend:

```bash
cp .env.example .env
```

Update environment variables if required.

---

## Running the Project

### Step 1: Start Backend

Open Terminal 1:

```bash
cd backend
npm run dev
```

Backend runs on:

```text
http://127.0.0.1:4000
```

### Step 2: Start Frontend

Open Terminal 2:

```bash
cd frontend
npm run dev
```

Frontend runs on:

```text
http://127.0.0.1:5173
```

---

## Test Credentials

```text
Username: vedant-admin
Password: vedant123
```

---

## API Integration

The frontend communicates with the local backend proxy:

```text
http://127.0.0.1:4000/api/*
```

The backend forwards requests to:

```text
https://admin-moderator-backend-staging.up.railway.app/api
```

---

## Technical Decisions

### State Management

Zustand was used because it provides a lightweight and scalable solution for managing authentication and current test state.

### API Layer

Axios was used to centralize API communication and simplify request/response handling.

### Data Fetching

React Query was used for:

* API caching
* Loading states
* Error handling
* Automatic refetching

### Form Management

React Hook Form was used to:

* Improve form performance
* Simplify validation
* Reduce re-renders

### Styling

Tailwind CSS was used to closely match the provided Figma design while maintaining responsive layouts.

---

## Assumptions

* Authentication token is stored in localStorage.
* Unauthorized API responses automatically redirect users to Login.
* All CRUD operations rely on the provided backend APIs.

---

## Evaluation Checklist

* ✅ Login functionality
* ✅ Dashboard page
* ✅ Create test
* ✅ Edit test
* ✅ Add questions
* ✅ Preview test
* ✅ Publish test
* ✅ API integration
* ✅ Responsive UI
* ✅ Form validation
* ✅ State management
* ✅ Documentation


---

## Author

Ashutosh Chand


