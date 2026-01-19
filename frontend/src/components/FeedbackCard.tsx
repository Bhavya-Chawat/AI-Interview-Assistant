/**
 * AI Interview Feedback MVP - Completely Redesigned Full-Width Feedback Card
 *
 * Modern, clean feedback layout with:
 * - Full-width responsive design
 * - Dynamic content only (no static/irrelevant fallback)
 * - Clear separation when AI is unavailable
 * - Bento-grid style layout
 *
 * Author: Member 3 (Frontend)
 */

import React, { useState } from "react";
import { Question, AudioFeedbackResponse } from "../api/apiClient";
import { ScoreBreakdown } from "./ScoreBreakdown";
import {
  FileText,
  Mic,
  MessageSquare,
  Volume2,
  Shield,
  LayoutList,
  Clock,
  FolderOpen,
  AlertTriangle,
  CheckCircle2,
  Target,
  Star,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  BookOpen,
  Video,
  Eye,
  Smile,
  Move,
  Pencil,
  Zap,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  RotateCcw,
  Home,
  Info,
  Lightbulb,
} from "lucide-react";

interface FeedbackCardProps {
  feedback: AudioFeedbackResponse;
  question: Question;
  previousAttempt?: AudioFeedbackResponse | null;
  attemptNumber?: number;
  domain?: string;
  // Navigation props
  currentQuestionIndex?: number;
  totalQuestions?: number;
  onRetry?: () => void;
  onNextQuestion?: () => void;
  onPreviousQuestion?: () => void;
  onViewSummary?: () => void;
  onStartOver?: () => void;
  onGoToQuestion?: (index: number) => void;
  onSkipQuestion?: () => void;
  completedQuestions?: number[];
  skippedQuestions?: number[];
}

const FeedbackCard: React.FC<FeedbackCardProps> = ({
  feedback,
  question,
  previousAttempt,
  attemptNumber = 1,
  domain,
  currentQuestionIndex = 0,
  totalQuestions = 1,
  onRetry,
  onNextQuestion,
  onPreviousQuestion,
  onViewSummary,
  onStartOver,
  onGoToQuestion,
  onSkipQuestion: _onSkipQuestion, // Reserved for future use
  completedQuestions = [],
  skippedQuestions = [],
}) => {
  const [showTranscript, setShowTranscript] = useState<boolean>(false);
  const [showIdealAnswer, setShowIdealAnswer] = useState<boolean>(false);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"transcript" | "video" | "audio">(
    "transcript",
  );

  const {
    scores,
    feedback: llmFeedback,
    transcript,
    duration_seconds,
  } = feedback;

  // Check if LLM failed (fallback feedback)
  const llmFailed = (llmFeedback as any)?.llm_failed === true;
  const llmError =
    (llmFeedback as any)?.llm_error || "AI feedback service unavailable";

  // Check if it's a quota error
  const isQuotaError = llmError.includes("429") || llmError.includes("quota");

  // Extended feedback data
  const communicationAnalysis = (feedback as any).communication_analysis;
  const contentAnalysis = (feedback as any).content_analysis;
  const videoMetrics = (feedback as any).video_metrics;
  const audioAnalysis = {
    voice_feedback: feedback.voice_feedback || [],
    confidence_feedback: feedback.confidence_feedback || [],
    wpm: scores.wpm,
    filler_count: scores.filler_count,
    tone: videoMetrics?.expression || "Neutral",
    energy: scores.voice,
  };

  // Get score color based on value
  const getScoreColor = (score: number): string => {
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 90) return "Excellent";
    if (score >= 80) return "Very Good";
    if (score >= 70) return "Good";
    if (score >= 60) return "Fair";
    if (score >= 40) return "Needs Work";
    return "Poor";
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate improvement
  const getImprovement = (current: number, previous?: number) => {
    if (previous === undefined || previous === null) return null;
    const diff = current - previous;
    return {
      value: diff,
      label: diff >= 0 ? `+${diff.toFixed(0)}` : `${diff.toFixed(0)}`,
      isPositive: diff >= 0,
    };
  };

  const improvement = previousAttempt
    ? getImprovement(scores.final, previousAttempt.scores.final)
    : null;

  // Score items
  const scoreItems = [
    {
      key: "content",
      label: "Content",
      icon: <FileText className="w-5 h-5" />,
      score: scores.content,
      detail: `${(scores.relevance * 100).toFixed(0)}% relevance`,
    },
    {
      key: "delivery",
      label: "Delivery",
      icon: <Mic className="w-5 h-5" />,
      score: scores.delivery,
      detail: `${Math.round(scores.wpm)} WPM`,
    },
    {
      key: "communication",
      label: "Communication",
      icon: <MessageSquare className="w-5 h-5" />,
      score: scores.communication,
      detail: `${scores.grammar_errors} issues`,
    },
    {
      key: "voice",
      label: "Voice",
      icon: <Volume2 className="w-5 h-5" />,
      score: scores.voice,
      detail: "Tone & energy",
    },
    {
      key: "confidence",
      label: "Confidence",
      icon: <Shield className="w-5 h-5" />,
      score: scores.confidence,
      detail: "Composure",
    },
    {
      key: "structure",
      label: "Structure",
      icon: <LayoutList className="w-5 h-5" />,
      score: scores.structure,
      detail: "STAR method",
    },
  ];

  return (
    <div className="feedback-redesigned">
      {/* Top Navigation Bar */}
      <div className="feedback-nav-bar">
        <div className="nav-left">
          {onStartOver && (
            <button className="nav-btn secondary" onClick={onStartOver}>
              <Home className="w-4 h-4" />
              <span>Start Over</span>
            </button>
          )}
        </div>

        {/* Question Navigation */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium text-stone-500 dark:text-slate-400">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </span>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalQuestions }, (_, i) => {
              const isSkipped = skippedQuestions.includes(i);
              const isCompleted = completedQuestions.includes(i);
              const isCurrent = i === currentQuestionIndex;

              return (
                <button
                  key={i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 ${
                    isCurrent
                      ? "bg-primary-600 text-white shadow-md scale-110 ring-2 ring-primary-200 dark:ring-primary-900"
                      : isSkipped
                        ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-900/50"
                        : isCompleted || i < currentQuestionIndex
                          ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-900/50"
                          : "bg-stone-100 dark:bg-slate-700 text-stone-400 dark:text-slate-400 border border-stone-200 dark:border-slate-600 hover:bg-stone-200 dark:hover:bg-slate-600"
                  }`}
                  onClick={() => onGoToQuestion?.(i)}
                  title={
                    isSkipped
                      ? `Question ${i + 1} - Skipped (Click to reattempt)`
                      : `Question ${i + 1}`
                  }
                  disabled={
                    !onGoToQuestion ||
                    (i > currentQuestionIndex && !isCompleted && !isSkipped)
                  }
                >
                  {isSkipped ? (
                    <span className="text-[10px] font-bold">SK</span>
                  ) : isCompleted || i < currentQuestionIndex ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    i + 1
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="nav-right">
          {onRetry && (
            <button className="nav-btn primary" onClick={onRetry}>
              <RotateCcw className="w-4 h-4" />
              <span>Retry Question</span>
            </button>
          )}
        </div>
      </div>

      {/* Quota/API Error Banner */}
      {llmFailed && (
        <div className="feedback-error-banner">
          <div className="error-icon-wrapper">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="error-content">
            <h3>AI Analysis Unavailable</h3>
            {isQuotaError ? (
              <p>
                You've exceeded the free Gemini API quota. The scores below are
                calculated using ML models, but detailed AI feedback requires an
                active API subscription.
              </p>
            ) : (
              <p>
                AI feedback service is temporarily unavailable. Scores are still
                calculated using ML analysis.
              </p>
            )}
            <div className="error-actions">
              <a
                href="https://ai.google.dev/gemini-api/docs/rate-limits"
                target="_blank"
                rel="noopener noreferrer"
                className="error-link"
              >
                Learn about API limits{" "}
                <ExternalLink className="w-4 h-4 inline ml-1" />
              </a>
              {onRetry && (
                <button className="retry-btn" onClick={onRetry}>
                  <RotateCcw className="w-4 h-4" />
                  Retry with AI
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attempt Indicator */}
      {attemptNumber > 1 && (
        <div className="px-6 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-l-4 border-amber-500">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-lg">
              <Star className="w-4 h-4" />
              Attempt #{attemptNumber}
            </span>
            {previousAttempt && (
              <span className="text-sm text-amber-900 dark:text-amber-100">
                Score improved by{" "}
                <strong className="text-lg">
                  {(scores.final - previousAttempt.scores.final).toFixed(1)}
                </strong>{" "}
                points from last attempt!
              </span>
            )}
          </div>
        </div>
      )}

      {/* Hero Section - Main Score (Redesigned) */}
      <div
        className="feedback-hero relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border-2 shadow-xl p-8 mb-8"
        style={{ borderColor: getScoreColor(scores.final) }}
      >
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Target className="w-32 h-32 text-primary-500" />
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="hero-left flex-1 space-y-4 pr-4 lg:pr-12">
            {" "}
            {/* Added padding-right for spacing */}
            <div className="flex flex-wrap gap-2 text-sm font-medium">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 dark:bg-slate-700 text-stone-600 dark:text-slate-300">
                <Clock className="w-4 h-4" />
                {formatDuration(duration_seconds)}
              </span>
              {domain && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300">
                  <FolderOpen className="w-4 h-4" />
                  {domain}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-stone-800 dark:text-white mb-2">
                Performance Analysis
              </h1>
              <p className="text-lg text-stone-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                {question.question}
              </p>
            </div>
          </div>

          <div className="hero-score flex flex-col items-center md:items-end justify-center pl-4">
            {/* Score Ring Container - Gradient Progress */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              {/* SVG Ring Background */}
              <svg className="w-full h-full transform -rotate-90 drop-shadow-sm">
                <defs>
                  <linearGradient
                    id="scoreGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop
                      offset="0%"
                      stopColor={scores.final >= 60 ? "#10b981" : "#ef4444"}
                    />{" "}
                    {/* Start Color */}
                    <stop
                      offset="100%"
                      stopColor={
                        scores.final >= 80
                          ? "#22c55e"
                          : scores.final >= 60
                            ? "#f59e0b"
                            : "#ef4444"
                      }
                    />{" "}
                    {/* End Color */}
                  </linearGradient>
                </defs>
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="transparent"
                  className="text-stone-100 dark:text-slate-700"
                />
                {/* SVG Ring Progress */}
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke={
                    scores.final >= 60 ? "url(#scoreGradient)" : "#ef4444"
                  }
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray={440}
                  strokeDashoffset={440 - (440 * scores.final) / 100}
                  className="transition-all duration-1000 ease-out"
                  strokeLinecap="round"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-display font-bold text-stone-800 dark:text-white tracking-tight">
                  {Math.round(scores.final)}
                </span>
                <span
                  className={`text-xs font-extrabold uppercase tracking-widest mt-1 ${scores.final >= 80 ? "text-emerald-600" : scores.final >= 60 ? "text-amber-600" : "text-rose-600"}`}
                >
                  {getScoreLabel(scores.final)}
                </span>
              </div>
            </div>

            {improvement && (
              <div
                className={`mt-4 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 ${
                  improvement.isPositive
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                    : "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                }`}
              >
                {improvement.isPositive ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingUp className="w-4 h-4 rotate-180" />
                )}
                {improvement.label} from last attempt
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Score Grid - Bento Style */}
      <div className="score-bento-grid">
        {scoreItems.map((item) => (
          <div
            key={item.key}
            className="score-bento-card shadow-md hover:shadow-xl transition-all duration-300 dark:bg-slate-900 border border-stone-200 dark:border-slate-700 group hover:-translate-y-1"
          >
            <div
              className="bento-icon"
              style={{ color: getScoreColor(item.score) }}
            >
              {item.icon}
            </div>
            <div className="bento-content">
              <span className="bento-label">{item.label}</span>
              <div className="bento-score-row">
                <span
                  className="bento-score"
                  style={{ color: getScoreColor(item.score) }}
                >
                  {Math.round(item.score)}
                </span>
                <div className="bento-bar rounded-full overflow-hidden">
                  <div
                    className="bento-bar-fill rounded-full"
                    style={{
                      width: `${item.score}%`,
                      backgroundColor: getScoreColor(item.score),
                    }}
                  />
                </div>
              </div>
              <span className="bento-detail">{item.detail}</span>
            </div>
          </div>
        ))}
      </div>

      {/* STAR Method Analysis (Full Width) */}
      {!llmFailed && (llmFeedback as any).star_analysis && (
        <div className="feedback-card star-analysis-card shadow-lg rounded-3xl border border-blue-100 dark:border-blue-900/30 overflow-hidden bg-white dark:bg-slate-900 mb-8">
          <div className="p-6 border-b border-blue-100 dark:border-blue-800/30 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-800 dark:text-white">
                  STAR Method Analysis
                </h3>
                <p className="text-sm text-stone-500 dark:text-surface-400">
                  Structure your answer for maximum impact
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row p-6 gap-4">
            {["situation", "task", "action", "result"].map((part, index) => {
              const content = (llmFeedback as any).star_analysis[part];
              const isPresent = content?.toLowerCase().startsWith("yes");
              const isPartial = content?.toLowerCase().startsWith("partial");

              return (
                <div
                  key={part}
                  className="flex flex-col gap-3 p-4 rounded-2xl bg-stone-50 dark:bg-slate-900 border border-stone-100 dark:border-slate-700 flex-1 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
                >
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                      w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm
                      bg-gradient-to-br ${
                        index === 0
                          ? "from-amber-400 to-orange-500"
                          : index === 1
                            ? "from-blue-400 to-indigo-500"
                            : index === 2
                              ? "from-emerald-400 to-teal-500"
                              : "from-purple-400 to-pink-500"
                      } text-white
                    `}
                    >
                      {part.charAt(0).toUpperCase()}
                    </div>
                    <div
                      className={`
                      px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                      ${
                        isPresent
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : isPartial
                            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                            : "bg-stone-200 dark:bg-slate-600 text-stone-600 dark:text-slate-300"
                      }
                    `}
                    >
                      {isPresent ? "Good" : isPartial ? "Partial" : "Missing"}
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <h4 className="text-xs font-bold text-stone-400 dark:text-surface-400 uppercase tracking-widest mb-1">
                      {part}
                    </h4>
                    <p className="text-sm text-stone-600 dark:text-surface-300 leading-relaxed text-balance">
                      {content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Analysis Tabs Section */}
      <div className="analysis-tabs-container">
        <div className="tabs-header">
          <button
            className={`tab-button ${
              activeTab === "transcript" ? "active" : ""
            }`}
            onClick={() => setActiveTab("transcript")}
          >
            <FileText className="w-4 h-4" />
            Transcript Analysis
          </button>
          {videoMetrics && (
            <button
              className={`tab-button ${activeTab === "video" ? "active" : ""}`}
              onClick={() => setActiveTab("video")}
            >
              <Video className="w-4 h-4" />
              Video Analysis
            </button>
          )}
          <button
            className={`tab-button ${activeTab === "audio" ? "active" : ""}`}
            onClick={() => setActiveTab("audio")}
          >
            <Volume2 className="w-4 h-4" />
            Audio Analysis
          </button>
        </div>

        <div className="tabs-content">
          {/* Transcript Analysis Tab */}
          {activeTab === "transcript" && (
            <div className="tab-panel transcript-panel">
              {/* Transcript Card */}
              <div className="feedback-card transcript-card shadow-sm hover:shadow-md transition-shadow">
                <div
                  className="card-header cursor-pointer hover:bg-stone-50 dark:hover:bg-slate-700/50 transition-colors rounded-t-xl"
                  onClick={() => setShowTranscript(!showTranscript)}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-500" />
                    <h3>Your Response Transcript</h3>
                  </div>
                  <button className="expand-btn">
                    {showTranscript ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {showTranscript && (
                  <div className="transcript-content">
                    <p>{transcript}</p>
                    <div className="transcript-stats">
                      <span>
                        <Clock className="w-4 h-4 inline" />{" "}
                        {formatDuration(duration_seconds)}
                      </span>
                      <span>• {transcript.split(/\s+/).length} words</span>
                      <span>• {Math.round(scores.wpm)} WPM</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Keywords Analysis */}
              {(feedback.keywords_found || feedback.keywords_missing) && (
                <div className="feedback-card keywords-card">
                  <div className="card-header">
                    <Target className="w-5 h-5 text-indigo-500" />
                    <h3>Keywords Analysis</h3>
                  </div>
                  <div className="keywords-grid">
                    {feedback.keywords_found &&
                      feedback.keywords_found.length > 0 && (
                        <div className="keywords-section found">
                          <h4>
                            <CheckCircle2 className="w-4 h-4 inline text-green-500" />{" "}
                            Keywords Used
                          </h4>
                          <div className="keywords-list">
                            {feedback.keywords_found.map((kw, i) => (
                              <span key={i} className="keyword-badge success">
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    {feedback.keywords_missing &&
                      feedback.keywords_missing.length > 0 && (
                        <div className="keywords-section missing">
                          <h4>
                            <AlertTriangle className="w-4 h-4 inline text-amber-500" />{" "}
                            Missing Keywords
                          </h4>
                          <div className="keywords-list">
                            {feedback.keywords_missing.map((kw, i) => (
                              <span key={i} className="keyword-badge warning">
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Video Analysis Tab */}
          {activeTab === "video" && videoMetrics && (
            <div className="tab-panel video-panel">
              <div className="feedback-card video-analysis-card">
                <div className="card-header">
                  <Video className="w-5 h-5 text-blue-500" />
                  <h3>Visual Presence Analysis</h3>
                </div>
                <div className="video-metrics-detailed">
                  <div className="metric-row">
                    <div className="metric-card">
                      <Eye className="w-8 h-8 text-blue-500 mb-2" />
                      <h4>Eye Contact</h4>
                      <div
                        className="metric-value-large"
                        style={{
                          color: getScoreColor(
                            videoMetrics.eye_contact_percent || 0,
                          ),
                        }}
                      >
                        {Math.round(videoMetrics.eye_contact_percent || 0)}%
                      </div>
                      <p className="metric-desc">
                        {videoMetrics.eye_contact_percent >= 70
                          ? "Excellent! Strong engagement with the camera"
                          : videoMetrics.eye_contact_percent >= 50
                            ? "Good, but try to maintain more consistent eye contact"
                            : "Look at the camera more to show confidence"}
                      </p>
                    </div>

                    <div className="metric-card">
                      <Smile className="w-8 h-8 text-green-500 mb-2" />
                      <h4>Expression</h4>
                      <div className="metric-value-large text-green-600 dark:text-green-400">
                        {videoMetrics.expression || "Neutral"}
                      </div>
                      <p className="metric-desc">
                        Your dominant facial expression throughout the interview
                      </p>
                    </div>

                    <div className="metric-card">
                      <Move className="w-8 h-8 text-purple-500 mb-2" />
                      <h4>Movement Stability</h4>
                      <div
                        className="metric-value-large"
                        style={{
                          color: getScoreColor(
                            videoMetrics.movement_stability || 0,
                          ),
                        }}
                      >
                        {Math.round(videoMetrics.movement_stability || 0)}%
                      </div>
                      <p className="metric-desc">
                        {videoMetrics.movement_stability >= 70
                          ? "Steady and composed body language"
                          : "Try to minimize excessive movements"}
                      </p>
                    </div>

                    <div className="metric-card highlight">
                      <Shield className="w-8 h-8 text-amber-500 mb-2" />
                      <h4>Visual Confidence</h4>
                      <div
                        className="metric-value-large"
                        style={{
                          color: getScoreColor(
                            videoMetrics.visual_confidence || 0,
                          ),
                        }}
                      >
                        {Math.round(videoMetrics.visual_confidence || 0)}/100
                      </div>
                      <p className="metric-desc">
                        Overall confidence rating based on visual cues
                      </p>
                    </div>
                  </div>

                  <div className="video-tips">
                    <h4>
                      <Lightbulb className="w-4 h-4 inline" /> Visual Presence
                      Tips
                    </h4>
                    <ul>
                      {videoMetrics.eye_contact_percent < 60 && (
                        <li>
                          Position your camera at eye level and practice looking
                          directly at it
                        </li>
                      )}
                      {videoMetrics.movement_stability < 60 && (
                        <li>
                          Sit comfortably with good posture and avoid excessive
                          fidgeting
                        </li>
                      )}
                      {videoMetrics.expression === "neutral" && (
                        <li>
                          Show enthusiasm through natural smiles and engaged
                          expressions
                        </li>
                      )}
                      <li>
                        Use hand gestures naturally to emphasize key points
                      </li>
                      <li>
                        Maintain good lighting to ensure your face is clearly
                        visible
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audio Analysis Tab */}
          {activeTab === "audio" && (
            <div className="tab-panel audio-panel">
              <div className="feedback-card audio-analysis-card">
                <div className="card-header">
                  <Volume2 className="w-5 h-5 text-orange-500" />
                  <h3>Voice & Delivery Analysis</h3>
                </div>
                <div className="audio-metrics-detailed">
                  <div className="metric-row">
                    <div className="metric-card">
                      <Mic className="w-8 h-8 text-orange-500 mb-2" />
                      <h4>Speaking Pace</h4>
                      <div className="metric-value-large">
                        {Math.round(audioAnalysis.wpm)} WPM
                      </div>
                      <p className="metric-desc">
                        {audioAnalysis.wpm < 120
                          ? "Slow pace - Try speaking a bit faster"
                          : audioAnalysis.wpm > 160
                            ? "Fast pace - Slow down for clarity"
                            : "Ideal speaking pace"}
                      </p>
                      <div className="metric-range">
                        <span>Slow (100)</span>
                        <div className="range-bar">
                          <div
                            className="range-marker"
                            style={{
                              left: `${Math.min(
                                (audioAnalysis.wpm / 200) * 100,
                                100,
                              )}%`,
                            }}
                          />
                        </div>
                        <span>Fast (200)</span>
                      </div>
                    </div>

                    <div className="metric-card">
                      <MessageSquare className="w-8 h-8 text-red-500 mb-2" />
                      <h4>Filler Words</h4>
                      <div
                        className="metric-value-large"
                        style={{
                          color:
                            audioAnalysis.filler_count > 5
                              ? "#ef4444"
                              : "#22c55e",
                        }}
                      >
                        {audioAnalysis.filler_count}
                      </div>
                      <p className="metric-desc">
                        {audioAnalysis.filler_count === 0
                          ? "Perfect! No filler words detected"
                          : audioAnalysis.filler_count < 3
                            ? "Very good - minimal filler words"
                            : "Try to reduce 'um', 'uh', 'like', 'you know'"}
                      </p>
                    </div>

                    <div className="metric-card">
                      <Volume2 className="w-8 h-8 text-blue-500 mb-2" />
                      <h4>Voice Quality</h4>
                      <div
                        className="metric-value-large"
                        style={{ color: getScoreColor(audioAnalysis.energy) }}
                      >
                        {Math.round(audioAnalysis.energy)}
                      </div>
                      <p className="metric-desc">
                        Tone, energy, and vocal clarity throughout your response
                      </p>
                    </div>

                    <div className="metric-card">
                      <Smile className="w-8 h-8 text-purple-500 mb-2" />
                      <h4>Tone</h4>
                      <div className="metric-value-large text-purple-600 dark:text-purple-400">
                        {audioAnalysis.tone}
                      </div>
                      <p className="metric-desc">
                        Overall emotional tone detected in your voice
                      </p>
                    </div>
                  </div>

                  {/* Voice Feedback */}
                  {audioAnalysis.voice_feedback.length > 0 && (
                    <div className="audio-feedback-section">
                      <h4>
                        <Volume2 className="w-4 h-4 inline" /> Voice Quality
                        Feedback
                      </h4>
                      <ul className="feedback-list">
                        {audioAnalysis.voice_feedback.map(
                          (item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Confidence Feedback */}
                  {audioAnalysis.confidence_feedback.length > 0 && (
                    <div className="audio-feedback-section">
                      <h4>
                        <Shield className="w-4 h-4 inline" /> Confidence
                        Indicators
                      </h4>
                      <ul className="feedback-list">
                        {audioAnalysis.confidence_feedback.map(
                          (item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="audio-tips">
                    <h4>
                      <Lightbulb className="w-4 h-4 inline" /> Audio Delivery
                      Tips
                    </h4>
                    <ul>
                      {audioAnalysis.wpm < 120 && (
                        <li>
                          Increase your speaking pace slightly to sound more
                          energetic
                        </li>
                      )}
                      {audioAnalysis.wpm > 160 && (
                        <li>
                          Slow down and add pauses for emphasis and clarity
                        </li>
                      )}
                      {audioAnalysis.filler_count > 3 && (
                        <li>Practice pausing instead of using filler words</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Left Column - Context & Input */}
        <div className="feedback-column">
          {/* Summary - Always show if available */}
          {llmFeedback.summary && (
            <div className="feedback-card summary-card">
              <div className="card-header">
                <Zap className="w-5 h-5 text-amber-500" />
                <h3>AI Summary</h3>
              </div>
              <p className="summary-text">{llmFeedback.summary}</p>
            </div>
          )}

          {/* What You Did - Retrospective */}
          {!llmFailed && (llmFeedback as any).what_you_did && (
            <div className="feedback-card retrospective-card">
              <div className="card-header">
                <BookOpen className="w-5 h-5 text-blue-500" />
                <h3>What You Did</h3>
              </div>
              <div className="retro-grid">
                <div className="retro-item">
                  <strong>Opening</strong>
                  <p>{(llmFeedback as any).what_you_did.opening}</p>
                </div>
                <div className="retro-item">
                  <strong>Main Content</strong>
                  <p>{(llmFeedback as any).what_you_did.main_content}</p>
                </div>
                <div className="retro-item">
                  <strong>Closing</strong>
                  <p>{(llmFeedback as any).what_you_did.closing}</p>
                </div>
                <div className="retro-item highlight">
                  <strong>Overall Approach</strong>
                  <p>{(llmFeedback as any).what_you_did.overall_approach}</p>
                </div>
              </div>
            </div>
          )}

          {/* Transcript */}
          <div className="feedback-card transcript-card">
            <button
              className="card-header clickable"
              onClick={() => setShowTranscript(!showTranscript)}
            >
              <FileText className="w-5 h-5 text-stone-500" />
              <h3>Your Transcript</h3>
              <span className="toggle-arrow">
                {showTranscript ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </span>
            </button>
            {showTranscript && (
              <div className="transcript-content">
                <p>{transcript}</p>
              </div>
            )}
          </div>

          {/* Ideal Answer */}
          <div className="feedback-card ideal-card">
            <button
              className="card-header clickable"
              onClick={() => setShowIdealAnswer(!showIdealAnswer)}
            >
              <BookOpen className="w-5 h-5 text-purple-500" />
              <h3>Ideal Answer Reference</h3>
              <span className="toggle-arrow">
                {showIdealAnswer ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </span>
            </button>
            {showIdealAnswer && (
              <div className="ideal-content">
                <p>{question.ideal_answer}</p>
              </div>
            )}
          </div>

          {/* Example Answer - Moved to Left Column */}
          {!llmFailed && llmFeedback.example_answer && (
            <div className="feedback-card example-card">
              <div className="card-header">
                <Star className="w-5 h-5 text-amber-500" />
                <h3>Example Strong Answer</h3>
              </div>
              <blockquote className="example-quote">
                {llmFeedback.example_answer}
              </blockquote>
            </div>
          )}

          {/* Tips - Moved to Left Column */}
          {!llmFailed && llmFeedback.tips && llmFeedback.tips.length > 0 && (
            <div className="feedback-card tips-card">
              <div className="card-header">
                <Zap className="w-5 h-5 text-yellow-500" />
                <h3>Quick Tips</h3>
              </div>
              <ul className="tips-list">
                {llmFeedback.tips.map((tip: string, i: number) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column - Feedback & Improvements */}
        <div className="feedback-column">
          {/* Strengths & Weaknesses Side by Side */}
          {!llmFailed &&
            llmFeedback.strengths &&
            (llmFeedback as any).weaknesses && (
              <div className="feedback-card strengths-weaknesses-card">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {llmFeedback.strengths &&
                    llmFeedback.strengths.length > 0 && (
                      <div className="sw-column strengths">
                        <div className="sw-header">
                          <CheckCircle2 className="w-5 h-5" />
                          <h4>Strengths</h4>
                        </div>
                        <ul>
                          {llmFeedback.strengths.map((s: string, i: number) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  {(llmFeedback as any).weaknesses &&
                    (llmFeedback as any).weaknesses.length > 0 && (
                      <div className="sw-column weaknesses">
                        <div className="sw-header">
                          <AlertTriangle className="w-5 h-5" />
                          <h4>Areas to Improve</h4>
                        </div>
                        <ul>
                          {(llmFeedback as any).weaknesses.map(
                            (w: string, i: number) => (
                              <li key={i}>{w}</li>
                            ),
                          )}
                        </ul>
                      </div>
                    )}
                </div>
              </div>
            )}

          {/* Improvement Roadmap */}
          {!llmFailed &&
            (llmFeedback as any).improvement_roadmap &&
            (llmFeedback as any).improvement_roadmap.length > 0 && (
              <div className="feedback-card roadmap-card">
                <div className="card-header">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  <h3>Improvement Roadmap</h3>
                </div>
                <div className="roadmap-steps space-y-4">
                  {(llmFeedback as any).improvement_roadmap?.map(
                    (step: string, i: number) => {
                      // Clean and Parse content
                      // Expected format: "Step 1: **Title** - Content" OR "**Title** - Content"
                      // 1. Remove "Step X:" prefix
                      let cleanStep = step.replace(/^Step\s+\d+[:.-]?\s*/i, "");

                      // 2. Extract Title (**Title**)
                      let title = "";
                      let content = cleanStep;

                      const titleMatch = cleanStep.match(/\*\*(.*?)\*\*/);
                      if (titleMatch) {
                        title = titleMatch[1];
                        content = cleanStep
                          .replace(/\*\*(.*?)\*\*/, "")
                          .replace(/^[\s:-]+/, "")
                          .trim();
                      } else {
                        // Fallback: splitting by hyphen if no bold title
                        const parts = cleanStep.split(" - ");
                        if (parts.length > 1) {
                          title = parts[0].trim();
                          content = parts.slice(1).join(" - ").trim();
                        }
                      }

                      // 3. Final cleanup of any remaining markdown, numbering, or bold syntax
                      content = content
                        .replace(/^[\s:-]+/, "")
                        .replace(/\*\*/g, "")
                        .trim();

                      return (
                        <div key={i} className="flex gap-4 group">
                          {/* Number Column - Connected Timeline */}
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center text-sm font-bold border-2 border-purple-200 dark:border-purple-800 group-hover:bg-purple-500 group-hover:text-white group-hover:border-purple-500 dark:group-hover:bg-purple-600 dark:group-hover:text-white transition-all duration-300 shadow-sm relative z-10">
                              {i + 1}
                            </div>
                            {i <
                              (llmFeedback as any).improvement_roadmap.length -
                                1 && (
                              <div className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 my-1 group-hover:bg-purple-300 dark:group-hover:bg-purple-700 transition-colors"></div>
                            )}
                          </div>

                          {/* Content Card */}
                          <div className="flex-1 pb-6">
                            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 shadow-sm group-hover:shadow-md group-hover:border-purple-200 dark:group-hover:border-purple-800 dark:group-hover:bg-slate-800/50 transition-all duration-300">
                              {title && (
                                <h4 className="text-base font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                                  {title}
                                </h4>
                              )}
                              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                {content}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            )}

          {/* Sentence Improvements */}
          {!llmFailed &&
            (llmFeedback as any).sentence_feedback &&
            (llmFeedback as any).sentence_feedback.length > 0 && (
              <div className="feedback-card sentences-card">
                <div className="card-header">
                  <Pencil className="w-5 h-5 text-blue-500" />
                  <h3>Sentence Rewrites</h3>
                </div>
                <div className="sentences-list">
                  {(llmFeedback as any).sentence_feedback.map(
                    (item: any, i: number) => (
                      <div key={i} className="sentence-item">
                        <div className="sentence-original">
                          <span className="sentence-label">Before</span>
                          <p>"{item.original}"</p>
                        </div>
                        <ArrowRight className="sentence-arrow" />
                        <div className="sentence-improved">
                          <span className="sentence-label">After</span>
                          <p>"{item.improved}"</p>
                        </div>
                        {item.reason && (
                          <div className="sentence-reason">
                            <strong>Why:</strong> {item.reason}
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Communication & Content Analysis Row */}
      {(communicationAnalysis?.factors || contentAnalysis) && (
        <div className="analysis-row">
          {communicationAnalysis?.factors && (
            <div className="feedback-card analysis-card">
              <div className="card-header">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                <h3>Communication Breakdown</h3>
              </div>
              <div className="factors-grid">
                {Object.entries(communicationAnalysis.factors).map(
                  ([key, factor]: [string, any]) => (
                    <div key={key} className="factor-item">
                      <div className="factor-header">
                        <span className="factor-name">
                          {key === "grammar" && "Grammar"}
                          {key === "vocabulary_diversity" && "Vocabulary"}
                          {key === "sentence_complexity" && "Sentences"}
                          {key === "coherence" && "Coherence"}
                          {key === "professional_vocab" && "Professional"}
                        </span>
                        <span
                          className="factor-score"
                          style={{ color: getScoreColor(factor.score) }}
                        >
                          {Math.round(factor.score)}
                        </span>
                      </div>
                      <div className="factor-bar">
                        <div
                          className="factor-bar-fill"
                          style={{
                            width: `${factor.score}%`,
                            backgroundColor: getScoreColor(factor.score),
                          }}
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {contentAnalysis && (
            <div className="feedback-card analysis-card">
              <div className="card-header">
                <FileText className="w-5 h-5 text-green-500" />
                <h3>Content Analysis</h3>
              </div>
              <div className="content-metrics-grid">
                <div className="content-metric">
                  <span
                    className="metric-value"
                    style={{
                      color: getScoreColor(
                        (contentAnalysis.keyword_coverage || 0) * 100,
                      ),
                    }}
                  >
                    {((contentAnalysis.keyword_coverage || 0) * 100).toFixed(0)}
                    %
                  </span>
                  <span className="metric-label">Keyword Coverage</span>
                </div>
                <div className="content-metric">
                  <span
                    className="metric-value"
                    style={{
                      color: getScoreColor(
                        (contentAnalysis.semantic_similarity || 0) * 100,
                      ),
                    }}
                  >
                    {((contentAnalysis.semantic_similarity || 0) * 100).toFixed(
                      0,
                    )}
                    %
                  </span>
                  <span className="metric-label">Semantic Match</span>
                </div>
              </div>
              {contentAnalysis.topics_covered?.length > 0 && (
                <div className="topics-row">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>
                    Covered: {contentAnalysis.topics_covered.join(", ")}
                  </span>
                </div>
              )}
              {contentAnalysis.topics_missing?.length > 0 && (
                <div className="topics-row missing">
                  <Target className="w-4 h-4 text-red-500" />
                  <span>
                    Missing:{" "}
                    {contentAnalysis.topics_missing.slice(0, 5).join(", ")}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Video Metrics */}
          {(feedback as any).video_metrics && (
            <div className="feedback-card analysis-card">
              <div className="card-header">
                <Video className="w-5 h-5 text-purple-500" />
                <h3>Body Language</h3>
              </div>
              <div className="video-metrics-grid">
                <div className="video-metric">
                  <Eye className="w-5 h-5" />
                  <span
                    className="metric-value"
                    style={{
                      color: getScoreColor(
                        (feedback as any).video_metrics.eye_contact_percent,
                      ),
                    }}
                  >
                    {Math.round(
                      (feedback as any).video_metrics.eye_contact_percent,
                    )}
                    %
                  </span>
                  <span className="metric-label">Eye Contact</span>
                </div>
                <div className="video-metric">
                  <Smile className="w-5 h-5" />
                  <span className="metric-value expression">
                    {(feedback as any).video_metrics.expression === "confident"
                      ? "Confident"
                      : (feedback as any).video_metrics.expression === "nervous"
                        ? "Nervous"
                        : "Neutral"}
                  </span>
                  <span className="metric-label">Expression</span>
                </div>
                <div className="video-metric">
                  <Move className="w-5 h-5" />
                  <span
                    className="metric-value"
                    style={{
                      color: getScoreColor(
                        (feedback as any).video_metrics.movement_stability,
                      ),
                    }}
                  >
                    {Math.round(
                      (feedback as any).video_metrics.movement_stability,
                    )}
                    %
                  </span>
                  <span className="metric-label">Stability</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Previous Attempt Comparison */}
      {previousAttempt && (
        <div className="feedback-card comparison-card">
          <div className="card-header">
            <RefreshCw className="w-5 h-5 text-green-500" />
            <h3>Progress from Last Attempt</h3>
          </div>
          <div className="comparison-grid">
            {scoreItems.map((item) => {
              const prev = previousAttempt.scores[
                item.key as keyof typeof previousAttempt.scores
              ] as number;
              const diff = item.score - prev;
              return (
                <div key={item.key} className="comparison-item">
                  <span className="comp-label">{item.label}</span>
                  <div className="comp-values">
                    <span className="comp-prev">{Math.round(prev)}</span>
                    <ArrowRight className="w-4 h-4" />
                    <span
                      className="comp-current"
                      style={{ color: getScoreColor(item.score) }}
                    >
                      {Math.round(item.score)}
                    </span>
                  </div>
                  <span
                    className={`comp-diff ${
                      diff >= 0 ? "positive" : "negative"
                    }`}
                  >
                    {diff >= 0 ? "+" : ""}
                    {Math.round(diff)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No AI Fallback - Clean message */}
      {llmFailed && (
        <div className="no-ai-section">
          <div className="no-ai-content">
            <RefreshCw className="w-12 h-12 text-stone-500" />
            <h3>AI Feedback Unavailable</h3>
            <p>
              The scores above are calculated using ML analysis. For detailed
              AI-powered insights including sentence rewrites, STAR analysis,
              and personalized tips, please ensure your Gemini API quota is
              available.
            </p>
            <div className="no-ai-actions">
              {onRetry && (
                <button className="no-ai-button primary" onClick={onRetry}>
                  <RotateCcw className="w-4 h-4" />
                  Retry with AI
                </button>
              )}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="no-ai-button secondary"
              >
                Check API Status <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Score Breakdown Button */}
      <div className="px-6 pb-6 mt-8">
        <button
          onClick={() => setShowScoreBreakdown(true)}
          className="w-full px-6 py-4 rounded-xl border-2 border-primary-500 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-slate-800 dark:to-slate-800 text-primary-700 dark:text-primary-300 hover:from-primary-100 hover:to-secondary-100 dark:hover:from-slate-700 dark:hover:to-slate-700 transition-all duration-200 flex items-center justify-center gap-3 font-semibold text-lg shadow-lg hover:shadow-xl"
        >
          <Info className="w-6 h-6" />
          View Detailed Score Breakdown & Formulas
        </button>
      </div>

      {/* Bottom Navigation */}
      <div className="feedback-bottom-nav">
        <div className="bottom-nav-left">
          {currentQuestionIndex > 0 && onPreviousQuestion && (
            <button
              className="bottom-nav-btn secondary"
              onClick={onPreviousQuestion}
            >
              <ChevronLeft className="w-5 h-5" />
              Previous Question
            </button>
          )}
        </div>

        <div className="bottom-nav-center">
          {onRetry && (
            <button className="bottom-nav-btn outline" onClick={onRetry}>
              <RotateCcw className="w-4 h-4" />
              Retry This Question
            </button>
          )}
        </div>

        <div className="bottom-nav-right">
          {currentQuestionIndex < totalQuestions - 1 && onNextQuestion ? (
            <button className="bottom-nav-btn primary" onClick={onNextQuestion}>
              Next Question
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : onViewSummary ? (
            <button className="bottom-nav-btn primary" onClick={onViewSummary}>
              View Summary
              <ArrowRight className="w-5 h-5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Score Breakdown Modal */}
      <ScoreBreakdown
        isOpen={showScoreBreakdown}
        onClose={() => setShowScoreBreakdown(false)}
        scores={scores}
      />
    </div>
  );
};

export default FeedbackCard;
