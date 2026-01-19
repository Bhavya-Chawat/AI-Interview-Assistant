/**
 * AI Interview Assistant - Help Modal Component
 * Provides guidance on how to use the interview practice system
 */

import { useState } from "react";
import {
  HelpCircle,
  X,
  Mic,
  Video,
  FileText,
  Star,
  Target,
  CheckCircle2,
  BarChart3,
  Lightbulb,
  Clock,
  ChevronRight,
} from "lucide-react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeSection, setActiveSection] = useState<string>("getting-started");

  if (!isOpen) return null;

  const sections = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: <Star className="w-5 h-5" />,
    },
    {
      id: "recording",
      title: "Recording Your Answer",
      icon: <Mic className="w-5 h-5" />,
    },
    {
      id: "scoring",
      title: "Understanding Scores",
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: "tips",
      title: "Interview Tips",
      icon: <Lightbulb className="w-5 h-5" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[85vh] mx-4 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-6 h-6 text-primary-500" />
            <h2 className="text-xl font-bold text-stone-800 dark:text-white">
              How to Practice
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-surface-700 transition-colors"
          >
            <X className="w-5 h-5 text-stone-500 dark:text-surface-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-56 flex-shrink-0 border-r border-stone-200 dark:border-slate-700 py-4 overflow-y-auto">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  activeSection === section.id
                    ? "bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border-r-2 border-primary-500"
                    : "text-stone-600 dark:text-surface-400 hover:bg-stone-50 dark:hover:bg-surface-700/50"
                }`}
              >
                {section.icon}
                <span className="text-sm font-medium">{section.title}</span>
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeSection === "getting-started" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-stone-800 dark:text-white mb-4">
                  Welcome to AI Interview Practice
                </h3>

                <div className="space-y-4">
                  <div className="flex gap-4 p-4 bg-stone-50 dark:bg-white/5 rounded-xl border border-transparent dark:border-white/10">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center text-primary-500 font-bold">
                      1
                    </div>
                    <div>
                      <h4 className="font-semibold text-stone-800 dark:text-white mb-1">
                        Choose Your Domain
                      </h4>
                      <p className="text-sm text-stone-600 dark:text-stone-300">
                        Select from Tech, Finance, Management, Healthcare, or
                        upload custom questions tailored to your target role.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 bg-stone-50 dark:bg-white/5 rounded-xl border border-transparent dark:border-white/10">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center text-primary-500 font-bold">
                      2
                    </div>
                    <div>
                      <h4 className="font-semibold text-stone-800 dark:text-white mb-1">
                        Enter Job Description (Optional)
                      </h4>
                      <p className="text-sm text-stone-600 dark:text-stone-300">
                        Paste a job description for personalized questions and
                        feedback tailored to the specific role.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 bg-stone-50 dark:bg-white/5 rounded-xl border border-transparent dark:border-white/10">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center text-primary-500 font-bold">
                      3
                    </div>
                    <div>
                      <h4 className="font-semibold text-stone-800 dark:text-white mb-1">
                        Record Your Answer
                      </h4>
                      <p className="text-sm text-stone-600 dark:text-stone-300">
                        Speak naturally as you would in a real interview. Your
                        video and audio will be analyzed for comprehensive
                        feedback.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 bg-stone-50 dark:bg-white/5 rounded-xl border border-transparent dark:border-white/10">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center text-primary-500 font-bold">
                      4
                    </div>
                    <div>
                      <h4 className="font-semibold text-stone-800 dark:text-white mb-1">
                        Get AI-Powered Feedback
                      </h4>
                      <p className="text-sm text-stone-600 dark:text-stone-300">
                        Receive detailed scores, improvement suggestions, and
                        actionable tips to enhance your interview performance.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "recording" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-stone-800 dark:text-white mb-4">
                  Recording Your Answer
                </h3>

                <div className="grid gap-4">
                  <div className="p-4 border border-stone-200 dark:border-surface-600 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <Video className="w-5 h-5 text-blue-500" />
                      <h4 className="font-semibold text-stone-800 dark:text-white">
                        Video Recording
                      </h4>
                    </div>
                    <ul className="space-y-2 text-sm text-stone-600 dark:text-surface-400">
                      <li className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 mt-0.5 text-primary-500" />
                        Position yourself centered in the camera frame
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 mt-0.5 text-primary-500" />
                        Ensure good lighting on your face
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 mt-0.5 text-primary-500" />
                        Look directly at the camera to simulate eye contact
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 border border-stone-200 dark:border-surface-600 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <Mic className="w-5 h-5 text-green-500" />
                      <h4 className="font-semibold text-stone-800 dark:text-white">
                        Audio Recording
                      </h4>
                    </div>
                    <ul className="space-y-2 text-sm text-stone-600 dark:text-surface-400">
                      <li className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 mt-0.5 text-primary-500" />
                        Speak clearly at a moderate pace (130-160 words/min)
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 mt-0.5 text-primary-500" />
                        Use a quiet environment with minimal background noise
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 mt-0.5 text-primary-500" />
                        Your speech is transcribed in real-time for analysis
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 border border-stone-200 dark:border-surface-600 rounded-xl">
                    <div className="flex items-center gap-3 mb-3">
                      <Clock className="w-5 h-5 text-purple-500" />
                      <h4 className="font-semibold text-stone-800 dark:text-white">
                        Recommended Duration
                      </h4>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 bg-stone-50 dark:bg-white/5 rounded-lg border border-transparent dark:border-white/10">
                        <p className="text-lg font-bold text-stone-800 dark:text-white">
                          1-2 min
                        </p>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          Quick Answer
                        </p>
                      </div>
                      <div className="p-3 bg-primary-50 dark:bg-primary-500/10 rounded-lg border-2 border-primary-200 dark:border-primary-500/30">
                        <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                          2-3 min
                        </p>
                        <p className="text-xs text-primary-500">Ideal Length</p>
                      </div>
                      <div className="p-3 bg-stone-50 dark:bg-white/5 rounded-lg border border-transparent dark:border-white/10">
                        <p className="text-lg font-bold text-stone-800 dark:text-white">
                          4 min
                        </p>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          Maximum
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "scoring" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-stone-800 dark:text-white mb-4">
                  Understanding Your Scores
                </h3>

                <p className="text-sm text-stone-600 dark:text-surface-400 mb-4">
                  Your answer is evaluated across 6 key dimensions, each
                  contributing to your overall score:
                </p>

                <div className="grid gap-3">
                  <div className="flex items-start gap-3 p-3 bg-stone-50 dark:bg-white/5 rounded-lg border border-transparent dark:border-white/10">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-stone-800 dark:text-white">
                          Content
                        </h4>
                        <span className="text-xs text-stone-500">30%</span>
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Relevance to the question, keyword coverage, topic depth
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-stone-50 dark:bg-white/5 rounded-lg border border-transparent dark:border-white/10">
                    <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                      <Mic className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-stone-800 dark:text-white">
                          Delivery
                        </h4>
                        <span className="text-xs text-stone-500">15%</span>
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Speaking pace, clarity, volume consistency
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-stone-50 dark:bg-white/5 rounded-lg border border-transparent dark:border-white/10">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                      <Target className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-stone-800 dark:text-white">
                          Communication
                        </h4>
                        <span className="text-xs text-stone-500">15%</span>
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Grammar, vocabulary diversity, filler word usage
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-stone-50 dark:bg-white/5 rounded-lg border border-transparent dark:border-white/10">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-stone-800 dark:text-white">
                          Voice
                        </h4>
                        <span className="text-xs text-stone-500">15%</span>
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Pitch variation, energy level, voice confidence
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-stone-50 dark:bg-white/5 rounded-lg border border-transparent dark:border-white/10">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-rose-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-stone-800 dark:text-white">
                          Confidence
                        </h4>
                        <span className="text-xs text-stone-500">15%</span>
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Eye contact, body language, facial expressions
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-stone-50 dark:bg-white/5 rounded-lg border border-transparent dark:border-white/10">
                    <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center">
                      <Star className="w-4 h-4 text-cyan-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-stone-800 dark:text-white">
                          Structure
                        </h4>
                        <span className="text-xs text-stone-500">10%</span>
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        STAR method usage, logical flow, completeness
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "tips" && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-stone-800 dark:text-white mb-4">
                  Interview Tips for Success
                </h3>

                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-xl">
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-400 mb-2 flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      Use the STAR Method
                    </h4>
                    <ul className="text-sm text-yellow-700 dark:text-yellow-300/80 space-y-1">
                      <li>
                        <strong>S</strong>ituation - Set the context
                      </li>
                      <li>
                        <strong>T</strong>ask - Describe your responsibility
                      </li>
                      <li>
                        <strong>A</strong>ction - Explain what you did
                      </li>
                      <li>
                        <strong>R</strong>esult - Share the outcome with metrics
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl">
                    <h4 className="font-semibold text-blue-800 dark:text-blue-400 mb-2 flex items-center gap-2">
                      <Mic className="w-4 h-4" />
                      Speaking Best Practices
                    </h4>
                    <ul className="text-sm text-blue-700 dark:text-blue-300/80 space-y-1">
                      <li>• Speak at 130-160 words per minute</li>
                      <li>• Pause briefly between key points</li>
                      <li>• Avoid filler words (um, uh, like, you know)</li>
                      <li>• Use specific numbers and examples</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl">
                    <h4 className="font-semibold text-green-800 dark:text-green-400 mb-2 flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Body Language Tips
                    </h4>
                    <ul className="text-sm text-green-700 dark:text-green-300/80 space-y-1">
                      <li>• Maintain eye contact with the camera</li>
                      <li>• Sit up straight with good posture</li>
                      <li>• Use natural hand gestures</li>
                      <li>• Smile appropriately throughout</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-500/20 rounded-xl">
                    <h4 className="font-semibold text-purple-800 dark:text-purple-400 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Content Strategy
                    </h4>
                    <ul className="text-sm text-purple-700 dark:text-purple-300/80 space-y-1">
                      <li>• Start with a clear, direct answer</li>
                      <li>• Provide specific examples from experience</li>
                      <li>• Quantify achievements when possible</li>
                      <li>• End with what you learned or how it applies</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-900">
          <p className="text-sm text-stone-500 dark:text-stone-400 text-center">
            Practice regularly to improve your interview skills. Your progress
            is saved automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
