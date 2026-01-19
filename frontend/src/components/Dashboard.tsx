/**
 * AI Interview Feedback MVP - Dashboard Component
 *
 * Displays user's performance statistics, score trends, and recent attempts.
 * Features a 6-score radar chart for visual feedback.
 * Now includes: History, Improvement, and Reports tabs.
 *
 * Author: Member 3 (Frontend)
 */

import { useState, useEffect } from "react";
import {
  getDashboard,
  DashboardResponse,
  SessionSummary,
} from "../api/apiClient";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import ScoreRadarChart from "./ScoreRadarChart";
import { HistoryTab } from "./HistoryTab";
import {
  Target,
  BarChart3,
  Trophy,
  Flame,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  History,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Zap,
  Award,
  Sparkles,
} from "lucide-react";

// ===========================================
// Types
// ===========================================

type DashboardTab = "overview" | "history";

// ===========================================
// Animated Icon Wrapper
// ===========================================

function AnimatedIcon({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
        relative flex items-center justify-center
        w-12 h-12 rounded-xl
        bg-gradient-to-br from-primary-500/20 to-secondary-500/20
        border border-primary-500/30
        shadow-lg shadow-primary-500/10
        transition-all duration-300 group-hover:scale-110 group-hover:shadow-primary-500/20
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// ===========================================
// Constants
// ===========================================

const domainLabels: Record<string, string> = {
  management: "Management",
  software_engineering: "Software Engineering",
  finance: "Finance",
  teaching: "Teaching",
  sales: "Sales",
  general: "General",
};

// ===========================================
// Subcomponents
// ===========================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: "improving" | "declining" | "stable";
  accentColor?: string;
}

function StatCard({ title, value, subtitle, icon, trend }: StatCardProps) {
  const trendConfig = {
    improving: {
      icon: <TrendingUp className="w-4 h-4" />,
      text: "Improving",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    declining: {
      icon: <TrendingDown className="w-4 h-4" />,
      text: "Needs focus",
      color: "text-rose-500",
      bg: "bg-rose-500/10",
    },
    stable: {
      icon: <Minus className="w-4 h-4" />,
      text: "Stable",
      color: "text-slate-400",
      bg: "bg-slate-400/10",
    },
  };

  return (
    <div
      className="
        group relative overflow-hidden
        bg-white dark:bg-surface-800
        backdrop-blur-xl
        border border-stone-200/60 dark:border-surface-700
        rounded-2xl p-6
        shadow-lg hover:shadow-xl
        transition-all duration-500 ease-out
        hover:-translate-y-1 hover:border-primary-400/50
      "
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-secondary-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative flex items-start gap-4">
        <AnimatedIcon>{icon}</AnimatedIcon>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-stone-500 dark:text-surface-400 mb-1">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold font-display text-stone-800 dark:text-white tracking-tight">
              {value}
            </p>
          </div>
          {subtitle && (
            <p className="text-xs text-stone-400 dark:text-surface-500 mt-1">
              {subtitle}
            </p>
          )}
          {trend && (
            <div
              className={`
                inline-flex items-center gap-1.5 mt-2 px-2 py-1 rounded-full text-xs font-medium
                ${trendConfig[trend].color} ${trendConfig[trend].bg}
              `}
            >
              {trendConfig[trend].icon}
              {trendConfig[trend].text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface SessionCardProps {
  session: SessionSummary;
  onClick: () => void;
  onResume?: (sessionId: string) => void;
}

function SessionCard({ session, onClick, onResume }: SessionCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-rose-500";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80)
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
    if (score >= 60)
      return "bg-amber-500/10 text-amber-600 border-amber-500/30";
    return "bg-rose-500/10 text-rose-600 border-rose-500/30";
  };

  return (
    <div
      onClick={onClick}
      className="
        group relative overflow-hidden cursor-pointer
        bg-white dark:bg-surface-800
        backdrop-blur-sm
        border border-stone-200/60 dark:border-surface-700
        rounded-xl p-4
        transition-all duration-300 ease-out
        hover:shadow-lg hover:-translate-y-0.5 hover:border-primary-400/50
      "
    >
      {/* Score indicator border (left side) */}
      {session.avg_score !== undefined && (
        <div
          className={`absolute top-0 bottom-0 left-0 w-1.5 ${getScoreColor(
            session.avg_score
          )} transition-all duration-300`}
        />
      )}

      <div className="flex justify-between items-start mb-3 pt-1">
        <div className="flex-1 pr-2">
                <h3 className="font-semibold text-stone-800 dark:text-white truncate pr-20">
                  {session.session_name || session.job_title || `${domainLabels[session.domain] || session.domain} Interview`}
                </h3>
          <span className="text-[10px] uppercase tracking-wider font-bold text-primary-500">
            {session.domain}
          </span>
        </div>
        {session.avg_score !== undefined && (
          <span
            className={`
              flex-shrink-0 px-2.5 py-1 rounded-lg text-sm font-bold border
              ${getScoreBadge(session.avg_score)}
            `}
          >
            {Math.round(session.avg_score)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 mt-2">
        <div className="flex flex-col">
          <span className="text-[10px] text-stone-400 dark:text-surface-500 uppercase font-bold">Progress</span>
          <span className="text-xs font-medium text-stone-700 dark:text-surface-200">
            {session.completed_questions}/{session.total_questions} Questions
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-stone-400 dark:text-surface-500 uppercase font-bold">Status</span>
          <span className={`text-xs font-bold ${session.status === 'completed' ? 'text-emerald-500' : 'text-amber-500'}`}>
            {session.status === 'completed' ? 'Completed' : 'In Progress'}
          </span>
        </div>
        {session.status === 'in_progress' && onResume && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onResume(session.id);
            }}
            className="ml-auto text-xs bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-lg font-bold transition-colors shadow-sm shadow-primary-500/20"
          >
            Continue
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-surface-500 mt-3">
        <Clock className="w-3.5 h-3.5" />
        {new Date(session.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric"
        })}
      </div>

      {/* Hover chevron */}
      <ChevronRight
        className="
          absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 
          text-stone-300 dark:text-surface-600
          opacity-0 group-hover:opacity-100 group-hover:translate-x-1
          transition-all duration-300
        "
      />
    </div>
  );
}

interface StrengthsWeaknessesProps {
  strengths: string[];
  weaknesses: string[];
}

function StrengthsWeaknesses({
  strengths,
  weaknesses,
}: StrengthsWeaknessesProps) {
  return (
    <div
      className="
        bg-white dark:bg-surface-800
        border border-stone-200/60 dark:border-surface-700
        rounded-2xl p-6 shadow-lg
      "
    >
      <h3 className="text-lg font-display font-bold text-stone-800 dark:text-white mb-5 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary-500" />
        Your Profile
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Strengths
          </h4>
          {strengths.length > 0 ? (
            <ul className="space-y-2">
              {strengths.map((s, i) => (
                <li
                  key={i}
                  className="
                    text-sm text-stone-700 dark:text-surface-200 
                    flex items-start gap-2 p-2 rounded-lg
                    bg-emerald-50/50 dark:bg-emerald-900/10
                    border border-emerald-200/50 dark:border-emerald-800/30
                    animate-fade-in
                  "
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-500 dark:text-surface-400 italic">
              Complete more attempts to identify strengths
            </p>
          )}
        </div>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Focus Areas
          </h4>
          {weaknesses.length > 0 ? (
            <ul className="space-y-2">
              {weaknesses.map((w, i) => (
                <li
                  key={i}
                  className="
                    text-sm text-stone-700 dark:text-surface-200 
                    flex items-start gap-2 p-2 rounded-lg
                    bg-amber-50/50 dark:bg-amber-900/10
                    border border-amber-200/50 dark:border-amber-800/30
                    animate-fade-in
                  "
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-500 dark:text-surface-400 italic">
              Looking great across all areas!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Tab Button Component
// ===========================================

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex-1 flex items-center justify-center gap-2 
        px-4 py-2.5 rounded-xl text-sm font-medium
        transition-all duration-300 ease-out
        ${
          active
            ? "bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-400 shadow-md"
            : "text-stone-600 dark:text-surface-400 hover:text-stone-800 dark:hover:text-white hover:bg-white/50 dark:hover:bg-surface-700/50"
        }
      `}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ===========================================
// Main Dashboard Component
// ===========================================

interface DashboardProps {
  onStartPractice: () => void;
  onResumeSession: (sessionId: string) => void;
  onReattemptSession?: (sessionId: string) => void;
  onViewSummary?: (sessionId: string) => void;
}

export default function Dashboard({ onStartPractice, onResumeSession, onReattemptSession, onViewSummary }: DashboardProps) {
  const { user, isLoggedIn } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");

  useEffect(() => {
    async function fetchDashboard() {
      if (!isLoggedIn) {
        setLoading(false);
        setError("Please log in to view your dashboard");
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = await getDashboard();
        setDashboardData(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load dashboard";
        if (
          errorMessage.includes("Authentication") ||
          errorMessage.includes("401")
        ) {
          setError("Please log in to view your dashboard");
        } else if (
          errorMessage.includes("fetch") ||
          errorMessage.includes("network")
        ) {
          setError(
            "Unable to connect to server. Please check your connection."
          );
        } else {
          setDashboardData({
            user: { id: "", email: "" },
            stats: {
              total_attempts: 0,
              total_sessions: 0,
              average_score: 0,
              best_score: 0,
              practice_streak: 0,
              score_trend: "stable",
              strengths: [],
              weaknesses: [],
            },
            recent_sessions: [],
            score_history: [],
          });
        }
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [isLoggedIn]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="mb-6">
          <LoadingSpinner size="xl" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-display font-bold text-stone-800 dark:text-white">
            Loading your dashboard
          </p>
          <p className="text-stone-500 dark:text-surface-400">
            Fetching your latest session data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div
          className="
            text-center p-8 max-w-md
            bg-white/80 dark:bg-surface-800/60 backdrop-blur-xl
            border border-stone-200/60 dark:border-surface-700/50
            rounded-2xl shadow-xl
          "
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>
          <h3 className="text-xl font-display font-bold text-stone-800 dark:text-white mb-2">
            Unable to load dashboard
          </h3>
          <p className="text-stone-600 dark:text-surface-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="
              inline-flex items-center gap-2 px-6 py-3 rounded-xl
              bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium
              shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30
              transition-all duration-300 hover:-translate-y-0.5
            "
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { stats, recent_sessions } = dashboardData;

  // Calculate average scores for radar chart
  const averageScores = {
    content: stats.average_score || 0,
    delivery: stats.average_score || 0,
    communication: stats.average_score || 0,
    voice: stats.average_score || 0,
    confidence: stats.average_score || 0,
    structure: stats.average_score || 0,
  };

  // We don't have per-session breakdown of these in DashboardResponse yet, 
  // so we show the overall average for now.

  return (
    <div className="space-y-6 animate-fade-in px-4 md:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-stone-800 dark:text-white flex items-center gap-3">
          Welcome back
          {user?.user_metadata?.full_name
            ? `, ${user.user_metadata.full_name}`
            : ""}
          <span className="inline-block animate-wave origin-bottom-right">
            <Award className="w-8 h-8 text-primary-500" />
          </span>
        </h1>
        <p className="text-stone-600 dark:text-surface-400">
          Here's an overview of your interview preparation progress
        </p>
      </div>

      {/* Tab Navigation */}
      {/* Tab Navigation */}
      {/* Tab Navigation */}
      <div className="p-1.5 bg-stone-100/80 dark:bg-transparent backdrop-blur-sm rounded-2xl border border-stone-200/50 dark:border-transparent">
        <div className="flex gap-1">
          <TabButton
            active={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
            icon={<BarChart3 className="w-4 h-4" />}
            label="Overview"
          />
          <TabButton
            active={activeTab === "history"}
            onClick={() => setActiveTab("history")}
            icon={<History className="w-4 h-4" />}
            label="History"
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<Target className="w-6 h-6 text-primary-500" />}
                title="Total Sessions"
                value={stats.total_sessions}
                subtitle="interview rounds"
              />
              <StatCard
                icon={<BarChart3 className="w-6 h-6 text-secondary-500" />}
                title="Average Score"
                value={`${Math.round(stats.average_score)}/100`}
                trend={stats.score_trend}
              />
              <StatCard
                icon={<Trophy className="w-6 h-6 text-amber-500" />}
                title="Best Score"
                value={`${Math.round(stats.best_score)}/100`}
                subtitle="personal record"
              />
              <StatCard
                icon={<Flame className="w-6 h-6 text-rose-500" />}
                title="Practice Streak"
                value={`${stats.practice_streak} days`}
                subtitle="keep it up!"
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Chart and Strengths */}
              <div className="lg:col-span-2 space-y-6">
                {/* Score Radar Chart */}
                <div
                  className="
                    bg-white dark:bg-surface-800
                    border border-stone-200/60 dark:border-surface-700
                    rounded-2xl p-6 shadow-lg
                  "
                >
                  <h3 className="text-lg font-display font-bold text-stone-800 dark:text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary-500" />
                    Your 6-Score Profile
                  </h3>
                  <ScoreRadarChart scores={averageScores} />
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    {[
                      {
                        label: "Content (30%)",
                        color: "bg-primary-500",
                        value: averageScores.content,
                      },
                      {
                        label: "Delivery (15%)",
                        color: "bg-emerald-500",
                        value: averageScores.delivery,
                      },
                      {
                        label: "Communication (15%)",
                        color: "bg-violet-500",
                        value: averageScores.communication,
                      },
                      {
                        label: "Voice (15%)",
                        color: "bg-amber-500",
                        value: averageScores.voice,
                      },
                      {
                        label: "Confidence (15%)",
                        color: "bg-pink-500",
                        value: averageScores.confidence,
                      },
                      {
                        label: "Structure (10%)",
                        color: "bg-cyan-500",
                        value: averageScores.structure,
                      },
                    ].map(({ label, color, value }) => (
                      <div
                        key={label}
                        className="flex items-center gap-2 p-2 rounded-lg bg-stone-50 dark:bg-surface-700"
                      >
                        <span
                          className={`w-3 h-3 ${color} rounded-full shadow-sm`}
                        ></span>
                        <span className="text-stone-600 dark:text-surface-300 font-medium">
                          {label}
                        </span>
                        <span className="ml-auto font-bold text-stone-800 dark:text-white">
                          {Math.round(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strengths & Weaknesses */}
                <StrengthsWeaknesses
                  strengths={stats.strengths}
                  weaknesses={stats.weaknesses}
                />
              </div>

              {/* Right Column: Recent Attempts */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-display font-bold text-stone-800 dark:text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary-500" />
                    Recent Sessions
                  </h3>
                  <button
                    onClick={() => setActiveTab("history")}
                    className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:text-primary-500 transition-colors flex items-center gap-1"
                  >
                    View All
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                {recent_sessions.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.recent_sessions.slice(0, 5).map((session, idx) => (
                      <div
                        key={session.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                        <SessionCard
                          session={session}
                          onClick={() => setActiveTab("history")}
                          onResume={onResumeSession}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className="
                      text-center py-12
                      bg-stone-100 dark:bg-surface-800
                      border border-stone-200/60 dark:border-surface-700
                      rounded-2xl
                    "
                  >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-stone-100 dark:bg-surface-700 flex items-center justify-center">
                      <Target className="w-8 h-8 text-stone-400" />
                    </div>
                    <p className="text-stone-500 dark:text-surface-400 mb-4">
                      No attempts yet
                    </p>
                    <button
                      onClick={onStartPractice}
                      className="
                        inline-flex items-center gap-2 px-6 py-3 rounded-xl
                        bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium
                        shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30
                        transition-all duration-300 hover:-translate-y-0.5
                      "
                    >
                      <Sparkles className="w-4 h-4" />
                      Start Practicing
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && user && (
          <HistoryTab 
            userId={user.id} 
            apiBase="/api/v1" 
            onResume={onResumeSession}
            onReattempt={onReattemptSession ? (sessionId) => onReattemptSession(sessionId) : undefined}
            onViewSummary={onViewSummary ? (sessionId) => onViewSummary(sessionId) : undefined}
          />
        )}
      </div>

    </div>
  );
}
