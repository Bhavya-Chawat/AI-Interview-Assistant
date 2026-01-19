/**
 * Question Navigation Sidebar
 *
 * Shows all questions in the interview with:
 * - Completion status
 * - Attempt count
 * - Quick navigation
 * - Current question highlight
 */

import React from "react";
import { SmartQuestion } from "../api/apiClient";
import { CheckCircle2, Circle, Lock, ChevronRight } from "lucide-react";

interface QuestionSidebarProps {
  questions: SmartQuestion[];
  currentIndex: number;
  completedIndices: number[];
  skippedIndices: number[];
  attemptCounts: Record<number, number>;
  onNavigate: (index: number) => void;
  onViewFeedback?: (index: number) => void; // NEW: for viewing feedback of completed questions
  isOpen: boolean;
  onClose: () => void;
}

export const QuestionSidebar: React.FC<QuestionSidebarProps> = ({
  questions,
  currentIndex,
  completedIndices,
  skippedIndices = [],
  attemptCounts,
  onNavigate,
  onViewFeedback, // NEW
  isOpen,
  onClose,
}) => {
  const canNavigateTo = (index: number) => {
    // Can navigate to: current, completed, skipped, or next question after completed
    return (
      index <= currentIndex ||
      completedIndices.includes(index) ||
      skippedIndices.includes(index)
    );
  };

  // Handle click based on question state
  const handleQuestionClick = (index: number) => {
    const isCompleted = completedIndices.includes(index);
    const isSkipped = skippedIndices.includes(index);

    if (isSkipped) {
      // Skipped questions -> allow reattempt via onNavigate
      onNavigate(index);
      return;
    }

    if (isCompleted && onViewFeedback) {
      // Completed questions -> view feedback (not re-attempt)
      onViewFeedback(index);
    } else {
      // Current or navigable -> standard navigation
      onNavigate(index);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:sticky top-0 left-0 h-screen
          w-80 bg-white dark:bg-surface-800
          border-r border-stone-200 dark:border-surface-700
          rounded-r-3xl shadow-2xl lg:shadow-xl
          transform transition-transform duration-300 ease-out z-50
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          flex flex-col overflow-hidden m-0 lg:m-4 lg:rounded-2xl lg:h-[calc(100vh-2rem)]
        `}
      >
        {/* Header */}
        <div className="p-6 border-b border-stone-200 dark:border-surface-700">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-stone-800 dark:text-white">
              Questions
            </h3>
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-surface-700 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-stone-500 dark:text-surface-400">
            {completedIndices.length} of {questions.length} completed
          </p>

          {/* Progress Bar */}
          <div className="mt-3 h-2 bg-stone-100 dark:bg-surface-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-secondary-500 transition-all duration-500 rounded-full"
              style={{
                width: `${(completedIndices.length / questions.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Questions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {questions.map((question, index) => {
            const isCompleted = completedIndices.includes(index);
            const isSkipped = skippedIndices.includes(index);
            const isCurrent = index === currentIndex;
            const canNavigate = canNavigateTo(index);
            const attempts = attemptCounts[index] || 0;

            return (
              <button
                key={question.id}
                onClick={() => canNavigate && handleQuestionClick(index)}
                disabled={!canNavigate}
                className={`
                  w-full p-4 rounded-2xl text-left transition-all duration-200
                  ${
                    isCurrent
                      ? "bg-primary-500 text-white shadow-lg shadow-primary-500/20"
                      : isCompleted
                        ? "bg-emerald-50 dark:bg-emerald-900/20 text-stone-800 dark:text-white hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                        : isSkipped
                          ? "bg-amber-50 dark:bg-amber-900/20 text-stone-800 dark:text-white border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                          : canNavigate
                            ? "bg-stone-50 dark:bg-surface-700/50 text-stone-700 dark:text-surface-300 hover:bg-stone-100 dark:hover:bg-surface-700"
                            : "bg-stone-50 dark:bg-surface-900/50 text-stone-400 dark:text-surface-600 opacity-50 cursor-not-allowed"
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Status Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {isCompleted ? (
                      <CheckCircle2
                        className={`w-5 h-5 ${
                          isCurrent
                            ? "text-white"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      />
                    ) : isSkipped ? (
                      <div
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isCurrent
                            ? "bg-white/20 text-white border border-white/30"
                            : "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50"
                        }`}
                      >
                        Skipped
                      </div>
                    ) : canNavigate ? (
                      <Circle
                        className={`w-5 h-5 ${
                          isCurrent
                            ? "text-white"
                            : "text-stone-400 dark:text-surface-500"
                        }`}
                      />
                    ) : (
                      <Lock className="w-5 h-5 text-stone-300 dark:text-surface-600" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-medium ${
                          isCurrent
                            ? "text-white/80"
                            : "text-stone-500 dark:text-surface-400"
                        }`}
                      >
                        Q{index + 1}
                      </span>
                      {attempts > 0 && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            isCurrent
                              ? "bg-white/20 text-white"
                              : "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400"
                          }`}
                        >
                          {attempts} {attempts === 1 ? "attempt" : "attempts"}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-sm line-clamp-2 ${
                        isCurrent ? "text-white" : ""
                      }`}
                    >
                      {question.question}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          isCurrent
                            ? "bg-white/20 text-white"
                            : "bg-stone-100 dark:bg-surface-800 text-stone-600 dark:text-surface-400"
                        }`}
                      >
                        {question.category}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          isCurrent
                            ? "bg-white/20 text-white"
                            : question.difficulty === "easy"
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                              : question.difficulty === "hard"
                                ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                                : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {question.difficulty || "medium"}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Stats */}
        <div className="p-4 border-t border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-900">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {completedIndices.length}
              </div>
              <div className="text-xs text-stone-500 dark:text-slate-500">
                Completed
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {currentIndex + 1}
              </div>
              <div className="text-xs text-stone-500 dark:text-slate-500">
                Current
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-stone-600 dark:text-slate-400">
                {questions.length - completedIndices.length}
              </div>
              <div className="text-xs text-stone-500 dark:text-slate-500">
                Remaining
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
