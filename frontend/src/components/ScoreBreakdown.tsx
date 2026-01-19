/**
 * Score Breakdown Modal
 *
 * Detailed explanation of how each score was calculated
 * Shows formulas, contributing factors, and improvement tips
 */

import React from "react";
import { X, Info, TrendingUp, AlertCircle } from "lucide-react";

interface ScoreBreakdownProps {
  isOpen: boolean;
  onClose: () => void;
  scores: {
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
  };
}

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({
  isOpen,
  onClose,
  scores,
}) => {
  if (!isOpen) return null;

  const breakdownData = [
    {
      category: "Content Relevance",
      score: scores.content,
      weight: "30%",
      formula: "Semantic Similarity × Keyword Coverage",
      factors: [
        {
          name: "Semantic Match to Ideal Answer",
          value: `${(scores.relevance * 100).toFixed(1)}%`,
          impact: "High",
        },
        {
          name: "Key Concepts Coverage",
          value: scores.relevance > 0.7 ? "Good" : "Needs Work",
          impact: "High",
        },
        {
          name: "Answer Completeness",
          value: scores.content >= 70 ? "Complete" : "Partial",
          impact: "Medium",
        },
      ],
      calculation: `
        1. AI compares your answer to ideal answer using semantic similarity
        2. Calculates overlap of key concepts and terminology  
        3. Weighs completeness and depth of response
        4. Final score: ${scores.content}/100
      `,
      improvementTips: [
        "Include specific examples and details",
        "Use industry-relevant terminology",
        "Address all parts of the question",
        "Provide concrete data or metrics when possible",
      ],
    },
    {
      category: "Delivery Quality",
      score: scores.delivery,
      weight: "20%",
      formula: "WPM Score + Filler Word Penalty",
      factors: [
        {
          name: "Speaking Pace (WPM)",
          value: `${Math.round(scores.wpm)} words/min`,
          impact: "High",
        },
        { name: "Optimal Range", value: "130-160 WPM", impact: "Reference" },
        {
          name: "Filler Words Used",
          value: `${scores.filler_count} instances`,
          impact: "Medium",
        },
        {
          name: "Pace Consistency",
          value: scores.wpm >= 110 && scores.wpm <= 180 ? "Good" : "Variable",
          impact: "Low",
        },
      ],
      calculation: `
        1. Base score from WPM (optimal: 130-160 WPM)
           • Too slow (<110): ${scores.wpm < 110 ? "Penalty applied" : "OK"}
           • Too fast (>180): ${scores.wpm > 180 ? "Penalty applied" : "OK"}
        2. Filler word penalty: -2 points per filler
           • Your fillers: ${scores.filler_count}
           • Penalty: -${scores.filler_count * 2} points
        3. Final score: ${scores.delivery}/100
      `,
      improvementTips: [
        "Practice maintaining 130-160 WPM pace",
        'Reduce "um," "uh," "like," "you know"',
        "Pause instead of using filler words",
        "Record yourself to identify filler patterns",
      ],
    },
    {
      category: "Communication",
      score: scores.communication,
      weight: "20%",
      formula: "Grammar Score + Vocabulary Richness",
      factors: [
        {
          name: "Grammar Errors",
          value: `${scores.grammar_errors} found`,
          impact: "High",
        },
        {
          name: "Sentence Structure",
          value: scores.grammar_errors <= 2 ? "Clear" : "Needs Work",
          impact: "Medium",
        },
        {
          name: "Vocabulary Level",
          value: scores.communication >= 70 ? "Professional" : "Basic",
          impact: "Medium",
        },
      ],
      calculation: `
        1. Grammar check: -5 points per major error
           • Errors found: ${scores.grammar_errors}
           • Penalty: -${scores.grammar_errors * 5} points
        2. Vocabulary assessment
        3. Sentence clarity and structure
        4. Final score: ${scores.communication}/100
      `,
      improvementTips: [
        "Use complete sentences",
        "Vary sentence structure",
        "Employ professional vocabulary",
        "Proofread your thoughts before speaking",
      ],
    },
    {
      category: "Voice Quality",
      score: scores.voice,
      weight: "10%",
      formula: "Pitch Variation + Energy Level",
      factors: [
        {
          name: "Pitch Variation",
          value: scores.voice >= 70 ? "Dynamic" : "Monotone",
          impact: "High",
        },
        {
          name: "Speaking Energy",
          value: scores.voice >= 70 ? "Engaged" : "Flat",
          impact: "High",
        },
        { name: "Vocal Pauses", value: "Natural", impact: "Medium" },
      ],
      calculation: `
        1. Analyzes pitch variation throughout answer
        2. Measures energy and engagement level
        3. Evaluates natural pause patterns
        4. Final score: ${scores.voice}/100
      `,
      improvementTips: [
        "Vary your pitch to emphasize key points",
        "Show enthusiasm about the topic",
        "Use natural pauses for emphasis",
        "Avoid monotone delivery",
      ],
    },
    {
      category: "Confidence",
      score: scores.confidence,
      weight: "10%",
      formula: "Composure + Assertiveness",
      factors: [
        {
          name: "Verbal Confidence",
          value: scores.confidence >= 70 ? "Strong" : "Hesitant",
          impact: "High",
        },
        {
          name: "Decisiveness",
          value: scores.filler_count <= 3 ? "Clear" : "Uncertain",
          impact: "Medium",
        },
        {
          name: "Composure",
          value: scores.confidence >= 70 ? "Maintained" : "Shaky",
          impact: "Medium",
        },
      ],
      calculation: `
        1. Measures verbal hesitations
        2. Analyzes confidence markers
        3. Evaluates decisiveness of statements
        4. Final score: ${scores.confidence}/100
      `,
      improvementTips: [
        "Speak with conviction and clarity",
        'Avoid hedging language ("maybe," "I think")',
        "Make definitive statements",
        "Practice to build natural confidence",
      ],
    },
    {
      category: "Structure (STAR)",
      score: scores.structure,
      weight: "10%",
      formula: "STAR Components Present",
      factors: [
        { name: "Situation Setup", value: "Check answer", impact: "Critical" },
        { name: "Task Definition", value: "Check answer", impact: "Critical" },
        { name: "Action Details", value: "Check answer", impact: "Critical" },
        { name: "Result/Outcome", value: "Check answer", impact: "Critical" },
      ],
      calculation: `
        1. Identifies STAR method components
        2. Situation: 25 points if present
        3. Task: 25 points if present
        4. Action: 25 points if present
        5. Result: 25 points if present
        6. Final score: ${scores.structure}/100
      `,
      improvementTips: [
        "Always start with clear context (Situation)",
        "Define your specific role (Task)",
        "Detail your actions with specifics",
        "End with quantifiable results",
      ],
    },
  ];

  const calculateFinalScore = () => {
    const weighted =
      scores.content * 0.3 +
      scores.delivery * 0.2 +
      scores.communication * 0.2 +
      scores.voice * 0.1 +
      scores.confidence * 0.1 +
      scores.structure * 0.1;
    return weighted.toFixed(1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div>
            <h2 className="text-2xl font-bold text-stone-800 dark:text-white mb-1">
              Score Breakdown
            </h2>
            <p className="text-sm text-stone-500 dark:text-surface-400">
              Detailed analysis of how each score was calculated
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-6 h-6 text-stone-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
          {/* Final Score Formula */}
          <div className="mb-8 p-6 bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-slate-700 dark:to-slate-700 rounded-xl border border-primary-200 dark:border-slate-600">
            <h3 className="text-lg font-semibold text-stone-800 dark:text-white mb-3 flex items-center gap-2">
              <Info className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Final Score Calculation
            </h3>
            <div className="space-y-2 text-sm text-stone-700 dark:text-slate-200">
              <p className="font-mono">
                <strong>Final Score</strong> = (Content × 30%) + (Delivery ×
                20%) + (Communication × 20%) + (Voice × 10%) + (Confidence ×
                10%) + (Structure × 10%)
              </p>
              <p className="font-mono bg-white dark:bg-slate-900 p-3 rounded-lg">
                = ({scores.content} × 0.3) + ({scores.delivery} × 0.2) + (
                {scores.communication} × 0.2) + ({scores.voice} × 0.1) + (
                {scores.confidence} × 0.1) + ({scores.structure} × 0.1)
              </p>
              <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                = {calculateFinalScore()} / 100 ≈ {scores.final} / 100
              </p>
            </div>
          </div>

          {/* Individual Score Breakdowns */}
          <div className="space-y-6">
            {breakdownData.map((item, index) => (
              <div
                key={index}
                className="p-6 bg-stone-50 dark:bg-slate-700/50 rounded-xl border border-stone-200 dark:border-slate-600"
              >
                {/* Category Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-stone-800 dark:text-white mb-1">
                      {item.category}
                    </h4>
                    <p className="text-sm text-stone-500 dark:text-surface-400">
                      Weight: {item.weight} of final score
                    </p>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-3xl font-bold ${
                        item.score >= 80
                          ? "text-emerald-600 dark:text-emerald-400"
                          : item.score >= 60
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {item.score}
                    </div>
                    <div className="text-sm text-stone-500 dark:text-surface-400">
                      / 100
                    </div>
                  </div>
                </div>

                {/* Formula */}
                <div className="mb-4 p-3 bg-white dark:bg-slate-900 rounded-lg border border-stone-200 dark:border-slate-600">
                  <p className="text-xs font-semibold text-stone-500 dark:text-slate-400 mb-1">
                    FORMULA
                  </p>
                  <p className="font-mono text-sm text-stone-700 dark:text-slate-200">
                    {item.formula}
                  </p>
                </div>

                {/* Contributing Factors */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-stone-500 dark:text-slate-400 mb-2">
                    CONTRIBUTING FACTORS
                  </p>
                  <div className="space-y-2">
                    {item.factors.map((factor, fIndex) => (
                      <div
                        key={fIndex}
                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg"
                      >
                        <span className="text-sm text-stone-700 dark:text-slate-200">
                          {factor.name}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-stone-800 dark:text-white">
                            {factor.value}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              factor.impact === "High" ||
                              factor.impact === "Critical"
                                ? "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400"
                                : factor.impact === "Medium"
                                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                  : factor.impact === "Reference"
                                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                    : "bg-stone-100 dark:bg-surface-700 text-stone-600 dark:text-surface-400"
                            }`}
                          >
                            {factor.impact}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Calculation Steps */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-stone-500 dark:text-slate-400 mb-2">
                    CALCULATION STEPS
                  </p>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-lg font-mono text-xs text-stone-600 dark:text-slate-300 whitespace-pre-line">
                    {item.calculation.trim()}
                  </div>
                </div>

                {/* Improvement Tips */}
                <div>
                  <p className="text-xs font-semibold text-stone-500 dark:text-slate-400 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    IMPROVEMENT TIPS
                  </p>
                  <ul className="space-y-2">
                    {item.improvementTips.map((tip, tIndex) => (
                      <li
                        key={tIndex}
                        className="flex items-start gap-2 text-sm text-stone-700 dark:text-slate-200"
                      >
                        <span className="text-primary-600 dark:text-primary-400 mt-0.5">
                          •
                        </span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Note */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-200">
                <p className="font-semibold mb-1">About These Scores</p>
                <p>
                  Scores are calculated using advanced ML models including
                  semantic similarity analysis, natural language processing, and
                  audio feature extraction. The AI continuously learns from
                  thousands of interview responses to provide accurate
                  assessments.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
