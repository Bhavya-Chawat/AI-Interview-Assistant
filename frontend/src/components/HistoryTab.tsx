/**
 * Sessions History Tab Component
 *
 * Displays user's interview sessions with:
 * - Searchable/filterable list of sessions
 * - Click to view FULL PAGE session details with all attempts
 * - Domain and status filtering
 * - PDF download per session
 * - Comprehensive data display for each question
 *
 * @component
 */

import { useState, useEffect, useCallback } from "react";
import { Button, Badge } from "./ui";

import {
  Filter,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  Mic,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Target,
  RefreshCw,
  Download,
  Search,
  Briefcase,
  Play,
  ArrowLeft,
  Star,
  MessageSquare,
  Lightbulb,
  Award,
  BarChart3,
  Zap,
  RotateCcw,
  Eye,
} from "lucide-react";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ===========================================
// Types
// ===========================================

interface SessionData {
  id: string;
  domain: string;
  job_title?: string;
  session_name?: string;
  job_description?: string;
  status: "in_progress" | "completed";
  total_questions: number;
  completed_questions: number;
  avg_final_score: number;
  avg_content_score: number;
  avg_delivery_score: number;
  avg_communication_score: number;
  avg_voice_score: number;
  avg_confidence_score: number;
  avg_structure_score: number;
  strengths?: string[];
  improvements?: string[];
  created_at: string;
  completed_at?: string;
}

interface AttemptData {
  id: number;
  question_id: number;
  question_text: string;
  question_order: number;
  transcript: string;
  final_score: number;
  content_score: number;
  delivery_score: number;
  communication_score: number;
  voice_score: number;
  confidence_score: number;
  structure_score: number;
  llm_feedback?: {
    summary?: string;
    strengths?: string[];
    improvements?: string[];
    tips?: string[];
    example_answer?: string;
    star_analysis?: {
      situation?: string;
      task?: string;
      action?: string;
      result?: string;
    };
  };
  keywords_found?: string[];
  keywords_missing?: string[];
  wpm?: number;
  filler_count?: number;
  domain: string;
  category?: string;
  difficulty: string;
  created_at: string;
  is_skipped?: boolean;
}

interface SessionDetailResponse {
  session: SessionData;
  attempts: AttemptData[];
  completed_count: number;
  skipped_count: number;
}

interface HistoryTabProps {
  userId: string;
  apiBase?: string;
  onResume?: (sessionId: string) => void;
  onReattempt?: (sessionId: string, session: SessionData) => void;
  onViewSummary?: (sessionId: string, attempts: AttemptData[]) => void;
}

// ===========================================
// Helper Functions
// ===========================================

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
};

const getScoreBg = (score: number) => {
  if (score >= 80) return "bg-emerald-500/10 border-emerald-500/30";
  if (score >= 60) return "bg-amber-500/10 border-amber-500/30";
  return "bg-rose-500/10 border-rose-500/30";
};

const getScoreGradient = (score: number) => {
  if (score >= 80) return "from-emerald-500 to-teal-500";
  if (score >= 60) return "from-amber-500 to-orange-500";
  return "from-rose-500 to-red-500";
};

const getScoreLabel = (score: number) => {
  if (score >= 90) return "Outstanding";
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Needs Work";
  return "Poor";
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const domainLabels: Record<string, string> = {
  software_engineering: "Software Engineering",
  management: "Management",
  finance: "Finance",
  teaching: "Teaching",
  sales: "Sales",
  general: "General",
};

// ===========================================
// Score Card Component
// ===========================================

const ScoreCard = ({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) => (
  <div className="relative overflow-hidden rounded-2xl bg-stone-100/80 dark:bg-slate-900/80 backdrop-blur-xl border border-stone-200/60 dark:border-slate-700/50 p-4 shadow-lg hover:shadow-xl transition-all duration-300 group">
    <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-secondary-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
      <div className="text-stone-400 dark:text-slate-500">{icon}</div>
    </div>
    <div className={`text-3xl font-bold ${getScoreColor(score)}`}>
      {Math.round(score)}
    </div>
    <div className="mt-2 h-2 bg-stone-100 dark:bg-slate-700 rounded-full overflow-hidden">
      <div 
        className={`h-full rounded-full bg-gradient-to-r ${getScoreGradient(score)} transition-all duration-700`}
        style={{ width: `${score}%` }}
      />
    </div>
  </div>
);

// ===========================================
// Question Detail Card Component
// ===========================================

const QuestionDetailCard = ({ attempt, index }: { attempt: AttemptData; index: number }) => {
  const [expanded, setExpanded] = useState(false);
  const isSkipped = attempt.transcript === "SKIPPED" || attempt.is_skipped;
  
  // Parse llm_feedback if it's a string
  let feedback = attempt.llm_feedback;
  if (typeof feedback === 'string') {
    try {
      feedback = JSON.parse(feedback);
    } catch (e) {
      feedback = undefined;
    }
  }

  return (
    <div className={`
      rounded-2xl overflow-hidden transition-all duration-300
      bg-stone-100/90 dark:bg-slate-900/90 backdrop-blur-xl
      border-2 ${isSkipped ? 'border-amber-300/50 dark:border-amber-700/50' : 'border-stone-200/60 dark:border-slate-700/50'}
      shadow-lg hover:shadow-xl
    `}>
      {/* Question Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 text-left hover:bg-stone-50/50 dark:hover:bg-surface-700/30 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${isSkipped 
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                  : 'bg-gradient-to-br from-primary-500 to-secondary-500 text-white'}
              `}>
                {index + 1}
              </span>
              <span className="text-xs font-medium text-stone-500 dark:text-surface-400 px-2 py-1 bg-stone-100 dark:bg-surface-700 rounded-full">
                {attempt.category || attempt.domain} • {attempt.difficulty}
              </span>
              {isSkipped && (
                <Badge variant="warning" className="text-xs">Skipped</Badge>
              )}
            </div>
            <p className="font-medium text-stone-800 dark:text-white leading-relaxed">
              {attempt.question_text}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!isSkipped && (
              <div className={`
                px-4 py-2 rounded-xl border-2 font-bold text-lg
                ${getScoreBg(attempt.final_score)} ${getScoreColor(attempt.final_score)}
              `}>
                {Math.round(attempt.final_score)}
              </div>
            )}
            <ChevronDown className={`w-5 h-5 text-stone-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-stone-200/60 dark:border-surface-700/50 p-5 space-y-5 animate-fade-in">
          {isSkipped ? (
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">This question was skipped</span>
            </div>
          ) : (
            <>
              {/* Transcript */}
              <div className="bg-stone-50 dark:bg-slate-900/50 rounded-xl p-4">
                <h5 className="text-xs font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  Your Answer
                </h5>
                <p className="text-stone-700 dark:text-slate-200 leading-relaxed">
                  "{attempt.transcript || "No transcript available"}"
                </p>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-6 gap-2">
                {[
                  { label: "Content", value: attempt.content_score },
                  { label: "Delivery", value: attempt.delivery_score },
                  { label: "Communication", value: attempt.communication_score },
                  { label: "Voice", value: attempt.voice_score },
                  { label: "Confidence", value: attempt.confidence_score },
                  { label: "Structure", value: attempt.structure_score },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center p-2 bg-stone-50 dark:bg-slate-900/50 rounded-lg">
                    <div className={`text-lg font-bold ${getScoreColor(value)}`}>{Math.round(value)}</div>
                    <div className="text-xs text-stone-500 dark:text-slate-500">{label}</div>
                  </div>
                ))}
              </div>

              {/* AI Feedback */}
              {feedback && (
                <div className="space-y-4">
                  {/* Summary */}
                  {feedback.summary && (
                    <div className="bg-primary-50/50 dark:bg-primary-900/20 border border-primary-200/50 dark:border-primary-700/40 rounded-xl p-4">
                      <h5 className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        AI Feedback
                      </h5>
                      <p className="text-stone-700 dark:text-slate-200">{feedback.summary}</p>
                    </div>
                  )}

                  {/* Strengths & Improvements Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {feedback.strengths && feedback.strengths.length > 0 && (
                      <div className="bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-700/40 rounded-xl p-4">
                        <h5 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Strengths
                        </h5>
                        <ul className="space-y-2">
                          {feedback.strengths.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-stone-700 dark:text-slate-200">
                              <span className="text-emerald-500 mt-1">✓</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {feedback.improvements && feedback.improvements.length > 0 && (
                      <div className="bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700/40 rounded-xl p-4">
                        <h5 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Areas to Improve
                        </h5>
                        <ul className="space-y-2">
                          {feedback.improvements.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-stone-700 dark:text-slate-200">
                              <span className="text-amber-500 mt-1">→</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Tips */}
                  {feedback.tips && feedback.tips.length > 0 && (
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/30 rounded-xl p-4">
                      <h5 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        Tips
                      </h5>
                      <ul className="space-y-2">
                        {feedback.tips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-stone-700 dark:text-surface-200">
                            <span className="text-blue-500 mt-1">💡</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* STAR Analysis */}
                  {feedback.star_analysis && (
                    <div className="bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200/50 dark:border-purple-800/30 rounded-xl p-4">
                      <h5 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        STAR Analysis
                      </h5>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: "Situation", value: feedback.star_analysis.situation },
                          { label: "Task", value: feedback.star_analysis.task },
                          { label: "Action", value: feedback.star_analysis.action },
                          { label: "Result", value: feedback.star_analysis.result },
                        ].map(({ label, value }) => value && (
                          <div key={label} className="bg-white/50 dark:bg-surface-800/50 rounded-lg p-3">
                            <div className="text-xs font-bold text-purple-600 dark:text-purple-400 mb-1">{label}</div>
                            <div className="text-sm text-stone-700 dark:text-surface-200">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Keywords */}
              {((attempt.keywords_found?.length ?? 0) > 0 || (attempt.keywords_missing?.length ?? 0) > 0) && (
                <div className="flex flex-wrap gap-4">
                  {attempt.keywords_found && attempt.keywords_found.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mr-2">Keywords Found:</span>
                      {attempt.keywords_found.map((kw, i) => (
                        <Badge key={i} variant="success" className="mr-1 text-xs">{kw}</Badge>
                      ))}
                    </div>
                  )}
                  {attempt.keywords_missing && attempt.keywords_missing.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-rose-600 dark:text-rose-400 mr-2">Keywords Missing:</span>
                      {attempt.keywords_missing.map((kw, i) => (
                        <Badge key={i} variant="destructive" className="mr-1 text-xs">{kw}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* If no feedback at all */}
              {!feedback?.summary && !feedback?.strengths?.length && !feedback?.improvements?.length && (
                <div className="text-stone-500 dark:text-surface-400 italic text-sm bg-stone-50 dark:bg-surface-900/50 p-4 rounded-xl">
                  AI feedback is being processed for this response.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ===========================================
// Session Detail Full Page Component
// ===========================================

const SessionDetailPage = ({ 
  session, 
  attempts, 
  completedCount, 
  skippedCount, 
  onBack,
  onDownloadPDF,
  onReattempt,
  onViewSummary
}: { 
  session: SessionData; 
  attempts: AttemptData[]; 
  completedCount: number;
  skippedCount: number;
  onBack: () => void;
  onDownloadPDF: () => void;
  onReattempt?: () => void;
  onViewSummary?: () => void;
}) => {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Back Button & Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-stone-600 dark:text-surface-400 hover:text-primary-500 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Sessions</span>
        </button>
        <div className="flex items-center gap-2">
          {onViewSummary && session.status === "completed" && (
            <Button variant="outline" size="sm" className="gap-2" onClick={onViewSummary}>
              <Eye className="w-4 h-4" />
              View Summary
            </Button>
          )}
          {onReattempt && session.status === "completed" && (
            <Button variant="outline" size="sm" className="gap-2 text-primary-600 border-primary-300 hover:bg-primary-50 dark:text-primary-400 dark:border-primary-700 dark:hover:bg-primary-900/20" onClick={onReattempt}>
              <RotateCcw className="w-4 h-4" />
              Re-attempt Session
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2" onClick={onDownloadPDF}>
            <Download className="w-4 h-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Hero Section - Dark mode optimized */}
      <div className="relative overflow-hidden rounded-3xl p-8 shadow-2xl" style={{
        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.4) 0%, rgba(139, 92, 246, 0.35) 50%, rgba(167, 139, 250, 0.3) 100%)',
        backdropFilter: 'blur(8px)'
      }}>
        <div className="absolute inset-0 bg-gradient-to-br from-black/5 via-transparent to-black/10" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-400/10 rounded-full blur-[80px] -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-purple-300/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/3" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Briefcase className="w-6 h-6 text-white" />
              <Badge variant="outline" className="border-white/40 text-white bg-white/10">
                {domainLabels[session.domain] || session.domain}
              </Badge>
              {session.status === "completed" ? (
                <Badge className="bg-emerald-500/80 text-white">Completed</Badge>
              ) : (
                <Badge className="bg-amber-500/80 text-white">In Progress</Badge>
              )}
            </div>
            <h1 className="text-3xl font-display font-bold mb-2 text-white">
              {session.session_name || session.job_title || `${domainLabels[session.domain]} Interview`}
            </h1>
            <p className="text-white/70 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {formatDate(session.created_at)}
            </p>
          </div>

          {/* Main Score - Color coded: Green for good (>=70), Red for poor (<40), White for medium - 70-80% opacity */}
          <div className="flex flex-col items-center">
            <div 
              className="w-36 h-36 flex items-center justify-center shadow-2xl transition-transform hover:scale-105"
              style={{
                borderRadius: '2rem',
                background: (session.avg_final_score || 0) >= 70 
                  ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.75), rgba(34, 197, 94, 0.65))'
                  : (session.avg_final_score || 0) < 40
                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.75), rgba(239, 68, 68, 0.65))'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.75), rgba(255,255,255,0.65))',
                backdropFilter: 'blur(16px)',
                border: (session.avg_final_score || 0) >= 70 
                  ? '2px solid rgba(34, 197, 94, 0.8)'
                  : (session.avg_final_score || 0) < 40
                    ? '2px solid rgba(239, 68, 68, 0.8)'
                    : '2px solid rgba(255,255,255,0.8)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.3)'
              }}
            >
              <div className="text-center">
                <div className="text-5xl font-bold drop-shadow-lg text-white">{Math.round(session.avg_final_score || 0)}</div>
                <div className="text-sm text-white/80 font-medium">Overall</div>
              </div>
            </div>
            <div 
              className="mt-2 text-lg font-semibold"
              style={{
                color: (session.avg_final_score || 0) >= 70 
                  ? '#22c55e' 
                  : (session.avg_final_score || 0) < 40 
                    ? '#fca5a5' 
                    : '#ffffff'
              }}
            >
              {getScoreLabel(session.avg_final_score || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 text-center shadow-lg border border-stone-200/60 dark:border-slate-700/50">
          <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">{session.total_questions}</div>
          <div className="text-sm text-stone-500 dark:text-slate-400">Total Questions</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 text-center shadow-lg border border-stone-200/60 dark:border-slate-700/50">
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{completedCount}</div>
          <div className="text-sm text-stone-500 dark:text-slate-400">Answered</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 text-center shadow-lg border border-stone-200/60 dark:border-slate-700/50">
          <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{skippedCount}</div>
          <div className="text-sm text-stone-500 dark:text-slate-400">Skipped</div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 text-center shadow-lg border border-stone-200/60 dark:border-slate-700/50">
          <div className="text-3xl font-bold text-stone-700 dark:text-slate-200">{Math.round((completedCount / session.total_questions) * 100)}%</div>
          <div className="text-sm text-stone-500 dark:text-slate-400">Completion</div>
        </div>
      </div>

      {/* Score Breakdown Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <ScoreCard label="Content" score={session.avg_content_score || 0} icon={<FileText className="w-5 h-5" />} />
        <ScoreCard label="Delivery" score={session.avg_delivery_score || 0} icon={<Mic className="w-5 h-5" />} />
        <ScoreCard label="Communication" score={session.avg_communication_score || 0} icon={<MessageSquare className="w-5 h-5" />} />
        <ScoreCard label="Voice" score={session.avg_voice_score || 0} icon={<Zap className="w-5 h-5" />} />
        <ScoreCard label="Confidence" score={session.avg_confidence_score || 0} icon={<Award className="w-5 h-5" />} />
        <ScoreCard label="Structure" score={session.avg_structure_score || 0} icon={<BarChart3 className="w-5 h-5" />} />
      </div>

      {/* Key Improvements Section */}
      {session.improvements && session.improvements.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-800/30 rounded-2xl p-6">
          <h3 className="text-lg font-display font-bold text-amber-800 dark:text-amber-400 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Key Areas for Improvement
          </h3>
          <ul className="space-y-2">
            {session.improvements.map((imp, i) => (
              <li key={i} className="flex items-start gap-3 text-amber-800 dark:text-amber-200">
                <span className="w-6 h-6 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                <span>{imp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Strengths Section */}
      {session.strengths && session.strengths.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200/50 dark:border-emerald-800/30 rounded-2xl p-6">
          <h3 className="text-lg font-display font-bold text-emerald-800 dark:text-emerald-400 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Your Strengths
          </h3>
          <ul className="space-y-2">
            {session.strengths.map((str, i) => (
              <li key={i} className="flex items-start gap-3 text-emerald-800 dark:text-emerald-200">
                <span className="text-emerald-500">✓</span>
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Questions Section */}
      <div>
        <h3 className="text-xl font-display font-bold text-stone-800 dark:text-white mb-4 flex items-center gap-3">
          <Target className="w-6 h-6 text-primary-500" />
          Question-by-Question Breakdown
        </h3>
        <div className="space-y-4">
          {attempts.length === 0 ? (
            <div className="text-center py-12 text-stone-500 dark:text-surface-400">
              No attempts recorded for this session
            </div>
          ) : (
            attempts.map((attempt, idx) => (
              <QuestionDetailCard key={attempt.id} attempt={attempt} index={idx} />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ===========================================
// Main Component
// ===========================================

export function HistoryTab({ userId, apiBase = "/api/v1", onResume, onReattempt, onViewSummary }: HistoryTabProps) {
  // State
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionDetailResponse | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");

  // Filters
  const [domainFilter, setDomainFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Available domains for filter
  const domains = [
    "software_engineering",
    "management",
    "finance",
    "teaching",
    "sales",
    "general",
  ];

  // Fetch sessions list
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        user_id: userId,
        limit: "10",
        offset: ((page - 1) * 10).toString(),
      });

      if (domainFilter) params.append("domain", domainFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);

      const response = await fetch(`${apiBase}/sessions?${params}`);

      if (!response.ok) throw new Error("Failed to fetch sessions");

      const data = await response.json();
      setSessions(data.sessions || []);
      setHasMore(data.has_more || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [userId, apiBase, page, domainFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Fetch session details
  const fetchSessionDetails = async (sessionId: string) => {
    setLoadingSession(true);
    try {
      const response = await fetch(
        `${apiBase}/sessions/${sessionId}?user_id=${userId}`
      );

      if (!response.ok) throw new Error("Failed to fetch session details");

      const data: SessionDetailResponse = await response.json();
      setSelectedSession(data);
      setViewMode("detail");
    } catch (err) {
      console.error("Failed to load session:", err);
    } finally {
      setLoadingSession(false);
    }
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedSession(null);
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    if (status === "completed") {
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    }
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
  };

  const generatePDFReport = () => {
    if (!selectedSession) return;
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const timestamp = new Date().toLocaleString();
      const { session, attempts } = selectedSession;
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(0, 102, 204);
      doc.text("Interview Performance Report", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${timestamp}`, pageWidth / 2, 28, { align: "center" });
      doc.text(`Session ID: ${session.id.substring(0, 8)}...`, pageWidth / 2, 33, { align: "center" });

      // Session Info
      doc.setFontSize(12);
      doc.setTextColor(50);
      doc.text(`Role: ${session.job_title || "General Interview"}`, 20, 45);
      doc.text(`Domain: ${domainLabels[session.domain] || session.domain}`, 20, 52);
      doc.text(`Date: ${new Date(session.created_at).toLocaleDateString()}`, 20, 59);

      // Score Summary
      doc.setFontSize(16);
      doc.setTextColor(0, 102, 204);
      doc.text("Overall Performance", 20, 75);
      
      const overallData = [
        ["Metric", "Score", "Performance Level"],
        ["Overall Score", `${Math.round(session.avg_final_score)}/100`, getScoreLabel(session.avg_final_score)],
        ["Content Quality", `${Math.round(session.avg_content_score)}/100`, getScoreLabel(session.avg_content_score)],
        ["Delivery", `${Math.round(session.avg_delivery_score)}/100`, getScoreLabel(session.avg_delivery_score)],
        ["Communication", `${Math.round(session.avg_communication_score)}/100`, getScoreLabel(session.avg_communication_score)],
        ["Voice Quality", `${Math.round(session.avg_voice_score)}/100`, getScoreLabel(session.avg_voice_score)],
        ["Confidence", `${Math.round(session.avg_confidence_score)}/100`, getScoreLabel(session.avg_confidence_score)],
        ["Structure", `${Math.round(session.avg_structure_score)}/100`, getScoreLabel(session.avg_structure_score)]
      ];

      autoTable(doc, {
        startY: 80,
        head: [overallData[0]],
        body: overallData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [0, 102, 204] },
      });

      // Question Breakdown
      doc.addPage();
      doc.setFontSize(18);
      doc.setTextColor(0, 102, 204);
      doc.text("Question Analysis", 20, 20);

      let currentY = 30;

      attempts.forEach((attempt, index) => {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.setTextColor(0, 102, 204);
        doc.text(`Q${index + 1}: ${doc.splitTextToSize(attempt.question_text, pageWidth - 40)}`, 20, currentY);
        currentY += 10;

        doc.setFontSize(10);
        doc.setTextColor(50);
        const scoreText = `Score: ${Math.round(attempt.final_score)}/100 (${getScoreLabel(attempt.final_score)})`;
        doc.text(scoreText, 20, currentY);
        currentY += 7;

        if (attempt.transcript && attempt.transcript !== "SKIPPED") {
           const answerText = doc.splitTextToSize(`Answer: "${attempt.transcript.substring(0, 300)}${attempt.transcript.length > 300 ? "..." : ""}"`, pageWidth - 40);
           doc.text(answerText, 20, currentY);
           currentY += (answerText.length * 5) + 5;
        } else {
           doc.setTextColor(150);
           doc.text("Answer: (Skipped)", 20, currentY);
           currentY += 10;
        }
        
        currentY += 5;
      });

      doc.save(`interview-report-${session.created_at.split('T')[0]}.pdf`);

    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF report. Please try again.");
    }
  };

  // Loading state
  if (loading && sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="mb-6">
          <LoadingSpinner size="md" />
        </div>
        <p className="text-stone-600 dark:text-surface-300 font-medium">
          Loading your sessions...
        </p>
        <p className="text-sm text-stone-400 dark:text-surface-500 mt-1">Fetching interview history</p>
      </div>
    );
  }

  // Error state
  if (error && sessions.length === 0) {
    return (
      <div
        className="
          flex flex-col items-center justify-center py-16
          bg-white dark:bg-surface-800 backdrop-blur-xl
          border border-stone-200/60 dark:border-surface-700/50
          rounded-2xl
        "
      >
        <div className="w-16 h-16 mb-4 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-rose-500" />
        </div>
        <p className="text-rose-600 dark:text-rose-400 mb-4 font-medium">
          {error}
        </p>
        <Button onClick={fetchSessions} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
      </div>
    );
  }

  // Detail View
  if (viewMode === "detail" && selectedSession) {
    return (
      <SessionDetailPage
        session={selectedSession.session}
        attempts={selectedSession.attempts}
        completedCount={selectedSession.completed_count}
        skippedCount={selectedSession.skipped_count}
        onBack={handleBackToList}
        onDownloadPDF={generatePDFReport}
        onReattempt={onReattempt ? () => onReattempt(selectedSession.session.id, selectedSession.session) : undefined}
        onViewSummary={onViewSummary ? () => onViewSummary(selectedSession.session.id, selectedSession.attempts) : undefined}
      />
    );
  }

  // Loading session detail overlay
  if (loadingSession) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="mb-6">
          <LoadingSpinner size="md" />
        </div>
        <p className="text-stone-600 dark:text-surface-300 font-medium">
          Loading session details...
        </p>
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary-500/10 border border-primary-500/30">
            <Briefcase className="w-6 h-6 text-primary-500" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-stone-800 dark:text-white">
              Interview Sessions
            </h2>
            <p className="text-sm text-stone-500 dark:text-surface-400">
              Review your past interview sessions
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="px-3 py-1.5 text-sm font-medium border-primary-500/30 text-primary-600 dark:text-primary-400"
        >
          {sessions.length} sessions
        </Badge>
      </div>

      {/* Filters */}
      <div
        className="
          p-4 
          bg-white dark:bg-surface-800 backdrop-blur-xl
          border border-stone-200/60 dark:border-surface-700/50
          rounded-2xl shadow-lg
        "
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-stone-500" />
          <span className="text-sm font-medium text-stone-600 dark:text-surface-300">
            Filters
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
            <input
              id="session-search"
              name="session-search"
              type="text"
              className="
                w-full pl-10 pr-4 py-2.5
                bg-stone-50 dark:bg-surface-900
                border border-stone-200 dark:border-surface-700
                rounded-xl text-sm text-stone-700 dark:text-white
                focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
                transition-all duration-200
              "
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by job title or description..."
            />
          </div>

          {/* Domain Filter */}
          <div className="relative">
            <select
              className="
                w-full px-4 py-2.5 pr-8
                bg-stone-50 dark:bg-surface-900
                border border-stone-200 dark:border-surface-700
                rounded-xl text-sm text-stone-700 dark:text-white
                focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
                transition-all duration-200
                appearance-none cursor-pointer
              "
              value={domainFilter}
              onChange={(e) => {
                setDomainFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Domains</option>
              {domains.map((d) => (
                <option key={d} value={d}>
                  {domainLabels[d] || d}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              className="
                w-full px-4 py-2.5 pr-8
                bg-stone-50 dark:bg-surface-900
                border border-stone-200 dark:border-surface-700
                rounded-xl text-sm text-stone-700 dark:text-white
                focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
                transition-all duration-200
                appearance-none cursor-pointer
              "
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.length === 0 ? (
          <div
            className="
              col-span-full flex flex-col items-center justify-center py-16
              bg-white dark:bg-surface-800 backdrop-blur-xl
              border border-stone-200/60 dark:border-surface-700/50
              rounded-2xl
            "
          >
            <div className="w-16 h-16 mb-4 rounded-full bg-stone-100 dark:bg-surface-700 flex items-center justify-center">
              <Briefcase className="w-8 h-8 text-stone-400" />
            </div>
            <p className="text-stone-600 dark:text-surface-300 font-medium mb-1">
              No sessions found
            </p>
            <p className="text-sm text-stone-400 dark:text-surface-500">
              Start practicing to build your history!
            </p>
          </div>
        ) : (
          sessions.map((session, idx) => (
            <div
              key={session.id}
              onClick={() => fetchSessionDetails(session.id)}
              className={`
                group relative overflow-hidden cursor-pointer
                bg-white dark:bg-surface-800 backdrop-blur-sm
                border rounded-2xl p-5
                transition-all duration-300 ease-out
                hover:shadow-xl hover:-translate-y-1
                animate-fade-in
                border-stone-200/60 dark:border-surface-700/50 hover:border-primary-400/50
              `}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* Score indicator border (left side) */}
              <div
                className={`absolute top-0 bottom-0 left-0 w-1.5 transition-all duration-300 ${
                  session.avg_final_score >= 80
                    ? "bg-emerald-500"
                    : session.avg_final_score >= 60
                    ? "bg-amber-500"
                    : "bg-rose-500"
                }`}
              />

              <div className="flex justify-between items-start mb-4 pt-1">
                <div className="flex-1 pr-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(
                        session.status
                      )}`}
                    >
                      {session.status === "completed" ? "Completed" : "In Progress"}
                    </span>
                    {session.status === "in_progress" && onResume && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onResume(session.id);
                        }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-primary-500/10 text-primary-600 hover:bg-primary-500/20 transition-colors"
                      >
                        <Play className="w-3 h-3" />
                        Continue
                      </button>
                    )}
                  </div>
                  <h3 className="font-semibold text-stone-800 dark:text-white mb-1 line-clamp-1">
                    {session.session_name || session.job_title || `${domainLabels[session.domain]} Interview`}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-surface-400">
                    {domainLabels[session.domain] || session.domain}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-3xl font-bold ${getScoreColor(session.avg_final_score)}`}>
                    {Math.round(session.avg_final_score || 0)}
                  </p>
                  <p className="text-xs text-stone-400 dark:text-surface-500">/100</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-surface-400">
                <span className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  {session.completed_questions}/{session.total_questions} questions
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDate(session.created_at).split(',')[0]}
                </span>
              </div>

              {/* Hover indicator */}
              <div className="absolute inset-0 bg-primary-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300 dark:text-surface-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {(hasMore || page > 1) && (
        <div className="flex justify-center items-center gap-3 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <span className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-surface-300 bg-stone-100 dark:bg-surface-700 rounded-lg">
            Page {page}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasMore}
            onClick={() => setPage((p) => p + 1)}
            className="gap-1"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default HistoryTab;
