/**
 * AI Interview Assistant - Auth Forms Component
 * Modern authentication forms using Shadcn UI and Supabase Auth
 */

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/Card";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "./ui/LoadingSpinner";

// Helper to convert Supabase auth errors to user-friendly messages
const parseAuthError = (message: string): string => {
  const lowerMessage = message.toLowerCase();
  
  // Login errors
  if (lowerMessage.includes("invalid login credentials") || 
      lowerMessage.includes("invalid email or password")) {
    return "Incorrect email or password. Please try again.";
  }
  if (lowerMessage.includes("user not found") || 
      lowerMessage.includes("no user found")) {
    return "No account found with this email address.";
  }
  if (lowerMessage.includes("email not confirmed")) {
    return "Please verify your email address before signing in.";
  }
  if (lowerMessage.includes("too many requests") ||
      lowerMessage.includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  
  // Registration errors
  if (lowerMessage.includes("user already registered") ||
      lowerMessage.includes("email already in use")) {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (lowerMessage.includes("password") && lowerMessage.includes("weak")) {
    return "Password is too weak. Use at least 8 characters with letters and numbers.";
  }
  if (lowerMessage.includes("invalid email")) {
    return "Please enter a valid email address.";
  }
  
  // Network errors
  if (lowerMessage.includes("network") || lowerMessage.includes("fetch")) {
    return "Connection error. Please check your internet and try again.";
  }
  
  // Default: return original if no match
  return message;
};

interface AuthFormsProps {
  initialMode?: "login" | "register";
  onSuccess?: () => void;
}

export default function AuthForms({
  initialMode = "login",
  onSuccess,
}: AuthFormsProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        console.log("Sign in result:", { error }); 
        if (error) {
          const msg = parseAuthError(error.message);
          console.log("Parsed error message:", msg);
          setError(msg);
          toast.error(msg);
        } else {
          toast.success("Welcome back!");
          onSuccess?.();
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          const msg = parseAuthError(error.message);
          setError(msg);
          toast.error(msg);
        } else {
          // Show success message for signup (email confirmation may be required)
          setError(null);
          toast.success("Account created successfully!");
          onSuccess?.();
        }
      }
    } catch (err) {
      console.error("Auth error catch block:", err);
      const msg = "An unexpected error occurred. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl">
          {mode === "login" ? "Welcome Back" : "Create Account"}
        </CardTitle>
        <CardDescription>
          {mode === "login"
            ? "Sign in to continue your interview practice"
            : "Start your journey to interview success"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-error-500/10 border border-error-500/20 text-error-500 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name (Register only) */}
          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 dark:text-surface-500" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-11"
                  required
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 dark:text-surface-500" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-11"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 dark:text-surface-500" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-11"
                required
                minLength={6}
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" className="text-white" />
                {mode === "login" ? "Signing in..." : "Creating account..."}
              </>
            ) : (
              <>
                {mode === "login" ? "Sign In" : "Create Account"}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </form>

        {/* Switch Mode */}
        <div className="mt-6 pt-6 border-t border-stone-200 dark:border-surface-700/50 text-center">
          <p className="text-sm text-stone-500 dark:text-surface-400">
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError(null);
              }}
              className="ml-2 text-primary-600 dark:text-primary-400 hover:text-primary-500 dark:hover:text-primary-300 font-medium transition-colors"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
