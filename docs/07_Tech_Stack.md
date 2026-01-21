# 🛠️ Technical Stack Reference

> **Project:** AI Interview Assistant
> **Version:** 3.0
> **Last Updated:** January 2026

This document provides a comprehensive list of all technologies, frameworks, libraries, and tools used to build the AI Interview Assistant. It is intended for developers, stakeholders, and anyone interested in the "under the hood" implementation.

---

## 1. Frontend Ecosystem

The frontend is built for performance, type safety, and a premium user experience.

### **Core Framework & Build**
| Technology | Version | Purpose |
|:---|:---|:---|
| **[React](https://react.dev/)** | `18.2+` | Component-based UI library. Uses Functional Components & Hooks exclusively. |
| **[TypeScript](https://www.typescriptlang.org/)** | `5.0+` | Static typing for reliability and developer experience. |
| **[Vite](https://vitejs.dev/)** | `Latest` | Next-generation build tool. Provides instant HMR (Hot Module Replacement) and optimized bundles. |

### **UI & Styling**
| Technology | Purpose |
|:---|:---|
| **[Tailwind CSS](https://tailwindcss.com/)** | Utility-first CSS framework for rapid, consistent styling. |
| **[Shadcn UI](https://ui.shadcn.com/)** | Reusable, accessible component collection built on Radix Primitives. |
| **[Framer Motion](https://www.framer.com/motion/)** | Production-ready animation library for complex UI transitions and gestures. |
| **[Lucide React](https://lucide.dev/)** | Beautiful, consistent icon set. |
| **[Clsx & Tailwind-Merge](https://github.com/dcastil/tailwind-merge)** | Utility for constructing dynamic class names and handling Tailwind conflicts. |

### **State & Data**
| Technology | Purpose |
|:---|:---|
| **[React Context API](https://react.dev/reference/react/createContext)** | Global state management for Authentication (`AuthContext`) and Theme (`ThemeContext`). |
| **[Axios](https://axios-http.com/)** | Promise-based HTTP client for making request to the Backend API. |
| **[Recharts](https://recharts.org/)** | Composable charting library for visualizing interview scores and trends. |
| **[React Router DOM](https://reactrouter.com/)** | Client-side routing for seamless navigation. |

---

## 2. Backend Ecosystem

The backend is a high-performance, asynchronous REST API coupled with local ML processing.

### **Core Runtime & API**
| Technology | Version | Purpose |
|:---|:---|:---|
| **[Python](https://www.python.org/)** | `3.10+` | Primary programming language chosen for its rich AI/ML ecosystem. |
| **[FastAPI](https://fastapi.tiangolo.com/)** | `0.100+` | Modern, fast web framework for building APIs with Python types. |
| **[Uvicorn](https://www.uvicorn.org/)** | `Standard` | ASGI web server implementation. |
| **[Pydantic](https://docs.pydantic.dev/)** | `V2` | Data validation and settings management using Python type hints. |

### **AI & Machine Learning Pipeline**
This system uses a "Hybrid AI" approach, combining local models with cloud LLMs.

| Technology | Purpose |
|:---|:---|
| **[Faster-Whisper](https://github.com/SYSTRAN/faster-whisper)** | **Local Transcription**. Optimized implementation of OpenAI's Whisper model (Int8 quantization) running on CTranslate2. ~4x faster than standard Whisper. |
| **[Google Gemini API](https://ai.google.dev/)** | **Generative AI**. Model: `gemini-1.5-flash`. Used for generating personalized coaching feedback, tips, and summaries. |
| **[Sentence-Transformers](https://www.sbert.net/)** | **Semantic Search**. Model: `all-MiniLM-L6-v2`. Used to calculate vector embeddings for answer relevance scoring. |
| **[Librosa](https://librosa.org/)** | **Audio Analysis**. Used for extracting low-level audio features like pitch, energy, and pauses to calculate "Voice" & "Confidence" scores. |
| **[Scipy](https://scipy.org/)** | **Scientific Computing**. Helper library for signal processing mathematics. |
| **[Language-Tool-Python](https://pypi.org/project/language-tool-python/)** | **Grammar Checking**. Wrapper for LanguageTool to detect grammar and stylistic errors locally. |

### **Utilities**
| Technology | Purpose |
|:---|:---|
| **[Python-Multipart](https://github.com/Kludex/python-multipart)** | Handling file uploads (audio/PDF) in FastAPI. |
| **[Python-Dotenv](https://pypi.org/project/python-dotenv/)** | Loading configuration from `.env` files. |

---

## 3. Database & Storage

The persistence layer is managed entirely by Supabase, offering a "Backend-as-a-Service" experience for data.

| Technology | Purpose |
|:---|:---|
| **[PostgreSQL](https://www.postgresql.org/)** | **Core Database**. Relational database hosting all user and session data. |
| **[Supabase Auth](https://supabase.com/auth)** | **Authentication**. Handles User Sign-up, Sign-in, and Session Management (JWT). |
| **[Supabase Storage](https://supabase.com/storage)** | **File Storage**. Stores audio recordings (temporarily) and resume PDFs. |
| **[Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)** | **Security**. Database-level policies ensuring users can solely access their own data. |

---

## 4. Development & DevOps Tools

| Technology | Purpose |
|:---|:---|
| **[Git](https://git-scm.com/)** | Version control based on Distributed Version Control System (DVCS). |
| **[npm](https://www.npmjs.com/)** | Package manager for frontend dependencies. |
| **[pip](https://pypi.org/project/pip/)** | Package installer for Python. |
| **[venv](https://docs.python.org/3/library/venv.html)** | Python virtual environment manager. |
| **[ESLint](https://eslint.org/)** | Plug-in framework for identifying and reporting on patterns in JavaScript/TypeScript. |

---

## 5. Security Architecture

*   **API Security**: Bearer Token authentication via Supabase JWTs.
*   **Environment Variables**: All sensitive keys (`LLM_API_KEY`, `SUPABASE_KEY`) are stored in `.env` files and never committed to version control.
*   **Data Isolation**: Strict RLS policies on the database prevent cross-user data leakage.
