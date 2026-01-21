# 🚀 AI Interview Assistant - Project Summary

> **One-Line Pitch:** A comprehensive, full-stack platform that helps users ace their job interviews by providing real-time, AI-powered feedback on their content, delivery, and non-verbal communication.

---

## 🌟 Executive Overview
The **AI Interview Assistant** is a production-grade web application designed to simulate real-world job interviews. Unlike simple question banks, this system acts as a virtual coach. It listens to the user's audio answers, transcribes them locally using Whisper, analyzes them using NLP and ML models, and provides actionable feedback using Google's Gemini LLM.

The system is built to be **private**, **fast**, and **comprehensive**, analyzing 6 key dimensions of a successful interview response: Content, Delivery, Communication, Voice, Confidence, and Structure.

## 🔑 Key Features
*   **🤖 AI Coaching:** Personalized feedback on every answer using Gemini 2.0 Flash.
*   **🎙️ Real-time Audio Analysis:** Transcribes speech instantly and analyzes pacing (WPM), filler words ("um", "ah"), and tone.
*   **📊 6-Score System:** A proprietary scoring algorithm that evaluates:
    *   **Content:** Relevance to the ideal answer (Semantic Similarity).
    *   **Delivery:** Speaking pace and fluency.
    *   **Communication:** Grammar and vocabulary diversity.
    *   **Voice:** Tone consistency and energy.
    *   **Confidence:** Assertiveness and composure.
    *   **Structure:** Usage of the STAR method (Situation, Task, Action, Result).
*   **🧠 Smart Question Engine:** Dynamically selects questions based on the User's Resume, the Job Description, and past performance history.
*   **📂 Resume Analysis:** Upload a resume (PDF/DOCX) to get a skills gap analysis against a target job description.
*   **📈 Progress Tracking:** Detailed dashboards showing improvement trends over time.
*   **🎨 Premium UI:** A beautiful, responsive interface built with React, Tailwind CSS, and Shadcn UI, featuring dark/light modes and smooth animations.

## 🛠️ Technology Stack
*   **Frontend:** React 18, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion, Recharts.
*   **Backend:** FastAPI (Python), Uvicorn.
*   **AI/ML:**
    *   **LLM:** Google Gemini 2.0 Flash (via `google-generativeai`).
    *   **Transcription:** `faster-whisper` (Local, privacy-focused).
    *   **NLP:** `sentence-transformers` (Semantic similarity), `spacy`/`textblob` (Grammar/Sentiment).
*   **Database:** Supabase (PostgreSQL) for storing users, questions, sessions, and analytics.
*   **Auth:** Supabase Auth for secure user management.

## 🏗️ Architecture Highlights
The project follows a **Service-Oriented Architecture (SOA)** within a monolithic repo:
1.  **Client-Server Model:** A React SPA communicates with a Python FastAPI backend via RESTful endpoints.
2.  **Privacy-First Design:** Audio is transcribed locally on the server; raw audio files are not permanently stored (unless explicitly configured), ensuring user privacy.
3.  **Hybrid AI Pipeline:**
    *   **Local ML:** Fast, deterministic checks (WPM, filler words, similarity) run locally for speed.
    *   **Cloud API:** Complex reasoning (coaching, STAR analysis) is offloaded to Gemini for high intelligence.
4.  **Resilience:** Implements multi-key rotation for LLM APIs to handle rate limits and fallbacks for failed components.

## 🎯 Target Audience
*   **Job Seekers:** Practicing for behavioral and technical interviews.
*   **Students:** Preparing for placements and internships.
*   **Bootcamp Grads:** Refining their pitch and technical explanations.

---
*This document provides a high-level summary. For detailed usage instructions, see the **User Guide**. For code-level details, see the **Technical Deep Dive**.*
