/**
 * AI Interview Assistant - Main Application
 * Modern UI with Shadcn components and Lucide icons
 */

import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthForms from "./components/AuthForms";
import Dashboard from "./components/Dashboard";
import Recorder from "./components/Recorder";
import FeedbackCard from "./components/FeedbackCard";
import InterviewSummary from "./components/InterviewSummary";
import AdminUpload from "./components/AdminUpload";
import CustomUpload from "./components/CustomUpload";
import Profile from "./components/Profile";
import HelpModal from "./components/HelpModal";
import { QuestionSidebar } from "./components/QuestionSidebar";
import { Button } from "./components/ui/Button";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/Card";
import { Badge } from "./components/ui/Badge";
import {
  Mic,
  BarChart3,
  Target,
  Brain,
  TrendingUp,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  Sparkles,
  Briefcase,
  Code2,
  PiggyBank,
  GraduationCap,
  Handshake,
  Upload,
  ArrowLeft,
  Play,
  User,
  Users,
  Heart,
  HelpCircle,
  Menu,
  CheckCircle2,
  AlertCircle,
  Download,
} from "lucide-react";
import {
  Question,
  AudioFeedbackResponse,
  SmartQuestion,
  getSmartQuestions,
  SmartQuestionsResponse,
  getSession,
  ResumeAnalysisResponse,
} from "./api/apiClient";
import { Toaster, toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ===========================================
// Types
// ===========================================

interface Domain {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

type AppView =
  | "landing"
  | "auth"
  | "dashboard"
  | "interview"
  | "summary"
  | "admin"
  | "profile";
type InterviewPhase =
  | "domain"
  | "jd"
  | "resume"
  | "questions"
  | "record"
  | "feedback";

// ===========================================
// Domain Data
// ===========================================

const DOMAINS: Domain[] = [
  {
    id: "management",
    name: "Management",
    description: "Leadership & Strategy",
    icon: <Briefcase className="w-8 h-8" />,
  },
  {
    id: "software_engineering",
    name: "Software Engineering",
    description: "Coding & System Design",
    icon: <Code2 className="w-8 h-8" />,
  },
  {
    id: "finance",
    name: "Finance",
    description: "Analysis & Markets",
    icon: <PiggyBank className="w-8 h-8" />,
  },
  {
    id: "teaching",
    name: "Teaching",
    description: "Pedagogy & Curriculum",
    icon: <GraduationCap className="w-8 h-8" />,
  },
  {
    id: "sales",
    name: "Sales",
    description: "Negotiation & Closing",
    icon: <Handshake className="w-8 h-8" />,
  },
];

// ===========================================
// Landing Page Component
// ===========================================

interface LandingPageProps {
  onLogin: () => void;
  onSignup: () => void;
  onStartInterview: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

function LandingPage({
  onLogin,
  onSignup,
  onStartInterview,
  isDarkMode,
  toggleTheme,
}: LandingPageProps) {
  // Real-time stats from database
  const [liveStats, setLiveStats] = useState({
    total_users: 0,
    total_sessions: 0,
    total_questions: 0,
    total_attempts: 0,
  });
  const [statsLoaded, setStatsLoaded] = useState(false);

  // Fetch real-time stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/v1/stats/public");
        if (response.ok) {
          const data = await response.json();
          setLiveStats(data);
          setStatsLoaded(true);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
        setStatsLoaded(true); // Still show UI with zeros
      }
    };
    fetchStats();
  }, []);

  const features = [
    {
      icon: <Target className="w-6 h-6" />,
      title: "Smart Questions",
      description: "AI-selected questions tailored to your job description",
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "6-Score Analysis",
      description:
        "Content, Delivery, Communication, Voice, Confidence, Structure",
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: "AI Coaching",
      description: "Personalized feedback powered by Gemini AI",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Track Progress",
      description: "Monitor your improvement with detailed analytics",
    },
    {
      icon: <Mic className="w-6 h-6" />,
      title: "Voice Analysis",
      description: "Speaking pace, filler words, and confidence detection",
    },
    {
      icon: <Briefcase className="w-6 h-6" />,
      title: "Multiple Domains",
      description: "Practice for Tech, Finance, Management, Sales & more",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Choose Your Domain",
      description: "Select from 5 industry categories",
      icon: <Briefcase className="w-5 h-5" />,
    },
    {
      number: "02",
      title: "Add Job Description",
      description: "We analyze it for relevant questions",
      icon: <Target className="w-5 h-5" />,
    },
    {
      number: "03",
      title: "Practice & Record",
      description: "Answer questions by recording",
      icon: <Mic className="w-5 h-5" />,
    },
    {
      number: "04",
      title: "Get AI Feedback",
      description: "Instant feedback on 6 dimensions",
      icon: <Brain className="w-5 h-5" />,
    },
  ];

  // Features highlight for "Why Choose Us" section
  const highlights = [
    {
      icon: <Target className="w-6 h-6" />,
      title: "Real-time Analysis",
      description:
        "Get instant feedback on your answer as soon as you finish recording",
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: "Powered by Gemini AI",
      description:
        "Advanced language models provide detailed, actionable feedback",
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Track Your Progress",
      description:
        "Monitor improvement over time with detailed analytics dashboard",
    },
  ];

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-surface-900 transition-colors duration-300 overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Light mode gradient */}
        <div className="dark:hidden absolute inset-0 bg-gradient-to-br from-stone-50 via-stone-100 to-orange-50/30" />
        {/* Dark mode gradient */}
        <div className="hidden dark:block absolute inset-0 bg-gradient-to-br from-surface-900 via-surface-900 to-surface-800" />

        {/* Animated orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[100px] animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-secondary-500/15 rounded-full blur-[100px] animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-tertiary-500/10 rounded-full blur-[100px] animate-pulse"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute bottom-1/3 left-1/3 w-[350px] h-[350px] bg-primary-400/5 rounded-full blur-[80px] animate-pulse"
          style={{ animationDelay: "0.5s" }}
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-b border-stone-200/50 dark:border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-stone-800 dark:text-white">
              InterviewAI
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm text-stone-600 dark:text-surface-400 hover:text-stone-900 dark:hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm text-stone-600 dark:text-surface-400 hover:text-stone-900 dark:hover:text-white transition-colors"
            >
              How It Works
            </a>
            <a
              href="#domains"
              className="text-sm text-stone-600 dark:text-surface-400 hover:text-stone-900 dark:hover:text-white transition-colors"
            >
              Domains
            </a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-stone-100 dark:bg-surface-800 text-stone-600 dark:text-surface-400 hover:text-stone-900 dark:hover:text-white transition-all"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <Button variant="outline" size="sm" onClick={onLogin}>
              Log In
            </Button>
            <Button size="sm" onClick={onSignup}>
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-24 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text */}
            <div className="text-center lg:text-left">
              {/* Badge */}
              <Badge variant="default" className="mb-6 px-4 py-2 inline-flex">
                <Sparkles className="w-4 h-4 mr-2" />
                AI-Powered Interview Preparation
              </Badge>

              {/* Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-stone-800 dark:text-white leading-tight">
                Ace Your Next
                <br />
                <span className="relative inline-block pb-3">
                  <span className="bg-gradient-to-r from-primary-400 via-secondary-400 to-tertiary-400 bg-clip-text text-transparent">
                    Interview
                  </span>
                  <svg
                    className="absolute -bottom-1 left-0 w-full h-3"
                    viewBox="0 0 200 12"
                    fill="none"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M2 7C50 3 150 3 198 7"
                      stroke="url(#underline-gradient)"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient
                        id="underline-gradient"
                        x1="0"
                        y1="0"
                        x2="200"
                        y2="0"
                      >
                        <stop stopColor="#f97316" />
                        <stop offset="0.5" stopColor="#8b5cf6" />
                        <stop offset="1" stopColor="#06b6d4" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
              </h1>
              <p className="mt-4 mb-6 text-2xl sm:text-3xl font-display font-semibold text-stone-700 dark:text-surface-200">
                With AI Feedback
              </p>

              {/* Subtitle */}
              <p className="text-lg text-stone-600 dark:text-surface-300 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed">
                Practice with real interview questions, get instant AI-powered
                feedback on{" "}
                <strong className="text-stone-800 dark:text-white">
                  6 key dimensions
                </strong>
                , and track your improvement journey.
              </p>

              {/* CTA Button */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mb-8">
                <Button
                  size="xl"
                  onClick={onStartInterview}
                  className="shadow-lg shadow-primary-500/25 hover:scale-105 transition-transform"
                >
                  <Mic className="w-5 h-5" />
                  Start Free Practice
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  onClick={onSignup}
                  className="hover:scale-105 transition-transform"
                >
                  Create Account
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="flex items-center justify-center lg:justify-start gap-6 text-sm text-stone-500 dark:text-surface-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Free forever plan</span>
                </div>
              </div>
            </div>

            {/* Right Column - Visual */}
            <div className="hidden lg:block relative">
              {/* Glassmorphic Card Preview */}
              <div className="relative">
                <div className="relative z-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl border border-stone-200/50 dark:border-slate-700/50 p-8 shadow-2xl shadow-stone-900/10 dark:shadow-black/30">
                  {/* Score Display */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-sm text-stone-500 dark:text-surface-400 mb-1">
                        Overall Score
                      </p>
                      <p className="text-4xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                        87%
                      </p>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 flex items-center justify-center">
                      <TrendingUp className="w-8 h-8 text-primary-500" />
                    </div>
                  </div>

                  {/* Score Bars */}
                  <div className="space-y-4">
                    {[
                      {
                        name: "Content",
                        score: 92,
                        color: "from-primary-500 to-primary-400",
                      },
                      {
                        name: "Delivery",
                        score: 85,
                        color: "from-secondary-500 to-secondary-400",
                      },
                      {
                        name: "Communication",
                        score: 88,
                        color: "from-tertiary-500 to-tertiary-400",
                      },
                      {
                        name: "Confidence",
                        score: 78,
                        color: "from-green-500 to-emerald-400",
                      },
                    ].map((item) => (
                      <div key={item.name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-stone-600 dark:text-surface-400">
                            {item.name}
                          </span>
                          <span className="font-semibold text-stone-800 dark:text-white">
                            {item.score}%
                          </span>
                        </div>
                        <div className="h-2.5 bg-stone-200 dark:bg-surface-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Floating Badge - Top Right */}
                <div className="absolute -top-3 -right-3 bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg z-20">
                  +12% improvement!
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-stone-200/50 dark:border-surface-700/50 bg-gradient-to-b from-white/80 to-stone-50/50 dark:from-surface-800/80 dark:to-surface-900/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Total Users */}
            <div className="group p-6 rounded-2xl bg-white dark:bg-slate-800 border border-stone-200/80 dark:border-slate-700 shadow-lg shadow-stone-200/50 dark:shadow-black/20 hover:shadow-xl hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-300">
              <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-primary-500/10 to-secondary-500/10 group-hover:from-primary-500/20 group-hover:to-secondary-500/20 transition-colors">
                <Users className="w-6 h-6 text-primary-500" />
              </div>
              <p
                className={`text-3xl sm:text-4xl font-bold text-stone-800 dark:text-white mb-1 ${
                  statsLoaded ? "opacity-100" : "opacity-50"
                }`}
              >
                {liveStats.total_users || 0}
              </p>
              <p className="text-sm font-medium text-stone-500 dark:text-slate-400">
                Registered Users
              </p>
            </div>

            {/* Total Sessions */}
            <div className="group p-6 rounded-2xl bg-white dark:bg-slate-800 border border-stone-200/80 dark:border-slate-700 shadow-lg shadow-stone-200/50 dark:shadow-black/20 hover:shadow-xl hover:border-secondary-300 dark:hover:border-secondary-600 transition-all duration-300">
              <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-secondary-500/10 to-tertiary-500/10 group-hover:from-secondary-500/20 group-hover:to-tertiary-500/20 transition-colors">
                <Mic className="w-6 h-6 text-secondary-500" />
              </div>
              <p
                className={`text-3xl sm:text-4xl font-bold text-stone-800 dark:text-white mb-1 ${
                  statsLoaded ? "opacity-100" : "opacity-50"
                }`}
              >
                {liveStats.total_sessions || 0}
              </p>
              <p className="text-sm font-medium text-stone-500 dark:text-slate-400">
                Interview Sessions
              </p>
            </div>

            {/* Total Questions */}
            <div className="group p-6 rounded-2xl bg-white dark:bg-slate-800 border border-stone-200/80 dark:border-slate-700 shadow-lg shadow-stone-200/50 dark:shadow-black/20 hover:shadow-xl hover:border-tertiary-300 dark:hover:border-tertiary-600 transition-all duration-300">
              <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-tertiary-500/10 to-green-500/10 group-hover:from-tertiary-500/20 group-hover:to-green-500/20 transition-colors">
                <Target className="w-6 h-6 text-tertiary-500" />
              </div>
              <p
                className={`text-3xl sm:text-4xl font-bold text-stone-800 dark:text-white mb-1 ${
                  statsLoaded ? "opacity-100" : "opacity-50"
                }`}
              >
                {liveStats.total_questions || 0}
              </p>
              <p className="text-sm font-medium text-stone-500 dark:text-slate-400">
                Questions Available
              </p>
            </div>

            {/* Total Attempts */}
            <div className="group p-6 rounded-2xl bg-white dark:bg-slate-800 border border-stone-200/80 dark:border-slate-700 shadow-lg shadow-stone-200/50 dark:shadow-black/20 hover:shadow-xl hover:border-green-300 dark:hover:border-green-600 transition-all duration-300">
              <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-green-500/10 to-primary-500/10 group-hover:from-green-500/20 group-hover:to-primary-500/20 transition-colors">
                <BarChart3 className="w-6 h-6 text-green-500" />
              </div>
              <p
                className={`text-3xl sm:text-4xl font-bold text-stone-800 dark:text-white mb-1 ${
                  statsLoaded ? "opacity-100" : "opacity-50"
                }`}
              >
                {liveStats.total_attempts || 0}
              </p>
              <p className="text-sm font-medium text-stone-500 dark:text-slate-400">
                Answers Recorded
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="default" className="mb-4">
              Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-stone-800 dark:text-white mb-4">
              Everything You Need to{" "}
              <span className="bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
                Succeed
              </span>
            </h2>
            <p className="text-lg text-stone-600 dark:text-surface-300 max-w-2xl mx-auto">
              Comprehensive tools designed by interview experts and AI
              researchers
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative p-6 rounded-2xl bg-white dark:bg-surface-800 border border-stone-200/80 dark:border-surface-700 shadow-md shadow-stone-200/50 dark:shadow-black/20 hover:shadow-xl hover:shadow-primary-500/15 hover:-translate-y-2 transition-all duration-300 overflow-hidden"
              >
                {/* Gradient accent line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-secondary-500 to-tertiary-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500/10 to-secondary-500/10 group-hover:from-primary-500/20 group-hover:to-secondary-500/20 flex items-center justify-center text-primary-500 mb-5 transition-all duration-300 group-hover:scale-110">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-stone-800 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-stone-600 dark:text-surface-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        className="py-24 px-6 bg-gradient-to-b from-stone-50 via-white to-stone-50 dark:from-surface-900 dark:via-surface-800 dark:to-surface-900"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="default" className="mb-4">
              How It Works
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-stone-800 dark:text-white mb-4">
              Get Started in{" "}
              <span className="bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
                4 Easy Steps
              </span>
            </h2>
            <p className="text-lg text-stone-600 dark:text-surface-300 max-w-2xl mx-auto">
              From choosing your domain to receiving AI-powered feedback
            </p>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Connecting Line */}
            <div className="hidden lg:block absolute top-24 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-primary-300 via-secondary-300 to-tertiary-300 dark:from-primary-600 dark:via-secondary-600 dark:to-tertiary-600" />

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="relative text-center">
                  {/* Step Number Circle */}
                  <div className="relative z-10 w-12 h-12 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-primary-500/25">
                    {step.number}
                  </div>

                  {/* Content Card */}
                  <div className="p-6 rounded-2xl bg-white dark:bg-surface-800 border border-stone-200 dark:border-surface-700 shadow-sm hover:shadow-lg transition-shadow duration-300">
                    <h3 className="text-lg font-semibold text-stone-800 dark:text-white mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-stone-600 dark:text-surface-400">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Domains Section */}
      <section id="domains" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="default" className="mb-4">
              Domains
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-stone-800 dark:text-white mb-4">
              Practice for{" "}
              <span className="bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
                Any Industry
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {DOMAINS.map((domain) => (
              <button
                key={domain.id}
                onClick={onStartInterview}
                className="group relative p-6 rounded-2xl bg-white dark:bg-surface-800 border border-stone-200/80 dark:border-surface-700 shadow-md shadow-stone-200/50 dark:shadow-black/20 hover:shadow-xl hover:shadow-primary-500/15 hover:-translate-y-2 transition-all duration-300 text-center overflow-hidden"
              >
                {/* Gradient accent line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-secondary-500 to-tertiary-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br from-primary-500/10 to-secondary-500/10 group-hover:from-primary-500/20 group-hover:to-secondary-500/20 flex items-center justify-center text-primary-500 transition-all duration-300 group-hover:scale-110">
                  {domain.icon}
                </div>
                <h3 className="font-semibold text-stone-800 dark:text-white mb-1">
                  {domain.name}
                </h3>
                <p className="text-xs text-stone-500 dark:text-surface-400">
                  {domain.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-transparent via-secondary-500/5 to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="default" className="mb-4">
              Why Choose Us
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-stone-800 dark:text-white mb-4">
              Built With{" "}
              <span className="bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
                Real Technology
              </span>
            </h2>
            <p className="text-lg text-stone-600 dark:text-surface-300 max-w-2xl mx-auto">
              Open-source project combining modern AI with proven interview
              preparation methods
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {highlights.map((highlight, index) => (
              <div
                key={index}
                className="group relative p-8 rounded-2xl bg-white dark:bg-surface-800 border border-stone-200/80 dark:border-surface-700 shadow-md shadow-stone-200/50 dark:shadow-black/20 hover:shadow-xl hover:shadow-secondary-500/15 hover:-translate-y-2 transition-all duration-300 text-center overflow-hidden"
              >
                {/* Gradient accent line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-secondary-500 to-tertiary-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-primary-500/10 to-secondary-500/10 group-hover:from-primary-500/20 group-hover:to-secondary-500/20 flex items-center justify-center text-primary-500 transition-all duration-300 group-hover:scale-110">
                  {highlight.icon}
                </div>
                <h3 className="text-lg font-semibold text-stone-800 dark:text-white mb-3">
                  {highlight.title}
                </h3>
                <p className="text-stone-600 dark:text-surface-400 leading-relaxed">
                  {highlight.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-500 via-secondary-500 to-tertiary-500 p-12 text-center">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
            </div>

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
                Ready to Improve Your Interview Skills?
              </h2>
              <p className="text-lg text-white/90 mb-8 max-w-xl mx-auto">
                Start practicing for free. No credit card required.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Button
                  size="xl"
                  onClick={onSignup}
                  className="bg-white text-primary-600 hover:bg-white/90 shadow-xl"
                >
                  Get Started Free
                  <ChevronRight className="w-5 h-5" />
                </Button>
                <Button
                  size="xl"
                  variant="outline"
                  onClick={onLogin}
                  className="border-white/50 text-white hover:bg-white/10"
                >
                  I Already Have an Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-stone-200 dark:border-surface-700/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
                <Mic className="w-4 h-4 text-white" />
              </div>
              <span className="font-display font-bold text-stone-800 dark:text-white">
                InterviewAI
              </span>
            </div>

            <p className="flex items-center gap-1 text-sm text-stone-500 dark:text-surface-500">
              © 2024 AI Interview Assistant. Built with{" "}
              <Heart className="w-4 h-4 text-red-500 fill-red-500" /> for job
              seekers.
            </p>

            <div className="flex items-center gap-6 text-sm text-stone-500 dark:text-surface-500">
              <a
                href="#"
                className="hover:text-stone-800 dark:hover:text-white transition-colors"
              >
                Privacy
              </a>
              <a
                href="#"
                className="hover:text-stone-800 dark:hover:text-white transition-colors"
              >
                Terms
              </a>
              <a
                href="#"
                className="hover:text-stone-800 dark:hover:text-white transition-colors"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ===========================================
// Main App Content
// ===========================================

function AppContent() {
  const { user, isLoggedIn, signOut, isLoading: authLoading } = useAuth();

  // Theme
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : true;
  });

  // Views
  const [view, setView] = useState<AppView>("landing");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  // Interview state
  const [phase, setPhase] = useState<InterviewPhase>("domain");
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [jobDescription, setJobDescription] = useState<string>("");
  const [sessionName, setSessionName] = useState<string>("");
  const [questions, setQuestions] = useState<SmartQuestion[]>([]);
  const [questionMetadata, setQuestionMetadata] =
    useState<Partial<SmartQuestionsResponse> | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answerFeedback, setAnswerFeedback] =
    useState<AudioFeedbackResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [completedQuestions, setCompletedQuestions] = useState<number[]>([]);
  const [skippedQuestions, setSkippedQuestions] = useState<number[]>([]);

  // Resume state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState<string>("");
  const [resumeAnalysis, setResumeAnalysis] =
    useState<ResumeAnalysisResponse | null>(null);

  // Session history
  const [sessionHistory, setSessionHistory] = useState<AudioFeedbackResponse[]>(
    [],
  );
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  // Session ID for database tracking
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Question navigation and attempts
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [attemptCounts, setAttemptCounts] = useState<Record<number, number>>(
    {},
  );
  const [questionFeedbacks, setQuestionFeedbacks] = useState<
    Record<number, AudioFeedbackResponse[]>
  >({});

  // Silence unused vars
  void questionMetadata;

  // Guard protected views
  useEffect(() => {
    const protectedViews: AppView[] = [
      "interview",
      "summary",
      "dashboard",
      "admin",
    ];
    if (!isLoggedIn && protectedViews.includes(view)) {
      setAuthMode("login");
      setView("auth");
    }
  }, [isLoggedIn, view]);

  // Apply theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  // Redirect logged in users
  useEffect(() => {
    if (isLoggedIn && view === "landing") {
      setView("dashboard");
    }
  }, [isLoggedIn, view]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Navigation handlers
  const handleLogin = () => {
    setAuthMode("login");
    setView("auth");
  };
  const handleSignup = () => {
    setAuthMode("register");
    setView("auth");
  };
  const handleAuthSuccess = () => {
    setView("dashboard");
  };

  const handleStartInterview = () => {
    if (!isLoggedIn) {
      setAuthMode("login");
      setView("auth");
      return;
    }
    setView("interview");
    setPhase("domain");
    resetInterview();
  };

  const handleResumeSession = async (sessionId: string) => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { session, attempts } = await getSession(sessionId);

      setSessionId(session.id);

      // Map session questions to SmartQuestion format
      const smartQuestions: SmartQuestion[] = session.questions.map(
        (q: any) => ({
          id: q.id,
          question: q.question,
          ideal_answer: q.ideal_answer || "",
          category: q.category || "general",
          domain: session.domain,
          difficulty: q.difficulty || "medium",
          keywords: [],
          time_limit_seconds: 120,
        }),
      );

      setQuestions(smartQuestions);


      // Separate answered and skipped attempts
      const answeredAttempts = attempts.filter((a: any) => a.transcript !== "SKIPPED" && !a.is_skipped);
      const skippedAttemptsList = attempts.filter((a: any) => a.transcript === "SKIPPED" || a.is_skipped);
      
      // Determine next question - count all attempts (answered + skipped) for progress
      const allAttemptedQuestionIds = new Set(attempts.map((a: any) => a.question_id));
      const nextQuestionIndex = allAttemptedQuestionIds.size;
      setCurrentQuestionIndex(nextQuestionIndex);

      // Reconstruct COMPLETED state (only answered questions, not skipped)
      const completedIndices: number[] = [];
      answeredAttempts.forEach((a: any) => {
        const idx = smartQuestions.findIndex((q) => q.id === a.question_id);
        if (idx !== -1 && !completedIndices.includes(idx)) {
          completedIndices.push(idx);
        }
      });
      setCompletedQuestions(completedIndices);

      // Reconstruct SKIPPED state (only skipped questions that weren't later answered)
      const skippedIndices: number[] = [];
      skippedAttemptsList.forEach((a: any) => {
        const idx = smartQuestions.findIndex((q) => q.id === a.question_id);
        // Only mark as skipped if not already in completed (handles re-attempts)
        if (idx !== -1 && !completedIndices.includes(idx) && !skippedIndices.includes(idx)) {
          skippedIndices.push(idx);
        }
      });
      setSkippedQuestions(skippedIndices);

      // Set context
      const domain = DOMAINS.find((d) => d.id === session.domain);
      if (domain) setSelectedDomain(domain);
      if (session.job_description) setJobDescription(session.job_description);

      // Check if session is already completed
      if (nextQuestionIndex >= smartQuestions.length) {
        // Check if ALL questions were skipped
        // MUST check attempts.length > 0 to avoid vacuous truth for empty arrays
        const allSkipped =
          attempts.length > 0 &&
          attempts.every((a: any) => a.transcript === "SKIPPED");

        if (allSkipped) {
          alert(
            "All questions in this session were skipped. Redirecting to dashboard.",
          );
          setView("dashboard");
          return;
        }

        // Truly complete - show summary
        // Prepare session history for summary - filter out skipped attempts
        const scoredAttempts = attempts.filter((a: any) => a.transcript !== "SKIPPED" && !a.is_skipped);
        
        const history: AudioFeedbackResponse[] = scoredAttempts.map((a: any) => {
          let scores = {
            content: a.content_score || 0,
            delivery: a.delivery_score || 0,
            communication: a.communication_score || 0,
            voice: a.voice_score || 0,
            confidence: a.confidence_score || 0,
            structure: a.structure_score || 0,
            final: a.final_score || 0,
            wpm: 0,
            filler_count: 0,
            grammar_errors: 0,
            relevance: 0,
          };
          try {
            const parsed =
              typeof a.ml_scores === "string"
                ? JSON.parse(a.ml_scores)
                : a.ml_scores;
            if (parsed) scores = { ...scores, ...parsed };
          } catch (e) {
            console.error("Error parsing scores", e);
          }

          let feedback = {
            summary: "",
            strengths: [],
            improvements: [],
            tips: [],
            example_answer: "",
          };
          try {
            const parsed =
              typeof a.llm_feedback === "string"
                ? JSON.parse(a.llm_feedback)
                : a.llm_feedback;
            if (parsed) feedback = { ...feedback, ...parsed };
          } catch (e) {
            console.error("Error parsing feedback", e);
          }

          return {
            attempt_id: a.id,
            question_id: a.question_id,
            question_text: a.question_text || "",
            transcript: a.transcript || "",
            duration_seconds: a.audio_duration || 0,
            scores: scores,
            feedback: feedback,
          };
        });
        setSessionHistory(history);
        setView("summary");
      } else {
        setPhase("questions");
        setView("interview");
      }
    } catch (err) {
      console.error("Failed to resume session:", err);
      alert("Failed to resume session. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomUpload = () => {
    // Show custom upload modal within domain selection instead of navigating away
    setShowCustomUploadModal(true);
  };

  // Handler for re-attempting a completed session (same questions, fresh start)
  const handleReattemptSession = async (sessionId: string) => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { session } = await getSession(sessionId);

      // Map session questions to SmartQuestion format
      const smartQuestions: SmartQuestion[] = session.questions.map(
        (q: any) => ({
          id: q.id,
          question: q.question,
          ideal_answer: q.ideal_answer || "",
          category: q.category || "general",
          domain: session.domain,
          difficulty: q.difficulty || "medium",
          keywords: q.keywords || [],
          time_limit_seconds: q.time_limit_seconds || 120,
        }),
      );

      // Reset all state for a fresh attempt
      setQuestions(smartQuestions);
      setCurrentQuestionIndex(0);
      setCompletedQuestions([]);
      setSkippedQuestions([]);
      setSessionHistory([]);
      setQuestionFeedbacks({});
      setAttemptCounts({});
      setAnswerFeedback(null);

      // Set context
      const domain = DOMAINS.find((d) => d.id === session.domain);
      if (domain) setSelectedDomain(domain);
      if (session.job_description) setJobDescription(session.job_description);
      if (session.session_name) setSessionName(session.session_name + " (Re-attempt)");

      // Create a new session for the re-attempt
      const response = await fetch("/api/v1/sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          domain: session.domain,
          job_description: session.job_description,
          job_title: session.job_title,
          num_questions: smartQuestions.length,
          session_name: (session.session_name || session.job_title || session.domain) + " (Re-attempt)",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.session_id);
        // Use the questions from the original session, not the new ones
        // Since we want to practice the same questions
      } else {
        // Fall back to using original session ID (not ideal but works)
        setSessionId(null);
      }

      setPhase("questions");
      setView("interview");
      toast.success("Session ready for re-attempt!");
    } catch (err) {
      console.error("Failed to re-attempt session:", err);
      toast.error("Failed to load session for re-attempt");
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for viewing summary of a completed session
  const handleViewSummary = async (sessionId: string) => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { session, attempts } = await getSession(sessionId);

      // Map session questions to SmartQuestion format
      const smartQuestions: SmartQuestion[] = session.questions.map(
        (q: any) => ({
          id: q.id,
          question: q.question,
          ideal_answer: q.ideal_answer || "",
          category: q.category || "general",
          domain: session.domain,
          difficulty: q.difficulty || "medium",
          keywords: q.keywords || [],
          time_limit_seconds: q.time_limit_seconds || 120,
        }),
      );

      setQuestions(smartQuestions);
      setSessionId(sessionId);

      // Set context
      const domain = DOMAINS.find((d) => d.id === session.domain);
      if (domain) setSelectedDomain(domain);
      if (session.job_description) setJobDescription(session.job_description);

      // Build session history for summary - filter out skipped attempts
      const scoredAttempts = attempts.filter((a: any) => a.transcript !== "SKIPPED" && !a.is_skipped);
      
      const history: AudioFeedbackResponse[] = scoredAttempts.map((a: any) => {
        let scores = {
          content: a.content_score || 0,
          delivery: a.delivery_score || 0,
          communication: a.communication_score || 0,
          voice: a.voice_score || 0,
          confidence: a.confidence_score || 0,
          structure: a.structure_score || 0,
          final: a.final_score || 0,
          wpm: 0,
          filler_count: 0,
          grammar_errors: 0,
          relevance: 0,
        };
        try {
          const parsed =
            typeof a.ml_scores === "string"
              ? JSON.parse(a.ml_scores)
              : a.ml_scores;
          if (parsed) scores = { ...scores, ...parsed };
        } catch (e) {
          console.error("Error parsing scores", e);
        }

        let feedback = {
          summary: "",
          strengths: [],
          improvements: [],
          tips: [],
          example_answer: "",
        };
        try {
          const parsed =
            typeof a.llm_feedback === "string"
              ? JSON.parse(a.llm_feedback)
              : a.llm_feedback;
          if (parsed) feedback = { ...feedback, ...parsed };
        } catch (e) {
          console.error("Error parsing feedback", e);
        }

        return {
          attempt_id: a.id,
          question_id: a.question_id,
          question_text: a.question_text || "",
          transcript: a.transcript || "",
          duration_seconds: a.audio_duration || 0,
          scores: scores,
          feedback: feedback,
        };
      });

      setSessionHistory(history);
      setView("summary");
    } catch (err) {
      console.error("Failed to load session summary:", err);
      toast.error("Failed to load session summary");
    } finally {
      setIsLoading(false);
    }
  };

  // State for custom upload modal
  const [showCustomUploadModal, setShowCustomUploadModal] = useState(false);

  const handleQuestionsLoaded = (loadedQuestions: Question[]) => {
    // Close the modal if open
    setShowCustomUploadModal(false);
    // Convert Question[] to SmartQuestion[] with defaults for missing fields
    const smartQuestions: SmartQuestion[] = loadedQuestions.map((q) => ({
      id: q.id,
      question: q.question,
      ideal_answer: q.ideal_answer,
      category: q.category,
      domain: "general",
      difficulty: "medium",
      keywords: [],
      time_limit_seconds: 120,
    }));
    setQuestions(smartQuestions);
    setPhase("questions");
    setCurrentQuestionIndex(0);
    setCompletedQuestions([]);
    setAnswerFeedback(null);
    setView("interview");
  };

  const handleLogout = async () => {
    await signOut();
    setView("landing");
    resetInterview();
  };

  const resetInterview = () => {
    setSelectedDomain(null);
    setJobDescription("");
    setSessionName("");
    setQuestions([]);
    setQuestionMetadata(null);
    setCurrentQuestionIndex(0);
    setAnswerFeedback(null);
    setCompletedQuestions([]);
    setSkippedQuestions([]);
    setResumeFile(null);
    setResumeText("");
    setResumeAnalysis(null);
    setSessionHistory([]);
    setSessionId(null); // Reset session ID
    setQuestionFeedbacks({});
    setAttemptCounts({});
    setPhase("domain");
  };

  // Interview handlers
  const handleDomainSelect = (domain: Domain) => {
    setSelectedDomain(domain);
    setPhase("jd");
  };

  const handleJDSubmit = async () => {
    if (!jobDescription.trim() || jobDescription.length < 50) {
      alert("Please enter a job description (at least 50 characters)");
      return;
    }
    setPhase("resume");
  };

  const handleResumeUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setResumeFile(file);
  };

  const downloadResumeReport = () => {
    if (!resumeAnalysis) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text("Resume Analysis Report", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Domain: ${selectedDomain?.name || "N/A"}`, pageWidth / 2, 28, {
      align: "center",
    });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, 34, {
      align: "center",
    });

    // Score Summary Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, 40, pageWidth - 28, 20, 3, 3, "F");

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`Match Score: ${resumeAnalysis.skill_match_pct}%`, 20, 52);

    if (resumeAnalysis.domain_fit) {
      doc.text(`Domain Fit: ${resumeAnalysis.domain_fit}%`, 100, 52);
    }

    if (resumeAnalysis.feedback.validity_score) {
      doc.text(
        `Validity: ${resumeAnalysis.feedback.validity_score}/100`,
        160,
        52,
      );
    }

    let yPos = 70;

    // Executive Summary
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text("Executive Summary", 14, yPos);
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    const summaryLines = doc.splitTextToSize(
      resumeAnalysis.feedback.summary,
      pageWidth - 28,
    );
    doc.text(summaryLines, 14, yPos + 8);
    yPos = yPos + 8 + summaryLines.length * 6;

    // Strengths
    if (resumeAnalysis.feedback.strengths?.length) {
      yPos += 12;
      doc.setFontSize(14);
      doc.setTextColor(34, 139, 34);
      doc.text("✓ Key Strengths", 14, yPos);
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      yPos += 8;
      resumeAnalysis.feedback.strengths.forEach((s) => {
        const lines = doc.splitTextToSize(`• ${s}`, pageWidth - 28);
        doc.text(lines, 14, yPos);
        yPos += lines.length * 5;
      });
    }

    // Gaps
    if (resumeAnalysis.feedback.gaps?.length) {
      yPos += 10;
      doc.setFontSize(14);
      doc.setTextColor(200, 50, 50);
      doc.text("✗ Critical Gaps", 14, yPos);
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      yPos += 8;
      resumeAnalysis.feedback.gaps.forEach((s) => {
        const lines = doc.splitTextToSize(`• ${s}`, pageWidth - 28);
        doc.text(lines, 14, yPos);
        yPos += lines.length * 5;
      });
    }

    // Check for page break
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    // Skills Table
    yPos += 10;
    autoTable(doc, {
      startY: yPos,
      head: [["Matched Skills", "Missing Skills", "Priority Skills to Add"]],
      body: [
        [
          resumeAnalysis.matched_skills.join(", ") || "None",
          resumeAnalysis.missing_skills.join(", ") || "None",
          resumeAnalysis.feedback.priority_skills?.join(", ") || "N/A",
        ],
      ],
      theme: "grid",
      headStyles: { fillColor: [63, 81, 181], fontSize: 10 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 55 },
        2: { cellWidth: 55 },
      },
    });

    // Tips Section
    if (resumeAnalysis.feedback.tips?.length) {
      const finalY = (doc as any).lastAutoTable.finalY + 15;

      if (finalY > 250) {
        doc.addPage();
        yPos = 20;
      } else {
        yPos = finalY;
      }

      doc.setFontSize(14);
      doc.setTextColor(63, 81, 181);
      doc.text("💡 Actionable Recommendations", 14, yPos);
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      yPos += 8;
      resumeAnalysis.feedback.tips.forEach((t, i) => {
        const lines = doc.splitTextToSize(`${i + 1}. ${t}`, pageWidth - 28);
        doc.text(lines, 14, yPos);
        yPos += lines.length * 5 + 2;
      });
    }

    // Experience & Formatting Feedback
    const expY = (doc as any).lastAutoTable?.finalY
      ? (doc as any).lastAutoTable.finalY + 10
      : yPos + 10;
    if (resumeAnalysis.feedback.experience_feedback) {
      if (expY > 260) doc.addPage();
      const startY = expY > 260 ? 20 : expY;
      doc.setFontSize(12);
      doc.setTextColor(0, 100, 200);
      doc.text("Experience Feedback:", 14, startY);
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const expLines = doc.splitTextToSize(
        resumeAnalysis.feedback.experience_feedback,
        pageWidth - 28,
      );
      doc.text(expLines, 14, startY + 6);
    }

    doc.save("resume-analysis-report.pdf");
  };

  const handleAnalyzeResume = async () => {
    if (!selectedDomain || !resumeFile || !jobDescription.trim()) {
      toast.error("Missing Information", {
        description: "Please upload a resume and enter a job description",
      });
      return;
    }

    setIsLoading(true);
    const promise = (async () => {
      const formData = new FormData();
      formData.append("domain", selectedDomain.id);
      formData.append("job_description", jobDescription);
      formData.append("resume", resumeFile);
      if (user?.id) {
        formData.append("user_id", user.id);
      }

      const response = await fetch("/api/v1/analyze_resume_for_domain", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Analysis failed");

      const data = await response.json();
      setResumeAnalysis(data);
      return data;
    })();

    toast.promise(promise, {
      loading: "Analyzing your resume against the job description...",
      success: (data) =>
        `Analysis Complete! Match Score: ${data.skill_match_pct}%`,
      error: "Failed to analyze resume. Please try again.",
    });

    try {
      await promise;
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProceedToQuestions = async () => {
    if (!jobDescription.trim() || !user?.id) return;
    setIsLoading(true);
    try {
      // Create a new session via API
      const sessionResponse = await fetch("/api/v1/sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          domain: selectedDomain?.id || "general",
          job_description: jobDescription,
          num_questions: 10,
          session_name: sessionName || undefined,
        }),
      });

      if (!sessionResponse.ok) {
        throw new Error("Failed to create session");
      }

      const sessionData = await sessionResponse.json();
      setSessionId(sessionData.session_id);
      setQuestions(sessionData.questions);
      setQuestionMetadata({
        category_distribution: sessionData.category_distribution,
        difficulty_distribution: sessionData.difficulty_distribution,
      });
      setCurrentQuestionIndex(0);
      setCompletedQuestions([]);
      setPhase("questions");

      console.log("Session created:", sessionData.session_id);
    } catch (err) {
      console.error("Session creation failed, trying fallback:", err);
      // Fallback to old method
      try {
        const result = await getSmartQuestions(
          jobDescription,
          10,
          resumeText || undefined,
          [],
          sessionName || undefined,
        );
        setQuestions(result.questions);
        setQuestionMetadata(result);
        setCurrentQuestionIndex(0);
        setCompletedQuestions([]);
        setPhase("questions");
      } catch {
        try {
          const response = await fetch(
            `/api/v1/questions/random?domain=${
              selectedDomain?.id || "software_engineering"
            }&behavioral_count=5&technical_count=5`,
          );
          const data = await response.json();
          setQuestions(data.questions);
          setPhase("questions");
        } catch {
          alert("Failed to load questions. Please try again.");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipResume = () => {
    handleProceedToQuestions();
  };
  const handleStartRecording = () => {
    setAnswerFeedback(null);
    setPhase("record");
  };

  const handleSkipQuestion = async () => {
    const currentQ = questions[currentQuestionIndex];

    const skipPromise = (async () => {
      // Call skip API if we have a session
      if (sessionId && user?.id && currentQ) {
        await fetch(`/api/v1/sessions/${sessionId}/skip`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            question_id: currentQ.id,
            question_order: currentQuestionIndex + 1,
            question_text: currentQ.question,
            domain: currentQ.domain || "general",
            difficulty: currentQ.difficulty || "medium",
          }),
        });
      }

      if (currentQuestionIndex < questions.length - 1) {
        setSkippedQuestions((prev) =>
          Array.from(new Set([...prev, currentQuestionIndex])),
        );
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setAnswerFeedback(null);
        setPhase("questions");
      } else {
        // Last question, complete session and navigate to summary
        if (sessionId && user?.id) {
          await fetch(
            `/api/v1/sessions/${sessionId}/complete?user_id=${user.id}`,
            {
              method: "POST",
            },
          );
        }
        setView("summary");
      }
    })();

    toast.promise(skipPromise, {
      loading: "Skipping question...",
      success: "Question skipped",
      error: "Failed to skip question",
    });

    try {
      await skipPromise;
    } catch (err) {
      console.error("Failed to skip:", err);
    }
  };

  const handleRecordingComplete = (feedback: AudioFeedbackResponse) => {
    // Store feedback for this specific question
    setQuestionFeedbacks((prev) => ({
      ...prev,
      [currentQuestionIndex]: [...(prev[currentQuestionIndex] || []), feedback],
    }));

    // Increment attempt count for this question
    setAttemptCounts((prev) => ({
      ...prev,
      [currentQuestionIndex]: (prev[currentQuestionIndex] || 0) + 1,
    }));

    setSessionHistory((prev) => [...prev, feedback]);
    setAnswerFeedback(feedback);

    // Mark as completed (by index not ID)
    if (!completedQuestions.includes(currentQuestionIndex)) {
      setCompletedQuestions([...completedQuestions, currentQuestionIndex]);
    }

    // Remove from skipped questions if this was a re-attempt of a skipped question
    if (skippedQuestions.includes(currentQuestionIndex)) {
      setSkippedQuestions((prev) => prev.filter((idx) => idx !== currentQuestionIndex));
    }

    setPhase("feedback");
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);

      const feedbacks = questionFeedbacks[nextIndex];
      if (feedbacks && feedbacks.length > 0) {
        setAnswerFeedback(feedbacks[feedbacks.length - 1]);
        setPhase("feedback");
      } else {
        setAnswerFeedback(null);
        setPhase("questions");
      }
    }
  };

  const handleGoToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    setSidebarOpen(false); // Close sidebar on mobile

    // Show last feedback if available, otherwise go to question view
    const feedbacks = questionFeedbacks[index];
    if (feedbacks && feedbacks.length > 0) {
      setAnswerFeedback(feedbacks[feedbacks.length - 1]);
      setPhase("feedback");
    } else {
      setAnswerFeedback(null);
      setPhase("questions");
    }
  };

  // Handler for viewing feedback of completed questions (from sidebar)
  // Different from handleGoToQuestion: this ONLY shows feedback, no re-attempt
  const handleViewFeedback = (index: number) => {
    setCurrentQuestionIndex(index);
    setSidebarOpen(false);

    const feedbacks = questionFeedbacks[index];
    if (feedbacks && feedbacks.length > 0) {
      // Show the stored feedback
      setAnswerFeedback(feedbacks[feedbacks.length - 1]);
      setPhase("feedback");
    } else {
      // Fallback: This shouldn't happen for a "completed" question
      // but if feedback is missing, still stay on current feedback view
      setPhase("feedback");
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  // Loading state
  if (authLoading) {
    return (
      <div className="page-loading">
        <LoadingSpinner size="xl" className="text-primary-500 mb-4" />
        <p className="text-stone-600 dark:text-surface-300 font-medium">
          Starting up...
        </p>
      </div>
    );
  }

  return (
    <div className="app-container min-h-screen">
      {/* Navigation Bar */}
      {view !== "landing" &&
        view !== "auth" &&
        view !== "summary" &&
        phase !== "record" &&
        phase !== "feedback" && (
          <nav className="app-nav">
            <button
              className="nav-brand"
              onClick={() => setView(isLoggedIn ? "dashboard" : "landing")}
            >
              <Mic className="w-6 h-6 text-primary-500" />
              <span className="brand-text">AI Interview</span>
            </button>

            <div className="nav-links">
              {isLoggedIn && (
                <>
                  <Button
                    variant={view === "dashboard" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setView("dashboard")}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Dashboard
                  </Button>
                  <Button
                    variant={view === "interview" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={handleStartInterview}
                  >
                    <Mic className="w-4 h-4" />
                    Practice
                  </Button>
                  <Button
                    variant={view === "profile" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setView("profile")}
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </Button>
                </>
              )}
            </div>

            <div className="nav-actions">
              <button onClick={toggleTheme} className="theme-toggle">
                {isDarkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              {isLoggedIn ? (
                <div className="user-menu">
                  <span className="user-name">
                    {user?.user_metadata?.full_name ||
                      user?.email?.split("@")[0]}
                  </span>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOut className="w-4 h-4" />
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="auth-buttons">
                  <Button variant="outline" size="sm" onClick={handleLogin}>
                    Login
                  </Button>
                  <Button size="sm" onClick={handleSignup}>
                    Sign Up
                  </Button>
                </div>
              )}
            </div>
          </nav>
        )}

      {/* Main Content */}
      <main className="app-main flex-1 w-full">
        {/* Landing Page */}
        {view === "landing" && (
          <LandingPage
            onLogin={handleLogin}
            onSignup={handleSignup}
            onStartInterview={handleStartInterview}
            isDarkMode={isDarkMode}
            toggleTheme={toggleTheme}
          />
        )}

        {/* Auth View */}
        {view === "auth" && (
          <div className="min-h-screen flex flex-col items-center justify-center p-8">
            <Button
              variant="ghost"
              className="absolute top-6 left-6"
              onClick={() => setView("landing")}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <AuthForms initialMode={authMode} onSuccess={handleAuthSuccess} />
          </div>
        )}

        {/* Dashboard */}
        {view === "dashboard" && isLoggedIn && (
          <Dashboard
            onStartPractice={handleStartInterview}
            onResumeSession={handleResumeSession}
            onReattemptSession={handleReattemptSession}
            onViewSummary={handleViewSummary}
          />
        )}

        {/* Profile */}
        {view === "profile" && isLoggedIn && <Profile />}

        {/* Admin Upload */}
        {view === "admin" && (
          <AdminUpload onClose={() => setView("dashboard")} />
        )}

        {/* Interview Summary Page */}
        {view === "summary" && isLoggedIn && (
          <InterviewSummary
            sessionHistory={sessionHistory}
            sessionId={sessionId || undefined}
            userId={user?.id}
            onClose={() => setView("dashboard")}
          />
        )}

        {/* Interview View */}
        {view === "interview" && (
          <div
            className={
              phase === "feedback" || (phase === "resume" && resumeAnalysis)
                ? "w-full px-6"
                : phase === "questions"
                  ? "w-full"
                  : "max-w-4xl mx-auto px-6 py-8"
            }
          >
            {/* Progress Bar */}
            {phase !== "domain" && phase !== "jd" && questions.length > 0 && (
              <div className="mb-8">
                <div className="h-2 bg-surface-800 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-500 via-secondary-500 to-tertiary-500 transition-all duration-500"
                    style={{
                      width: `${
                        ((currentQuestionIndex +
                          (phase === "feedback" ? 1 : 0)) /
                          questions.length) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-surface-400">
                  <span>
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                  {selectedDomain && (
                    <Badge variant="default">{selectedDomain.name}</Badge>
                  )}
                </div>
              </div>
            )}

            {/* Domain Selection */}
            {phase === "domain" && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <h2 className="text-3xl font-display font-bold text-stone-800 dark:text-white">
                    Choose Your Interview Domain
                  </h2>
                  <button
                    onClick={() => setShowHelpModal(true)}
                    className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-surface-700 transition-colors"
                    title="How to practice"
                  >
                    <HelpCircle className="w-6 h-6 text-stone-400 hover:text-primary-500 transition-colors" />
                  </button>
                </div>
                <p className="text-stone-600 dark:text-surface-300 mb-10 max-w-2xl mx-auto">
                  Select the field you want to practice for. Questions will be
                  tailored to your selected domain.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                  {DOMAINS.map((domain) => (
                    <Card
                      key={domain.id}
                      className="cursor-pointer hover:border-primary-500/50 hover:-translate-y-1 transition-all duration-300"
                      onClick={() => handleDomainSelect(domain)}
                    >
                      <CardContent className="pt-6 text-center">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 flex items-center justify-center text-primary-500 mb-4">
                          {domain.icon}
                        </div>
                        <h3 className="text-lg font-display font-semibold text-stone-800 dark:text-white mb-1">
                          {domain.name}
                        </h3>
                        <p className="text-sm text-stone-500 dark:text-surface-400">
                          {domain.description}
                        </p>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Custom Upload Card */}
                  <Card
                    className="cursor-pointer border-dashed hover:border-primary-500/50 hover:-translate-y-1 transition-all duration-300"
                    onClick={handleCustomUpload}
                  >
                    <CardContent className="pt-6 text-center">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-stone-100 dark:bg-surface-800 flex items-center justify-center text-stone-500 dark:text-surface-400 mb-4">
                        <Upload className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-display font-semibold text-stone-800 dark:text-white mb-1">
                        Custom Questions
                      </h3>
                      <p className="text-sm text-stone-500 dark:text-surface-400">
                        Upload your own JSON file
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => setView(isLoggedIn ? "dashboard" : "landing")}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>

                {/* Custom Upload Modal */}
                {showCustomUploadModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-surface-800 rounded-2xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                      <CustomUpload
                        onQuestionsLoaded={handleQuestionsLoaded}
                        onCancel={() => setShowCustomUploadModal(false)}
                      />
                    </div>
                  </div>
                )}

                {/* Help Modal */}
                <HelpModal
                  isOpen={showHelpModal}
                  onClose={() => setShowHelpModal(false)}
                />
              </div>
            )}

            {/* Job Description Phase */}
            {phase === "jd" && selectedDomain && (
              <div className="max-w-2xl mx-auto">
                <h2 className="text-3xl font-display font-bold text-stone-800 dark:text-white text-center mb-4">
                  Enter Job Description
                </h2>
                <p className="text-stone-600 dark:text-slate-300 text-center mb-8">
                  Paste the job description for the {selectedDomain.name}{" "}
                  position you're preparing for.
                </p>

                <Card className="mb-6">
                  <CardContent className="pt-6">
                    <textarea
                      className="w-full min-h-[300px] p-4 bg-white dark:bg-slate-900/50 border border-stone-200 dark:border-slate-700 rounded-xl text-stone-800 dark:text-white placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-y"
                      placeholder="Paste the full job description here..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                    />
                    <div className="flex justify-end mt-2">
                      <span
                        className={`text-sm ${
                          jobDescription.length < 50
                            ? "text-secondary-500"
                            : "text-success-500"
                        }`}
                      >
                        {jobDescription.length} characters{" "}
                        {jobDescription.length < 50 && "(min 50 required)"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Session Name Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-stone-700 dark:text-slate-300 mb-2">
                    Session Name (Optional)
                  </label>
                  <input
                    type="text"
                    className="w-full p-4 bg-white dark:bg-slate-900/50 border border-stone-200 dark:border-slate-700 rounded-xl text-stone-800 dark:text-white placeholder-stone-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    placeholder="E.g., Senior PM - Google Practice"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                  />
                </div>

                <div className="flex justify-center gap-4">
                  <Button variant="ghost" onClick={() => setPhase("domain")}>
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleJDSubmit}
                    disabled={jobDescription.length < 50}
                  >
                    Continue
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Resume Phase */}
            {phase === "resume" && (
              <div
                className={
                  resumeAnalysis
                    ? "w-full px-4"
                    : "max-w-4xl mx-auto text-center"
                }
              >
                {/* Upload Section - Hidden after analysis */}
                {!resumeAnalysis && (
                  <>
                    <h2 className="text-3xl font-display font-bold text-stone-800 dark:text-white mb-4">
                      Upload Resume (Optional)
                    </h2>
                    <p className="text-stone-600 dark:text-surface-300 mb-8">
                      Upload your resume for personalized questions
                    </p>

                    <Card className="mb-6">
                      <CardContent className="pt-6">
                        <label className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-stone-200 dark:border-surface-600/50 rounded-xl cursor-pointer hover:border-primary-500/50 hover:bg-primary-500/5 transition-all">
                          <Upload className="w-12 h-12 text-stone-400 dark:text-surface-500 mb-4" />
                          <span className="text-stone-500 dark:text-surface-400">
                            {resumeFile
                              ? resumeFile.name
                              : "Click to upload PDF or DOCX"}
                          </span>
                          <input
                            id="resume-upload"
                            name="resume-upload"
                            type="file"
                            accept=".pdf,.docx"
                            onChange={handleResumeUpload}
                            className="hidden"
                          />
                        </label>
                      </CardContent>
                    </Card>

                    <div className="flex flex-col items-center gap-4">
                      {resumeFile && (
                        <Button
                          onClick={handleAnalyzeResume}
                          disabled={isLoading}
                          className="w-full"
                        >
                          {isLoading ? "Analyzing..." : "Analyze Resume"}
                        </Button>
                      )}
                      <Button
                        size="lg"
                        variant="default"
                        onClick={handleSkipResume}
                        disabled={isLoading}
                      >
                        {isLoading ? "Loading Questions..." : "Skip & Continue"}
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                      <Button variant="ghost" onClick={() => setPhase("jd")}>
                        <ArrowLeft className="w-4 h-4" />
                        Back
                      </Button>
                    </div>
                  </>
                )}

                {/* Analysis Results - Full Width Enhanced Layout */}
                {resumeAnalysis && (
                  <div className="space-y-8 py-8 px-4 md:px-8 lg:px-12">
                    {/* Header with Score */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                      <div>
                        <h2 className="text-2xl font-display font-bold text-stone-800 dark:text-white">
                          Resume Analysis Report
                        </h2>
                        <p className="text-stone-500 dark:text-surface-400 text-sm">
                          {resumeFile?.name} • {selectedDomain?.name}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        {resumeAnalysis.feedback.validity_score &&
                          resumeAnalysis.feedback.validity_score < 50 && (
                            <Badge
                              variant="destructive"
                              className="text-sm px-3 py-1"
                            >
                              Invalid Resume
                            </Badge>
                          )}
                        <Badge
                          variant={
                            resumeAnalysis.skill_match_pct >= 70
                              ? "success"
                              : resumeAnalysis.skill_match_pct >= 50
                                ? "warning"
                                : "destructive"
                          }
                          className="text-lg px-4 py-2 font-bold"
                        >
                          {resumeAnalysis.skill_match_pct}% Match
                        </Badge>
                      </div>
                    </div>

                    {/* Main Grid Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left Column - Summary & Scores */}
                      <div className="lg:col-span-2 space-y-6">
                        {/* Executive Summary */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg">
                              Executive Summary
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-stone-600 dark:text-surface-300 leading-relaxed">
                              {resumeAnalysis.feedback.summary}
                            </p>
                          </CardContent>
                        </Card>

                        {/* Strengths & Gaps Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Strengths */}
                          <Card className="border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-900/10">
                            <CardHeader className="pb-2">
                              <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-base">
                                <CheckCircle2 className="w-5 h-5" /> Key
                                Strengths
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2">
                                {resumeAnalysis.feedback.strengths?.map(
                                  (s: string, i: number) => (
                                    <li
                                      key={i}
                                      className="flex items-start gap-2 text-sm text-stone-700 dark:text-surface-200"
                                    >
                                      <span className="text-emerald-500 mt-1">
                                        ✓
                                      </span>
                                      <span>{s}</span>
                                    </li>
                                  ),
                                )}
                              </ul>
                            </CardContent>
                          </Card>

                          {/* Gaps */}
                          <Card className="border-rose-500/20 bg-rose-50/50 dark:bg-rose-900/10">
                            <CardHeader className="pb-2">
                              <CardTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400 text-base">
                                <AlertCircle className="w-5 h-5" /> Critical
                                Gaps
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2">
                                {resumeAnalysis.feedback.gaps?.map(
                                  (s: string, i: number) => (
                                    <li
                                      key={i}
                                      className="flex items-start gap-2 text-sm text-stone-700 dark:text-surface-200"
                                    >
                                      <span className="text-rose-500 mt-1">
                                        ✗
                                      </span>
                                      <span>{s}</span>
                                    </li>
                                  ),
                                )}
                              </ul>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Experience & Formatting Feedback */}
                        {(resumeAnalysis.feedback.experience_feedback ||
                          resumeAnalysis.feedback.formatting_feedback) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {resumeAnalysis.feedback.experience_feedback && (
                              <Card className="border-blue-500/20">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-blue-700 dark:text-blue-400 text-base">
                                    Experience Feedback
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-sm text-stone-600 dark:text-surface-300">
                                    {
                                      resumeAnalysis.feedback
                                        .experience_feedback
                                    }
                                  </p>
                                </CardContent>
                              </Card>
                            )}
                            {resumeAnalysis.feedback.formatting_feedback && (
                              <Card className="border-purple-500/20">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-purple-700 dark:text-purple-400 text-base">
                                    Formatting Feedback
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-sm text-stone-600 dark:text-surface-300">
                                    {
                                      resumeAnalysis.feedback
                                        .formatting_feedback
                                    }
                                  </p>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        )}

                        {/* Actionable Tips */}
                        {resumeAnalysis.feedback.tips?.length > 0 && (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg">
                                💡 Actionable Recommendations
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-3">
                                {resumeAnalysis.feedback.tips.map(
                                  (tip: string, i: number) => (
                                    <li
                                      key={i}
                                      className="flex items-start gap-3 text-sm"
                                    >
                                      <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                        {i + 1}
                                      </span>
                                      <span className="text-stone-600 dark:text-surface-300">
                                        {tip}
                                      </span>
                                    </li>
                                  ),
                                )}
                              </ul>
                            </CardContent>
                          </Card>
                        )}
                      </div>

                      {/* Right Column - Skills & Stats */}
                      <div className="space-y-6">
                        {/* Score Stats */}
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base">
                              Analysis Metrics
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-stone-500 dark:text-surface-400">
                                Skill Match
                              </span>
                              <span className="font-bold text-lg">
                                {resumeAnalysis.skill_match_pct}%
                              </span>
                            </div>
                            <div className="w-full bg-stone-200 dark:bg-surface-700 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-500"
                                style={{
                                  width: `${resumeAnalysis.skill_match_pct}%`,
                                }}
                              />
                            </div>
                            {resumeAnalysis.domain_fit && (
                              <>
                                <div className="flex justify-between items-center pt-2">
                                  <span className="text-sm text-stone-500 dark:text-surface-400">
                                    Domain Fit
                                  </span>
                                  <span className="font-bold text-lg">
                                    {resumeAnalysis.domain_fit}%
                                  </span>
                                </div>
                                <div className="w-full bg-stone-200 dark:bg-surface-700 rounded-full h-2">
                                  <div
                                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-500"
                                    style={{
                                      width: `${resumeAnalysis.domain_fit}%`,
                                    }}
                                  />
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>

                        {/* Matched Skills */}
                        <Card className="border-emerald-500/20">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base text-emerald-700 dark:text-emerald-400">
                              ✓ Matched Skills (
                              {resumeAnalysis.matched_skills.length})
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              {resumeAnalysis.matched_skills.map(
                                (skill: string, i: number) => (
                                  <Badge
                                    key={i}
                                    variant="success"
                                    className="text-xs"
                                  >
                                    {skill}
                                  </Badge>
                                ),
                              )}
                              {resumeAnalysis.matched_skills.length === 0 && (
                                <span className="text-sm text-stone-400">
                                  None detected
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Missing Skills */}
                        <Card className="border-amber-500/20">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base text-amber-700 dark:text-amber-400">
                              ⚠ Missing Skills (
                              {resumeAnalysis.missing_skills.length})
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              {resumeAnalysis.missing_skills.map(
                                (skill: string, i: number) => (
                                  <Badge
                                    key={i}
                                    variant="warning"
                                    className="text-xs"
                                  >
                                    {skill}
                                  </Badge>
                                ),
                              )}
                              {resumeAnalysis.missing_skills.length === 0 && (
                                <span className="text-sm text-stone-400">
                                  None - great coverage!
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Priority Skills to Add */}
                        {resumeAnalysis.feedback.priority_skills &&
                          resumeAnalysis.feedback.priority_skills.length >
                            0 && (
                            <Card className="border-primary-500/20 bg-primary-50/50 dark:bg-primary-900/10">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base text-primary-700 dark:text-primary-400">
                                  🎯 Priority Skills to Add
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="flex flex-wrap gap-2">
                                  {resumeAnalysis.feedback.priority_skills.map(
                                    (skill: string, i: number) => (
                                      <Badge
                                        key={i}
                                        variant="default"
                                        className="text-xs"
                                      >
                                        {skill}
                                      </Badge>
                                    ),
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-stone-200 dark:border-surface-700">
                      <Button
                        size="lg"
                        onClick={handleProceedToQuestions}
                        className="flex-1 bg-gradient-to-r from-success-600 to-emerald-600 hover:from-success-500 hover:to-emerald-500 text-white shadow-lg"
                      >
                        Continue to Questions
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={downloadResumeReport}
                        className="sm:w-auto"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Report (PDF)
                      </Button>
                      <Button
                        variant="ghost"
                        size="lg"
                        onClick={() => setPhase("jd")}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Questions Phase */}
            {phase === "questions" && currentQuestion && (
              <div className="flex flex-col lg:flex-row gap-4 px-4 lg:px-6 py-4">
                {/* Main Content */}
                <div className="flex-1">
                  <Card className="p-6 lg:p-8 h-full flex flex-col justify-center min-h-[420px]">
                    {/* Question Number Header */}
                    <div className="text-center mb-4">
                      <h2 className="text-2xl font-bold text-stone-800 dark:text-white mb-1">
                        Question {currentQuestionIndex + 1}
                        <span className="text-stone-400 dark:text-slate-500">
                          {" "}
                          / {questions.length}
                        </span>
                      </h2>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                      <Badge variant="default">
                        {currentQuestion.category || "General"}
                      </Badge>
                      <Badge
                        variant={
                          currentQuestion.difficulty === "easy"
                            ? "success"
                            : currentQuestion.difficulty === "hard"
                              ? "destructive"
                              : "warning"
                        }
                      >
                        {currentQuestion.difficulty || "Medium"}
                      </Badge>
                    </div>
                    <div className="flex-1 flex items-center justify-center mb-6">
                      <p className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-stone-800 dark:text-white leading-relaxed text-center w-full">
                        {currentQuestion.question}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <Button
                        size="lg"
                        onClick={handleStartRecording}
                        className="px-6 py-5"
                      >
                        <Play className="w-5 h-5" />
                        Start Recording
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={handleSkipQuestion}
                        className="px-6 py-5 border-2 border-primary-500/50 hover:border-primary-500 dark:border-primary-500/40 dark:hover:border-primary-500/60 text-primary-500 dark:text-primary-400"
                      >
                        Skip Question
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>
                  </Card>
                </div>

                {/* Right Sidebar - Navigation & Analysis */}
                <div className="w-full lg:w-72 space-y-3">
                  {/* Session Stats */}
                  <Card className="p-4">
                    <h3 className="text-xs font-semibold text-stone-800 dark:text-white mb-3">
                      Session Progress
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-stone-600 dark:text-slate-400">
                          Total Questions
                        </span>
                        <span className="text-sm font-bold text-stone-800 dark:text-white">
                          {questions.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">
                          Completed
                        </span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {completedQuestions.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          Skipped
                        </span>
                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                          {skippedQuestions.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-stone-600 dark:text-slate-400">
                          Remaining
                        </span>
                        <span className="text-sm font-bold text-stone-800 dark:text-white">
                          {questions.length -
                            completedQuestions.length -
                            skippedQuestions.length}
                        </span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-3 h-1.5 bg-stone-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-primary-500 transition-all duration-500"
                        style={{
                          width: `${((completedQuestions.length + skippedQuestions.length) / questions.length) * 100}%`,
                        }}
                      />
                    </div>
                  </Card>

                  {/* Question Navigation */}
                  <Card className="p-4">
                    <h3 className="text-xs font-semibold text-stone-800 dark:text-white mb-3">
                      Quick Navigation
                    </h3>
                    <div
                      className="space-y-1.5 overflow-y-auto"
                      style={{
                        maxHeight: "calc(100vh - 380px)",
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                      }}
                    >
                      <style>{`
                      .space-y-2::-webkit-scrollbar {
                        display: none;
                      }
                    `}</style>
                      {questions.map((q, i) => {
                        const isSkipped = skippedQuestions.includes(i);
                        const isCompleted = completedQuestions.includes(i);
                        const isCurrent = i === currentQuestionIndex;
                        const canNavigate =
                          i <= currentQuestionIndex || isCompleted || isSkipped;
                        const attemptCount = attemptCounts[i] || 0;

                        return (
                          <button
                            key={i}
                            onClick={() =>
                              canNavigate && setCurrentQuestionIndex(i)
                            }
                            disabled={!canNavigate}
                            className={`w-full p-2 rounded-lg text-left transition-all duration-200 flex items-center gap-2 ${
                              isCurrent
                                ? "bg-primary-500 text-white shadow-md"
                                : isCompleted
                                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-stone-800 dark:text-white hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                                  : isSkipped && attemptCount === 0
                                    ? "bg-amber-50 dark:bg-amber-900/20 text-stone-800 dark:text-white hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-800"
                                    : canNavigate
                                      ? "bg-stone-50 dark:bg-slate-700 text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-600"
                                      : "bg-stone-50 dark:bg-slate-800 text-stone-400 dark:text-slate-600 opacity-50 cursor-not-allowed"
                            }`}
                          >
                            <div
                              className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                                isCurrent
                                  ? "bg-white/20"
                                  : isCompleted
                                    ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                                    : isSkipped && attemptCount === 0
                                      ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
                                      : "bg-stone-200 dark:bg-slate-600 text-stone-600 dark:text-slate-400"
                              }`}
                            >
                              {isSkipped && attemptCount === 0 ? (
                                <span className="text-[9px]">SK</span>
                              ) : isCompleted ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                i + 1
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-[11px] font-medium mb-0.5 ${
                                  isCurrent
                                    ? "text-white/80"
                                    : "text-stone-500 dark:text-slate-400"
                                }`}
                              >
                                Q{i + 1}
                              </p>
                              <p className="text-xs line-clamp-1">
                                {q.question}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* Recording Phase - Full Screen */}
            {phase === "record" && currentQuestion && (
              <div className="fixed inset-0 z-40 bg-stone-50 dark:bg-surface-900">
                <Recorder
                  question={{
                    ...currentQuestion,
                    questionNumber: currentQuestionIndex + 1,
                    totalQuestions: questions.length,
                    domain: selectedDomain?.name || "General",
                  }}
                  jobDescription={jobDescription}
                  userId={user?.id || ""}
                  sessionId={sessionId || ""}
                  questionOrder={currentQuestionIndex + 1}
                  onRecordingComplete={handleRecordingComplete}
                  onSkip={handleSkipQuestion}
                  onBack={() => setPhase("questions")}
                />
              </div>
            )}

            {/* Feedback Phase */}
            {phase === "feedback" && answerFeedback && (
              <div className="flex min-h-screen">
                {/* Question Sidebar */}
                <QuestionSidebar
                  questions={questions}
                  currentIndex={currentQuestionIndex}
                  completedIndices={completedQuestions}
                  skippedIndices={skippedQuestions}
                  attemptCounts={attemptCounts}
                  onNavigate={handleGoToQuestion}
                  onViewFeedback={handleViewFeedback}
                  isOpen={sidebarOpen}
                  onClose={() => setSidebarOpen(false)}
                />

                {/* Main Content */}
                <div className="flex-1 relative">
                  {/* Mobile Sidebar Toggle */}
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden fixed bottom-6 left-6 z-30 p-4 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 transition-colors"
                  >
                    <Menu className="w-6 h-6" />
                  </button>

                  <FeedbackCard
                    feedback={answerFeedback}
                    question={currentQuestion}
                    previousAttempt={
                      questionFeedbacks[currentQuestionIndex]?.length > 1
                        ? questionFeedbacks[currentQuestionIndex][
                            questionFeedbacks[currentQuestionIndex].length - 2
                          ]
                        : null
                    }
                    attemptNumber={attemptCounts[currentQuestionIndex] || 1}
                    currentQuestionIndex={currentQuestionIndex}
                    totalQuestions={questions.length}
                    completedQuestions={completedQuestions}
                    skippedQuestions={skippedQuestions}
                    onRetry={handleStartRecording}
                    onSkipQuestion={handleSkipQuestion}
                    onNextQuestion={
                      currentQuestionIndex < questions.length - 1
                        ? handleNextQuestion
                        : undefined
                    }
                    onPreviousQuestion={
                      currentQuestionIndex > 0
                        ? () => {
                            setCurrentQuestionIndex(currentQuestionIndex - 1);
                            const prevFeedbacks =
                              questionFeedbacks[currentQuestionIndex - 1];
                            if (prevFeedbacks && prevFeedbacks.length > 0) {
                              setAnswerFeedback(
                                prevFeedbacks[prevFeedbacks.length - 1],
                              );
                            } else {
                              setAnswerFeedback(null);
                              setPhase("questions");
                            }
                          }
                        : undefined
                    }
                    onViewSummary={() => setView("summary")}
                    onStartOver={resetInterview}
                    onGoToQuestion={handleGoToQuestion}
                    domain={selectedDomain?.name}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ===========================================
// App with Provider
// ===========================================

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster
        richColors
        position="top-center"
        duration={2000}
        visibleToasts={1}
        toastOptions={{ style: { zIndex: 99999 } }}
      />
    </AuthProvider>
  );
}
