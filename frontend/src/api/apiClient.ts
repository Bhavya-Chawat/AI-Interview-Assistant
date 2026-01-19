/**
 * AI Interview Feedback MVP - API Client
 *
 * This module handles all API communication with the backend.
 * Provides typed functions for each endpoint with authentication support.
 *
 * Author: Member 3 (Frontend)
 * Updated: Added 6-score system, auth, and dashboard APIs
 */

import { supabase } from "../supabaseClient";

// Base URL for API calls
const API_BASE_URL = "/api/v1";

// ===========================================
// Auth Token Management (Uses Supabase session)
// ===========================================

export async function getAuthToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export function setAuthToken(_token: string | null): void {
  // No-op: Supabase manages tokens automatically
  console.warn(
    "setAuthToken is deprecated. Supabase manages tokens automatically."
  );
}

async function getAuthHeaders(
  isMultipart: boolean = false
): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};
  if (!isMultipart) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

// ===========================================
// Types
// ===========================================

export interface Question {
  id: number;
  question: string;
  ideal_answer: string;
  category: string;
}

export interface QuestionsResponse {
  questions: Question[];
  total: number;
}

// Updated MLScores with 6 categories
export interface MLScores {
  content: number;
  delivery: number;
  communication: number;
  voice: number;
  confidence: number;
  structure: number;
  final: number;
  wpm: number;
  filler_count: number;
  grammar_errors: number;
  relevance: number;
}

export interface LLMFeedback {
  summary: string;
  strengths?: string[];
  improvements?: string[];
  tips: string[];
  example_answer?: string;
  star_analysis?: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
  sentence_feedback?: Array<{
    original: string;
    improved: string;
    reason: string;
  }>;
  keyword_analysis?: string;
  weaknesses?: string[];
  improvement_roadmap?: string[];
  what_you_did?: {
     opening: string;
     main_content: string;
     closing: string;
     overall_approach: string;
  };
  // Resume specific fields
  validity_score?: number;
  is_valid_resume?: boolean;
  gaps?: string[];
  priority_skills?: string[];
  experience_feedback?: string;
  formatting_feedback?: string;
}

export interface ResumeAnalysisResponse {
  skill_match_pct: number;
  missing_skills: string[];
  matched_skills: string[];
  resume_score: number;
  similarity_score: number;
  domain_fit?: number;
  domain_skills_matched?: string[];
  domain?: string;
  feedback: LLMFeedback;
}

export interface AudioFeedbackResponse {
  attempt_id: number;
  question_id: number;
  question_text: string;
  transcript: string;
  duration_seconds: number;
  scores: MLScores;
  feedback: LLMFeedback;
  keywords_found?: string[];
  keywords_missing?: string[];
  voice_feedback?: string[];
  confidence_feedback?: string[];
  structure_feedback?: string[];
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
}

// ===========================================
// Authentication Types
// ===========================================

export interface UserCredentials {
  email: string;
  password: string;
}

export interface UserRegistration extends UserCredentials {
  full_name?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserInfo;
}

export interface UserInfo {
  id: string;
  email: string;
  full_name?: string;
  created_at?: string;
}

// ===========================================
// Dashboard Types
// ===========================================

export interface DashboardStats {
  total_attempts: number;
  total_sessions: number;
  average_score: number;
  best_score: number;
  score_trend: "improving" | "declining" | "stable";
  practice_streak: number;
  strengths: string[];
  weaknesses: string[];
}

export interface SessionSummary {
  id: string;
  domain: string;
  job_title?: string;
  status: "in_progress" | "completed";
  total_questions: number;
  completed_questions: number;
  avg_score?: number;
  created_at: string;
  session_name?: string;
}

export interface AttemptSummary {
  attempt_id: number;
  question_id: number;
  question_text: string;
  final_score: number;
  content_score: number;
  delivery_score: number;
  communication_score: number;
  voice_score: number;
  confidence_score: number;
  structure_score: number;
  created_at: string;
}

export interface DashboardResponse {
  user: UserInfo;
  stats: DashboardStats;
  recent_sessions: SessionSummary[];
  score_history: Array<{
    date: string;
    content: number;
    delivery: number;
    communication: number;
    voice: number;
    confidence: number;
    structure: number;
    final: number;
  }>;
}

// ===========================================
// API Functions
// ===========================================

/**
 * Check API health status
 */
export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error("API health check failed");
  }

  return response.json();
}

/**
 * Get all interview questions
 */
export async function getQuestions(): Promise<QuestionsResponse> {
  const response = await fetch(`${API_BASE_URL}/questions`);

  if (!response.ok) {
    throw new Error("Failed to fetch questions");
  }

  return response.json();
}

/**
 * Upload resume and analyze against job description
 *
 * @param resumeFile - The resume file (PDF or DOCX)
 * @param jobDescription - The job description text
 */
export async function uploadResume(
  resumeFile: File,
  jobDescription: string
): Promise<ResumeAnalysisResponse> {
  const formData = new FormData();
  formData.append("resume", resumeFile);
  formData.append("job_description", jobDescription);

  const response = await fetch(`${API_BASE_URL}/upload_resume`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Upload failed" }));
    throw new Error(error.detail || "Failed to analyze resume");
  }

  return response.json();
}

/**
 * Upload audio recording and get feedback
 *
 * @param audioBlob - The recorded audio as a Blob
 * @param questionId - The ID of the question being answered
 */
export async function uploadAudio(
  audioBlob: Blob,
  questionId: number
): Promise<AudioFeedbackResponse> {
  const formData = new FormData();

  // Create a file from the blob with a proper extension
  const audioFile = new File([audioBlob], "recording.webm", {
    type: audioBlob.type || "audio/webm",
  });

  formData.append("audio", audioFile);
  formData.append("question_id", questionId.toString());

  const response = await fetch(`${API_BASE_URL}/upload_audio`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Upload failed" }));
    throw new Error(error.detail || "Failed to process audio");
  }

  return response.json();
}

/**
 * Get previous attempt history
 *
 * @param questionId - Optional filter by question ID
 * @param limit - Maximum number of attempts to return
 */
export async function getAttempts(
  questionId?: number,
  limit: number = 10
): Promise<{ attempts: any[]; total: number }> {
  let url = `${API_BASE_URL}/attempts?limit=${limit}`;

  if (questionId) {
    url += `&question_id=${questionId}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to fetch attempts");
  }

  return response.json();
}

// ===========================================
// Error Handling Helper
// ===========================================

/**
 * Generic API call wrapper with error handling and auth
 */
export async function apiCall<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        ...authHeaders,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `API Error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred");
  }
}

// ===========================================
// Authentication API Functions
// ===========================================

/**
 * Register a new user account
 */
export async function register(data: UserRegistration): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Registration failed" }));
    throw new Error(error.detail || "Failed to register");
  }

  const result = await response.json();
  setAuthToken(result.access_token);
  return result;
}

/**
 * Login with email and password
 */
export async function login(
  credentials: UserCredentials
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Login failed" }));
    throw new Error(error.detail || "Failed to login");
  }

  const result = await response.json();
  setAuthToken(result.access_token);
  return result;
}

/**
 * Logout current user
 */
export async function logout(): Promise<void> {
  try {
    const authHeaders = await getAuthHeaders();
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: authHeaders,
    });
  } finally {
    setAuthToken(null);
  }
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<UserInfo> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: authHeaders,
  });

  if (!response.ok) {
    if (response.status === 401) {
      setAuthToken(null);
    }
    throw new Error("Not authenticated");
  }

  return response.json();
}

/**
 * Refresh access token
 */
export async function refreshToken(
  refreshToken: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    setAuthToken(null);
    throw new Error("Session expired");
  }

  const result = await response.json();
  setAuthToken(result.access_token);
  return result;
}

// ===========================================
// Dashboard API Functions
// ===========================================

/**
 * Get dashboard overview with stats and recent attempts
 */
export async function getDashboard(): Promise<DashboardResponse> {
  const authHeaders = await getAuthHeaders();
  
  // Get user ID from Supabase session
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  
  // Include user_id as query parameter
  const url = userId 
    ? `${API_BASE_URL}/dashboard/overview?user_id=${userId}`
    : `${API_BASE_URL}/dashboard/overview`;
  
  const response = await fetch(url, {
    headers: authHeaders,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to fetch dashboard");
  }

  return response.json();
}

/**
 * Get details for a specific session
 */
export async function getSession(sessionId: string): Promise<{
  session: any;
  attempts: any[];
  completed_count: number;
  skipped_count: number;
}> {
  const authHeaders = await getAuthHeaders();
  
  // Get user ID
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  
  if (!userId) throw new Error("User not authenticated");

  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}?user_id=${userId}`, {
    headers: authHeaders,
  });

  if (!response.ok) {
    throw new Error("Failed to fetch session details");
  }

  return response.json();
}

/**
 * Get detailed analytics for a time period
 */
export async function getAnalytics(
  period: "7d" | "30d" | "90d" | "all" = "30d"
): Promise<{
  period: string;
  total_attempts: number;
  score_breakdown: Record<
    string,
    {
      average: number;
      best: number;
      worst: number;
      trend: string;
    }
  >;
  recommendations: string[];
}> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/dashboard/analytics?period=${period}`,
    {
      headers: authHeaders,
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch analytics");
  }

  return response.json();
}

/**
 * Get paginated attempt history
 */
export async function getAttemptHistory(
  limit: number = 20,
  offset: number = 0,
  questionId?: number
): Promise<{
  attempts: AttemptSummary[];
  total: number;
  has_more: boolean;
}> {
  let url = `${API_BASE_URL}/dashboard/attempts?limit=${limit}&offset=${offset}`;
  if (questionId) {
    url += `&question_id=${questionId}`;
  }

  const authHeaders = await getAuthHeaders();
  const response = await fetch(url, {
    headers: authHeaders,
  });

  if (!response.ok) {
    throw new Error("Failed to fetch attempts");
  }

  return response.json();
}

/**
 * Get detailed view of a single attempt
 */
export async function getAttemptDetail(attemptId: number): Promise<{
  id: number;
  question_id: number;
  question_text: string;
  transcript: string;
  duration_seconds: number;
  scores: MLScores;
  ml_scores: Record<string, unknown>;
  feedback: LLMFeedback;
  created_at: string;
}> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/dashboard/attempts/${attemptId}`,
    {
      headers: authHeaders,
    }
  );

  if (!response.ok) {
    throw new Error("Attempt not found");
  }

  return response.json();
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

// ===========================================
// Smart Questions API Functions
// ===========================================

export interface SmartQuestion {
  id: number;
  question: string;
  ideal_answer: string;
  category: string;
  domain: string;
  difficulty: string;
  time_limit_seconds: number;
  keywords: string[];
}

export interface SmartQuestionsResponse {
  questions: SmartQuestion[];
  total: number;
  total_time_seconds: number;
  total_time_formatted: string;
  category_distribution: Record<string, number>;
  difficulty_distribution: Record<string, number>;
  domain_focus: string;
  relevance_summary: Record<string, number>;
}

export interface JDAnalysis {
  keywords: string[];
  skills: string[];
  domain: string;
  seniority: string;
  is_management: boolean;
  suggested_categories: Record<string, number>;
}

/**
 * Get intelligently selected questions based on job description
 */
export async function getSmartQuestions(
  jobDescription: string,
  numQuestions: number = 10,
  resumeText?: string,
  previousQuestionIds?: number[],
  sessionName?: string
): Promise<SmartQuestionsResponse> {
  const formData = new FormData();
  formData.append("job_description", jobDescription);
  formData.append("num_questions", numQuestions.toString());
  if (resumeText) {
    formData.append("resume_text", resumeText);
  }
  if (previousQuestionIds && previousQuestionIds.length > 0) {
    formData.append("previous_question_ids", previousQuestionIds.join(","));
  }
  if (sessionName) {
    formData.append("session_name", sessionName);
  }

  const response = await fetch(`${API_BASE_URL}/questions/smart`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to get smart questions");
  }

  return response.json();
}

/**
 * Analyze job description without selecting questions
 */
export async function analyzeJobDescription(
  jobDescription: string
): Promise<JDAnalysis> {
  const formData = new FormData();
  formData.append("job_description", jobDescription);

  const response = await fetch(`${API_BASE_URL}/questions/analyze-jd`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to analyze job description");
  }

  return response.json();
}

// ===========================================
// Admin Questions API Functions
// ===========================================

export interface QuestionPoolStats {
  total: number;
  by_category: Record<string, number>;
  by_difficulty: Record<string, number>;
  by_domain: Record<string, number>;
}

export interface QuestionCreate {
  question: string;
  ideal_answer: string;
  keywords: string[];
  category: string;
  domain: string;
  difficulty: string;
  time_limit_seconds: number;
}

/**
 * Get question pool statistics
 */
export async function getQuestionPoolStats(): Promise<QuestionPoolStats> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/admin/questions/stats`, {
    headers: authHeaders,
  });

  if (!response.ok) {
    throw new Error("Failed to get question stats");
  }

  return response.json();
}

/**
 * Upload questions from JSON file
 */
export async function uploadQuestionsJSON(
  file: File,
  category: string
): Promise<{ message: string; count: number; ids: number[] }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);

  const authHeaders = await getAuthHeaders(true);
  const response = await fetch(`${API_BASE_URL}/admin/questions/upload/json`, {
    method: "POST",
    headers: authHeaders,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to upload questions");
  }

  return response.json();
}

/**
 * Upload questions from CSV file
 */
export async function uploadQuestionsCSV(
  file: File,
  category: string
): Promise<{ message: string; count: number; ids: number[] }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);

  const authHeaders = await getAuthHeaders(true);
  const response = await fetch(`${API_BASE_URL}/admin/questions/upload/csv`, {
    method: "POST",
    headers: authHeaders,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to upload questions");
  }

  return response.json();
}

/**
 * Get JSON template for question upload
 */
export async function getQuestionJSONTemplate(): Promise<QuestionCreate[]> {
  const response = await fetch(`${API_BASE_URL}/admin/questions/template/json`);
  if (!response.ok) throw new Error("Failed to get template");
  return response.json();
}

/**
 * Get CSV template for question upload
 */
export async function getQuestionCSVTemplate(): Promise<{
  template: string;
  content_type: string;
}> {
  const response = await fetch(`${API_BASE_URL}/admin/questions/template/csv`);
  if (!response.ok) throw new Error("Failed to get template");
  return response.json();
}

/**
 * List all questions with optional filtering
 */
export async function listQuestions(params?: {
  category?: string;
  domain?: string;
  difficulty?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<SmartQuestion[]> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.append("category", params.category);
  if (params?.domain) searchParams.append("domain", params.domain);
  if (params?.difficulty) searchParams.append("difficulty", params.difficulty);
  if (params?.search) searchParams.append("search", params.search);
  if (params?.limit) searchParams.append("limit", params.limit.toString());
  if (params?.offset) searchParams.append("offset", params.offset.toString());

  const authHeaders = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/admin/questions/?${searchParams.toString()}`,
    {
      headers: authHeaders,
    }
  );

  if (!response.ok) throw new Error("Failed to list questions");
  return response.json();
}

/**
 * Get available question categories
 */
export async function getQuestionCategories(): Promise<{
  categories: string[];
  descriptions: Record<string, string>;
}> {
  const response = await fetch(`${API_BASE_URL}/admin/questions/categories`);
  if (!response.ok) throw new Error("Failed to get categories");
  return response.json();
}

// ===========================================
// Testing Mode API Functions
// ===========================================

/**
 * Check if LLM (Gemini) is working
 */
export interface LLMStatus {
  is_working: boolean | null;
  last_error: string | null;
  provider: string | null;
  last_check: string | null;
}

export async function checkLLMStatus(): Promise<LLMStatus> {
  try {
    const response = await fetch(`${API_BASE_URL}/llm/status`);
    if (!response.ok) {
      return {
        is_working: false,
        last_error: "Could not check LLM status",
        provider: null,
        last_check: null,
      };
    }
    return response.json();
  } catch (error) {
    return {
      is_working: false,
      last_error: error instanceof Error ? error.message : "Connection error",
      provider: null,
      last_check: null,
    };
  }
}

/**
 * Submit a test answer and get comprehensive scores
 */
/**
 * Validate and parse custom questions JSON/CSV.
 */
export const validateCustomQuestions = async (
  file: File
): Promise<{ success: boolean; count: number; questions: Question[] }> => {
  const formData = new FormData();
  formData.append("file", file);

  const authHeaders = await getAuthHeaders(true);
  const response = await fetch(`${API_BASE_URL}/questions/validate_custom`, {
    method: "POST",
    headers: authHeaders,
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Failed to validate custom questions");
  }

  return response.json();
};
