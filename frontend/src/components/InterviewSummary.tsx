/**
 * AI Interview Feedback MVP - Professional Interview Summary Component
 *
 * Modern, comprehensive end-of-interview analysis:
 * - Professional layout with detailed metrics
 * - Overall performance overview
 * - Question-by-question breakdown with expanded details
 * - Body language and video analysis summary
 * - Personalized improvement recommendations
 * - PDF report download functionality
 *
 * Author: AI Assistant
 */

import React, { useState } from "react";
import { AudioFeedbackResponse } from "../api/apiClient";
import {
  TrendingUp,
  BarChart3,
  Target,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Eye,
  Move,
  Home,
  FileDown,
  ChevronDown,
  ChevronUp,
  Mic,
  Brain,
  Sun,
  Moon,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface InterviewSummaryProps {
  sessionHistory: AudioFeedbackResponse[];
  onClose: () => void;
  sessionId?: string; // Optional: for storing report with session
  userId?: string; // Optional: for storing report with user
}

// Animated score counter component
const AnimatedScore: React.FC<{ value: number; color: string }> = ({
  value,
  color,
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  React.useEffect(() => {
    const duration = 1000;
    const startTime = Date.now();
    const startValue = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startValue + (value - startValue) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span className="animated-score" style={{ color }}>
      {displayValue}
    </span>
  );
};

const InterviewSummary: React.FC<InterviewSummaryProps> = ({
  sessionHistory,
  onClose,
}) => {
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  if (sessionHistory.length === 0) {
    return (
      <div className="interview-summary-page">
        <div className="summary-header-bar">
          <div className="header-left">
            <h1>Interview Session Complete</h1>
            <p className="header-subtitle">No responses were recorded</p>
          </div>
          <div className="header-actions">
            <button className="action-btn close-btn" onClick={onClose}>
              <Home className="w-5 h-5" />
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="summary-section overall-section">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-stone-700 dark:text-white mb-3">
              All Questions Skipped
            </h2>
            <p className="text-stone-500 dark:text-surface-400 max-w-md mb-6">
              You didn't answer any questions in this session. Start a new
              interview to practice your responses and get AI-powered feedback.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-primary-500/20"
            >
              Start New Interview
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate overall averages
  const avgContent =
    sessionHistory.reduce((sum, h) => sum + h.scores.content, 0) /
    sessionHistory.length;
  const avgDelivery =
    sessionHistory.reduce((sum, h) => sum + h.scores.delivery, 0) /
    sessionHistory.length;
  const avgCommunication =
    sessionHistory.reduce((sum, h) => sum + h.scores.communication, 0) /
    sessionHistory.length;
  const avgVoice =
    sessionHistory.reduce((sum, h) => sum + h.scores.voice, 0) /
    sessionHistory.length;
  const avgConfidence =
    sessionHistory.reduce((sum, h) => sum + h.scores.confidence, 0) /
    sessionHistory.length;
  const avgStructure =
    sessionHistory.reduce((sum, h) => sum + h.scores.structure, 0) /
    sessionHistory.length;
  const avgFinal =
    sessionHistory.reduce((sum, h) => sum + h.scores.final, 0) /
    sessionHistory.length;

  // Video metrics
  const videoResponses = sessionHistory.filter((h) => (h as any).video_metrics);
  const avgEyeContact =
    videoResponses.length > 0
      ? videoResponses.reduce(
          (sum, h) =>
            sum + ((h as any).video_metrics?.eye_contact_percent || 0),
          0,
        ) / videoResponses.length
      : null;
  const avgStability =
    videoResponses.length > 0
      ? videoResponses.reduce(
          (sum, h) => sum + ((h as any).video_metrics?.movement_stability || 0),
          0,
        ) / videoResponses.length
      : null;
  const avgVisualConfidence =
    videoResponses.length > 0
      ? videoResponses.reduce(
          (sum, h) => sum + ((h as any).video_metrics?.visual_confidence || 0),
          0,
        ) / videoResponses.length
      : null;

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#f59e0b";
    return "#ef4444";
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 90) return "Outstanding";
    if (score >= 80) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 60) return "Fair";
    if (score >= 40) return "Needs Work";
    return "Poor";
  };

  const generateImprovements = (): Array<{
    text: string;
    type: "strength" | "improvement";
  }> => {
    const suggestions: Array<{
      text: string;
      type: "strength" | "improvement";
    }> = [];

    // Strengths
    if (avgDelivery >= 80) {
      suggestions.push({
        text: "Excellent delivery and speaking pace throughout the interview",
        type: "strength",
      });
    }
    if (avgFinal >= 80) {
      suggestions.push({
        text: "Outstanding overall performance - you answered questions comprehensively",
        type: "strength",
      });
    }
    if (avgStructure >= 80) {
      suggestions.push({
        text: "Well-structured responses with clear beginnings, middles, and ends",
        type: "strength",
      });
    }

    // Improvements
    if (avgContent < 70) {
      suggestions.push({
        text: "Content: Include more specific examples with quantifiable results (numbers, metrics, outcomes)",
        type: "improvement",
      });
    }
    if (avgCommunication < 70) {
      suggestions.push({
        text: "Communication: Practice speaking in shorter, clearer sentences to improve message clarity",
        type: "improvement",
      });
    }

    const avgWpm =
      sessionHistory.reduce((sum, h) => sum + h.scores.wpm, 0) /
      sessionHistory.length;
    if (avgWpm > 160) {
      suggestions.push({
        text: `Speaking Pace: Slow down from ${Math.round(
          avgWpm,
        )} WPM to 140-150 WPM for better clarity`,
        type: "improvement",
      });
    } else if (avgWpm < 120) {
      suggestions.push({
        text: `Speaking Pace: Speed up from ${Math.round(
          avgWpm,
        )} WPM to 140-150 WPM to sound more confident`,
        type: "improvement",
      });
    }

    if (avgEyeContact !== null && avgEyeContact < 60) {
      suggestions.push({
        text: `Eye Contact: Increase from ${Math.round(
          avgEyeContact,
        )}% to at least 70% by looking directly at the camera`,
        type: "improvement",
      });
    }

    if (suggestions.length < 3) {
      suggestions.push({
        text: "Excellent preparation! Continue practicing with diverse question types",
        type: "strength",
      });
    }

    return suggestions;
  };

  const generatePDFReport = () => {
    setDownloadingPDF(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const timestamp = new Date().toLocaleString();

      // Header
      doc.setFontSize(22);
      doc.setTextColor(0, 102, 204);
      doc.text("Interview Performance Report", pageWidth / 2, 20, {
        align: "center",
      });

      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated on: ${timestamp}`, pageWidth / 2, 28, {
        align: "center",
      });
      doc.text(`Total Questions: ${sessionHistory.length}`, pageWidth / 2, 33, {
        align: "center",
      });

      // Session Summary Section
      doc.setFontSize(16);
      doc.setTextColor(0, 102, 204);
      doc.text("Overall Performance", 20, 45);

      const overallData = [
        ["Metric", "Score", "Performance Level"],
        [
          "Overall Score",
          `${Math.round(avgFinal)}/100`,
          getScoreLabel(avgFinal),
        ],
        [
          "Content Quality",
          `${Math.round(avgContent)}/100`,
          getScoreLabel(avgContent),
        ],
        [
          "Delivery",
          `${Math.round(avgDelivery)}/100`,
          getScoreLabel(avgDelivery),
        ],
        [
          "Communication",
          `${Math.round(avgCommunication)}/100`,
          getScoreLabel(avgCommunication),
        ],
        [
          "Voice Quality",
          `${Math.round(avgVoice)}/100`,
          getScoreLabel(avgVoice),
        ],
        [
          "Confidence",
          `${Math.round(avgConfidence)}/100`,
          getScoreLabel(avgConfidence),
        ],
        [
          "Structure",
          `${Math.round(avgStructure)}/100`,
          getScoreLabel(avgStructure),
        ],
      ];

      autoTable(doc, {
        startY: 50,
        head: [overallData[0]],
        body: overallData.slice(1),
        theme: "striped",
        headStyles: { fillColor: [0, 102, 204] },
      });

      // Recommendations Section
      const finalY = (doc as any).lastAutoTable.finalY || 100;
      doc.setFontSize(16);
      doc.setTextColor(0, 102, 204);
      doc.text("Key Recommendations", 20, finalY + 15);

      doc.setFontSize(11);
      doc.setTextColor(50);
      let currentY = finalY + 23;
      generateImprovements().forEach((rec) => {
        const prefix = rec.type === "strength" ? "✓ " : "⚠ ";
        const lines = doc.splitTextToSize(
          `${prefix}${rec.text}`,
          pageWidth - 40,
        );
        doc.text(lines, 25, currentY);
        currentY += lines.length * 7;
      });

      // New Page for Question Breakdown
      doc.addPage();
      doc.setFontSize(18);
      doc.setTextColor(0, 102, 204);
      doc.text("Question-by-Question Breakdown", 20, 20);

      let questionY = 30;
      sessionHistory.forEach((item, index) => {
        // Check if we need a new page
        if (questionY > 240) {
          doc.addPage();
          questionY = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(0, 102, 204);
        doc.text(
          `Question ${index + 1}: ${
            item.question_text?.substring(0, 70) ||
            `Question ${item.question_id}`
          }...`,
          20,
          questionY,
        );

        doc.setFontSize(10);
        doc.setTextColor(80);
        doc.text(
          `Score: ${Math.round(item.scores.final)}/100`,
          20,
          questionY + 7,
        );

        // Your Answer
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text("Your Response:", 20, questionY + 15);

        doc.setFontSize(10);
        doc.setTextColor(100);
        const transcriptLines = doc.splitTextToSize(
          `"${item.transcript}"`,
          pageWidth - 40,
        );
        doc.text(transcriptLines, 20, questionY + 20);

        const feedbackStart = questionY + 20 + transcriptLines.length * 5 + 5;

        // Feedback
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text("AI Feedback Summary:", 20, feedbackStart);

        doc.setFontSize(10);
        doc.setTextColor(100);
        const feedbackLines = doc.splitTextToSize(
          item.feedback?.summary || "No summary available.",
          pageWidth - 40,
        );
        doc.text(feedbackLines, 20, feedbackStart + 5);

        questionY = feedbackStart + 5 + feedbackLines.length * 5 + 10;
      });

      // Footer on each page if needed, but jspdf-autotable handled basic layout
      doc.save(
        `Interview-Report-${new Date().toISOString().split("T")[0]}.pdf`,
      );
    } catch (error) {
      console.error("PDF Generation failed:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setDownloadingPDF(false);
    }
  };

  const improvements = generateImprovements();

  return (
    <div className="interview-summary-page min-h-screen w-full flex flex-col bg-stone-50 dark:bg-slate-950 transition-colors duration-300">
      <style>{`
            .interview-summary-page {
              scrollbar-width: thin;
              scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
            }
            .interview-summary-page::-webkit-scrollbar {
              width: 8px;
            }
            .interview-summary-page::-webkit-scrollbar-track {
              background: transparent;
            }
            .interview-summary-page::-webkit-scrollbar-thumb {
              background-color: rgba(156, 163, 175, 0.3);
              border-radius: 4px;
            }
            .interview-summary-page::-webkit-scrollbar-thumb:hover {
              background-color: rgba(156, 163, 175, 0.5);
            }
            .custom-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
            }
            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background-color: rgba(156, 163, 175, 0.3);
              border-radius: 3px;
            }
          `}</style>
      {/* Header with Close Button */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-stone-200 dark:border-slate-800 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-3 sm:gap-4">
          {/* Logo/Brand */}
          <button
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group"
            onClick={onClose}
          >
            <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500" />
            <span className="hidden sm:block text-lg sm:text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              AI Interview
            </span>
          </button>

          {/* Title - Center */}
          <div className="flex-1 min-w-0 text-center">
            <h1 className="text-base sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Performance Report
            </h1>
            <p className="hidden sm:block text-xs lg:text-sm text-stone-500 dark:text-surface-400 mt-0.5">
              {sessionHistory.length}{" "}
              {sessionHistory.length === 1 ? "response" : "responses"}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-stone-100 dark:hover:bg-surface-800 transition-colors"
              title={
                isDarkMode ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-stone-600 dark:text-surface-300" />
              ) : (
                <Moon className="w-5 h-5 text-stone-600 dark:text-surface-300" />
              )}
            </button>

            {/* PDF Download */}
            <button
              className="hidden md:flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-stone-100 dark:bg-surface-800 text-stone-600 dark:text-surface-300 hover:bg-stone-200 dark:hover:bg-surface-700 transition-colors text-xs sm:text-sm font-medium"
              onClick={generatePDFReport}
              disabled={downloadingPDF}
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden lg:inline">
                {downloadingPDF ? "Generating..." : "Download Report"}
              </span>
              <span className="lg:hidden">PDF</span>
            </button>

            {/* Back Button */}
            <button
              className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/25 transition-all hover:scale-105 active:scale-95 font-medium text-xs sm:text-sm"
              onClick={onClose}
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 lg:space-y-10">
        {/* Top Section: Score & Key Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Score - Round Design */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col justify-center">
            <div 
              className="relative w-full max-w-[280px] sm:max-w-[320px] mx-auto bg-white dark:bg-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center p-4 sm:p-6 transition-all duration-500 group aspect-square"
              style={{ 
                border: isDarkMode ? '10px solid #1e293b' : '10px solid #e5e7eb',
                borderRadius: '50%'
              }}
            >
              {/* Circular Progress (Visual only) */}
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none p-2">
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-stone-100 dark:text-surface-800"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  fill="none"
                  stroke={getScoreColor(avgFinal)}
                  strokeWidth="6" // Thicker stroke
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 45}%`}
                  strokeDashoffset={`${
                    2 * Math.PI * 45 * (1 - avgFinal / 100)
                  }%`}
                  className="transition-all duration-1000 ease-out"
                  style={{ opacity: 0.8 }}
                />
              </svg>

              <div className="relative z-10 text-center flex flex-col items-center justify-center h-full w-full space-y-2">
                <span className="block text-xs sm:text-sm lg:text-base font-semibold text-stone-500 dark:text-surface-400 uppercase tracking-wider sm:tracking-widest">
                  Overall Score
                </span>
                <div
                  className="text-5xl sm:text-6xl lg:text-7xl font-bold my-1 tracking-tighter"
                  style={{ color: getScoreColor(avgFinal) }}
                >
                  <AnimatedScore
                    value={Math.round(avgFinal)}
                    color={getScoreColor(avgFinal)}
                  />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 dark:bg-surface-800 border border-stone-200 dark:border-surface-700">
                  <span
                    className={`w-2 h-2 rounded-full`}
                    style={{ backgroundColor: getScoreColor(avgFinal) }}
                  ></span>
                  <span className="text-sm font-bold text-stone-600 dark:text-surface-200">
                    {getScoreLabel(avgFinal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="lg:col-span-8 xl:col-span-9 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 content-center">
            {/* Standard Metrics */}
            {[
              {
                label: "Content Quality",
                val: avgContent,
                icon: <MessageSquare className="w-5 h-5" />,
              },
              {
                label: "Delivery",
                val: avgDelivery,
                icon: <CheckCircle2 className="w-5 h-5" />,
              },
              {
                label: "Communication",
                val: avgCommunication,
                icon: <MessageSquare className="w-5 h-5" />,
              },
              {
                label: "Voice Quality",
                val: avgVoice,
                icon: <Mic className="w-5 h-5" />,
              }, // Ensure Mic imported or use another icon
              {
                label: "Confidence",
                val: avgConfidence,
                icon: <Target className="w-5 h-5" />,
              },
              {
                label: "Structure",
                val: avgStructure,
                icon: <BarChart3 className="w-5 h-5" />,
              },
            ].map((metric, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800 p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl shadow-sm dark:shadow-sm border border-stone-100 dark:border-slate-600 hover:shadow-md dark:hover:bg-slate-700/50 transition-all flex flex-col justify-between group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-surface-700 text-stone-400 dark:text-surface-400 group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 group-hover:text-primary-500 dark:group-hover:text-primary-400 transition-colors">
                    {metric.icon}
                  </div>
                  <span
                    className="text-2xl font-bold"
                    style={{ color: getScoreColor(metric.val) }}
                  >
                    {Math.round(metric.val)}%
                  </span>
                </div>
                <div>
                  <h3 className="text-stone-500 dark:text-surface-400 text-sm font-medium mb-2">
                    {metric.label}
                  </h3>
                  <div className="w-full h-2 bg-stone-100 dark:bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${metric.val}%`,
                        backgroundColor: getScoreColor(metric.val),
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trends & Analysis Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Performance Trend Chart */}
          <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-stone-100 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-stone-800 dark:text-white">
                  Performance Trend
                </h2>
                <p className="text-sm text-stone-500 dark:text-surface-400">
                  Score progression across questions
                </p>
              </div>
            </div>


            {/* Chart container with fixed height for reliable bar rendering */}
            <div className="h-64 flex items-end justify-between gap-2 sm:gap-4 px-2 relative">
              {sessionHistory.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-stone-400 dark:text-surface-500">
                  No scored responses to display
                </div>
              ) : (
                sessionHistory.map((item, idx) => {
                  // Calculate height in pixels (256px = h-64, leave some room for labels)
                  const maxHeight = 200; // pixels
                  const barHeight = Math.max((item.scores.final / 100) * maxHeight, 8);
                  
                  return (
                    <div
                      key={idx}
                      className="relative flex-1 flex flex-col items-center justify-end group"
                      style={{ height: '100%' }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-stone-800 dark:bg-stone-700 text-white text-xs py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10 shadow-lg">
                        Q{idx + 1}: {Math.round(item.scores.final)}%
                      </div>
                      {/* Bar */}
                      <div
                        className="w-full max-w-[40px] rounded-t-lg transition-all duration-500 hover:opacity-90"
                        style={{
                          height: `${barHeight}px`,
                          backgroundColor: getScoreColor(item.scores.final),
                          minHeight: '8px',
                        }}
                      />
                      {/* Label */}
                      <div className="mt-2 text-xs font-bold text-stone-400 dark:text-surface-500">
                        Q{idx + 1}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {/* Baseline */}
            <div className="w-full h-px bg-stone-200 dark:bg-surface-600 mt-0"></div>
          </div>

          {/* AI Recommendations */}
          <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-stone-100 dark:border-slate-700 flex flex-col">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-500">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-stone-800 dark:text-white">
                  AI Coach Insights
                </h2>
                <p className="text-sm text-stone-500 dark:text-surface-400">
                  Top areas for growth
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-3 sm:space-y-4 overflow-y-auto max-h-[240px] sm:max-h-[280px] lg:max-h-[300px] pr-2 custom-scrollbar">
              {improvements.map((rec, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl border-l-4 ${
                    rec.type === "strength"
                      ? "bg-green-50 dark:bg-green-900/10 border-green-500"
                      : "bg-amber-50 dark:bg-amber-900/10 border-amber-500"
                  }`}
                >
                  <div className="flex gap-3">
                    {rec.type === "strength" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <p className="text-stone-700 dark:text-surface-200 text-sm leading-relaxed">
                      {rec.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Body Language Section */}
        {avgEyeContact !== null && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-sm border border-stone-100 dark:border-slate-700 overflow-hidden">
            <div className="p-4 sm:p-6 lg:p-8 border-b border-stone-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-500">
                  <Eye className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-stone-800 dark:text-white">
                    Video & Body Language Analysis
                  </h2>
                  <p className="text-sm text-stone-500 dark:text-surface-400">
                    Non-verbal communication signals
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-stone-200 dark:divide-surface-700">
              {[
                {
                  name: "Eye Contact",
                  val: avgEyeContact,
                  icon: <Eye />,
                  feedback:
                    avgEyeContact >= 70
                      ? "Excellent sustained focus"
                      : "Try to look at the camera more",
                },
                {
                  name: "Stability",
                  val: avgStability,
                  icon: <Move />,
                  feedback:
                    avgStability! >= 80
                      ? "Composed posture"
                      : "Minimize fidgeting",
                },
                {
                  name: "Visual Confidence",
                  val: avgVisualConfidence,
                  icon: <Target />,
                  feedback:
                    avgVisualConfidence! >= 80
                      ? "Strong presence"
                      : "Project more confidence",
                },
              ].map((metric, idx) => (
                <div
                  key={idx}
                  className="p-4 sm:p-6 lg:p-8 hover:bg-stone-50 dark:hover:bg-slate-800/50 transition-colors text-center"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-stone-100 dark:bg-surface-700 text-stone-500 dark:text-surface-400 mb-4">
                    {React.cloneElement(metric.icon as any, {
                      className: "w-6 h-6",
                    })}
                  </div>
                  <h3 className="text-lg font-semibold text-stone-800 dark:text-white mb-1">
                    {metric.name}
                  </h3>
                  <div
                    className="text-3xl font-bold mb-2"
                    style={{ color: getScoreColor(metric.val!) }}
                  >
                    {Math.round(metric.val!)}%
                  </div>
                  <div className="h-1.5 w-24 mx-auto bg-stone-200 dark:bg-surface-600 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${metric.val}%`,
                        backgroundColor: getScoreColor(metric.val!),
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-surface-400">
                    {metric.feedback}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Questions Breakdown */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-sm border border-stone-100 dark:border-slate-700 overflow-hidden">
          <div className="p-4 sm:p-6 lg:p-8 border-b border-stone-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-500">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-stone-800 dark:text-white">
                  Detailed Breakdown
                </h2>
                <p className="section-hint text-sm text-stone-500 dark:text-surface-400">
                  Click on any question to view transcript and feedback
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-stone-200 dark:divide-surface-700">
            {sessionHistory.map((item, index) => (
              <div
                key={index}
                className={`transition-colors duration-300 ${
                  expandedQuestion === index
                    ? "bg-primary-50/50 dark:bg-primary-900/5"
                    : "hover:bg-stone-50 dark:hover:bg-slate-700/50"
                }`}
              >
                <button
                  className="w-full flex items-center justify-between p-4 sm:p-5 lg:p-6 text-left focus:outline-none"
                  onClick={() =>
                    setExpandedQuestion(
                      expandedQuestion === index ? null : index,
                    )
                  }
                >
                  <div className="flex items-start gap-2 sm:gap-3 lg:gap-4 flex-1 min-w-0">
                    <span className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-stone-200 dark:bg-surface-700 text-stone-600 dark:text-surface-300 font-bold text-xs sm:text-sm">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-stone-800 dark:text-white text-base sm:text-lg mb-1 pr-2 sm:pr-4 break-words">
                        {item.question_text || `Question ${item.question_id}`}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`${
                            expandedQuestion === index
                              ? "text-primary-600 dark:text-primary-400"
                              : "text-stone-500 dark:text-surface-400"
                          } text-sm flex items-center gap-1`}
                        >
                          {expandedQuestion === index
                            ? "Click to collapse"
                            : "Click for details"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <div
                        className="text-2xl font-bold"
                        style={{ color: getScoreColor(item.scores.final) }}
                      >
                        {Math.round(item.scores.final)}
                      </div>
                      <div className="text-xs text-stone-500 dark:text-surface-500 font-medium">
                        Score
                      </div>
                    </div>
                    {expandedQuestion === index ? (
                      <ChevronUp className="w-5 h-5 text-stone-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-stone-400" />
                    )}
                  </div>
                </button>

                {expandedQuestion === index && (
                  <div className="px-4 sm:px-6 pb-6 sm:pb-8 pl-8 sm:pl-12 lg:pl-[4.5rem]">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                      {/* Left: Answer & Feedback */}
                      <div className="space-y-6">
                        <div>
                          <h5 className="text-xs font-bold text-stone-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                            Your Answer
                          </h5>
                          <div className="p-4 rounded-2xl bg-stone-100 dark:bg-slate-900/50 text-stone-700 dark:text-slate-300 italic text-sm leading-relaxed border border-stone-200 dark:border-slate-700">
                            "{item.transcript}"
                          </div>
                        </div>

                        {item.feedback?.summary && (
                          <div>
                            <h5 className="text-xs font-bold text-stone-400 dark:text-surface-500 uppercase tracking-wider mb-2">
                              AI Feedback
                            </h5>
                            <p className="text-stone-700 dark:text-surface-300 text-sm leading-relaxed">
                              {item.feedback.summary}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Right: Analysis details */}
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20">
                            <div className="flex items-center gap-2 mb-3">
                              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                              <span className="font-semibold text-green-900 dark:text-green-300 text-sm">
                                Strengths
                              </span>
                            </div>
                            <ul className="space-y-2">
                              {item.feedback?.strengths
                                ?.slice(0, 3)
                                .map((s, i) => (
                                  <li
                                    key={i}
                                    className="text-xs text-green-800 dark:text-green-200/80 flex items-start gap-1.5"
                                  >
                                    <span className="mt-1 block w-1 h-1 rounded-full bg-green-400 shrink-0"></span>
                                    {s}
                                  </li>
                                ))}
                            </ul>
                          </div>

                          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20">
                            <div className="flex items-center gap-2 mb-3">
                              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              <span className="font-semibold text-amber-900 dark:text-amber-300 text-sm">
                                To Improve
                              </span>
                            </div>
                            <ul className="space-y-2">
                              {item.feedback?.improvements
                                ?.slice(0, 3)
                                .map((s, i) => (
                                  <li
                                    key={i}
                                    className="text-xs text-amber-800 dark:text-amber-200/80 flex items-start gap-1.5"
                                  >
                                    <span className="mt-1 block w-1 h-1 rounded-full bg-amber-400 shrink-0"></span>
                                    {s}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        </div>

                        {/* STAR Analysis Mini */}
                        {item.feedback?.star_analysis && (
                          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                            <h5 className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-3">
                              STAR Alignment
                            </h5>
                            <div className="space-y-2">
                              <div className="grid grid-cols-[60px_1fr] gap-2 text-xs">
                                <span className="font-semibold text-blue-700 dark:text-blue-400">
                                  Situation
                                </span>
                                <span className="text-blue-900 dark:text-blue-100/70 truncate">
                                  {item.feedback.star_analysis.situation}
                                </span>
                              </div>
                              <div className="grid grid-cols-[60px_1fr] gap-2 text-xs">
                                <span className="font-semibold text-blue-700 dark:text-blue-400">
                                  Task
                                </span>
                                <span className="text-blue-900 dark:text-blue-100/70 truncate">
                                  {item.feedback.star_analysis.task}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewSummary;
