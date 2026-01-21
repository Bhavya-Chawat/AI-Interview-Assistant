# 💻 Frontend Architecture Reference

> **Scope**: Detailed documentation of the React Client, including state management, component hierarchy, and API integration.
> **Source**: `frontend/src/`

Table of Contents:
1.  [Technology Stack](#technology-stack)
2.  [Directory Structure](#directory-structure)
3.  [State Management (AuthContext)](#state-management-authcontext)
4.  [API Client Layer](#api-client-layer)
5.  [Key Components](#key-components)

---

## 1. Technology Stack

The specific libraries and versions driving the UI:

| Category | Technology | Version | Purpose |
|:---|:---|:---|:---|
| **Core** | React | 18.2+ | UI Library. |
| **Language** | TypeScript | 5.0+ | Type Safety. |
| **Build Tool** | Vite | 4.4+ | Fast HMR dev server. |
| **Styling** | Tailwind CSS | 3.3+ | Utility-first styling. |
| **UI Kit** | Shadcn UI | - | Accessible components (Radix primitives). |
| **Icons** | Lucide React | - | Consistent icon set. |
| **Charts** | Recharts | - | Dashboard visualization. |
| **Animation** | Framer Motion | - | Smooth transitions (Feedback Cards). |
| **Routing** | React Router | 6.0+ | Client-side routing. |

---

## 2. Directory Structure

```plaintext
frontend/src/
├── api/
│   └── apiClient.ts       # Centralized API wrapper (Axios/Fetch)
├── components/
│   ├── ui/                # Shadcn primitives (Button, Card, etc.)
│   ├── Dashboard.tsx      # Main user stats view
│   ├── Recorder.tsx       # Audio capture & visualization
│   ├── FeedbackCard.tsx   # Scoring display
│   └── ...
├── context/
│   └── AuthContext.tsx    # Global User/Session state
├── pages/
│   ├── Landing.tsx        # Public home page
│   ├── Login.tsx          # Auth forms
│   └── Interview.tsx      # Active session container
├── styles/
│   └── main.css           # Tailwind directives
└── App.tsx                # Route definitions & Layouts
```

---

## 3. State Management (`AuthContext`)

Authentication state is managed globally via `AuthContext.tsx`.

### Core State
```typescript
interface AuthContextType {
  user: User | null;       // Supabase User object
  session: Session | null; // JWT Session
  isLoading: boolean;      // Loading state for protected routes
  signIn: (email, pass) => Promise;
  signOut: () => Promise;
}
```

### Logic
1.  **Initialization**: On mount, calls `supabase.auth.getSession()` to check for existing token.
2.  **Listener**: Subscribes to `supabase.auth.onAuthStateChange` to handle automatic token refresh or logout events.
3.  **Protection**: Wraps `<ProtectedRoute>` components to redirect unauthenticated users to `/login`.

---

## 4. API Client Layer (`apiClient.ts`)

A typed facade over the backend API. Handles token injection automatically via Supabase.

### Key Functions
| Function | Endpoint | Description |
|:---|:---|:---|
| `getSmartQuestions(jd, ...)` | `POST /questions/smart` | Gets personalized questions. |
| `uploadAudio(blob, qId)` | `POST /upload_audio` | Submits answer for analysis. |
| `getDashboard()` | `GET /dashboard/overview` | Fetches aggregated user stats. |
| `checkHealth()` | `GET /health` | Validates backend connection. |

### Auth Header Injection
```typescript
async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return session ? { Authorization: `Bearer ${session.access_token}` } : {};
}
```

---

## 5. Key Components

### `Recorder.tsx`
*   **MediaRecorder API**: Captures microphone input (`audio/webm` or `audio/mp4`).
*   **Visualizer**: Uses `AudioContext` + `AnalyserNode` to draw real-time waveforms on an HTML `<canvas>`.
*   **State**: `isRecording`, `recordingTime` (timer).

### `Dashboard.tsx`
*   **Data Fetching**: Calls `getDashboard()` on mount.
*   **Visualization**:
    *   `<AreaChart>`: Showing score trends over time.
    *   `<RadarChart>`: Comparing the 6-score breakdown (Content vs Delivery etc).
*   **Conditional Rendering**: Shows "Welcome" state for new users (0 attempts).

### `FeedbackCard.tsx`
*   **Props**: `score` (0-100), `feedback` (LLM string), `type` (Content/Delivery).
*   **Animations**: Progress bars fill up using `framer-motion` spring physics.
*   **Color coding**:
    *   Red (< 50)
    *   Yellow (50-70)
    *   Green (> 70)
