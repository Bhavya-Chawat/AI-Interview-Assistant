/**
 * AI Interview Assistant - Profile Component
 * Premium professional profile page with settings and performance analytics
 */

import { useState, useEffect } from "react";
import { LoadingSpinner } from "./ui/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import { toast } from "sonner";
import {
  User,
  Mail,
  Briefcase,
  Target,
  Award,
  TrendingUp,
  Save,
  Flame,
  Zap,
  Shield,
  Clock,
  CheckCircle,
  ChevronRight,
  Sparkles,
  Camera,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  target_role: string | null;
  target_industry: string | null;
  experience_level: string | null;
  total_attempts: number;
  average_score: number;
  best_score: number;
  current_streak: number;
}

const EXPERIENCE_LEVELS = [
  { value: "junior", label: "Junior (0-2 years)", icon: "🌱" },
  { value: "mid", label: "Mid-Level (2-5 years)", icon: "🚀" },
  { value: "senior", label: "Senior (5-10 years)", icon: "⭐" },
  { value: "lead", label: "Lead/Principal (10+ years)", icon: "👑" },
];

const INDUSTRIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Retail",
  "Manufacturing",
  "Consulting",
  "Government",
  "Non-profit",
  "Other",
];

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [targetIndustry, setTargetIndustry] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");

  useEffect(() => {
    fetchProfile();
  }, [user]);

  async function fetchProfile() {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setTargetRole(data.target_role || "");
        setTargetIndustry(data.target_industry || "");
        setExperienceLevel(data.experience_level || "");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      if (user) {
        const newProfile: Partial<UserProfile> = {
          id: user.id,
          email: user.email || "",
          full_name: user.user_metadata?.full_name || "",
          total_attempts: 0,
          average_score: 0,
          best_score: 0,
          current_streak: 0,
        };
        setProfile(newProfile as UserProfile);
        setFullName(newProfile.full_name || "");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!user) return;

    setSaving(true);

    try {
      const { error } = await supabase.from("users").upsert({
        id: user.id,
        email: user.email,
        full_name: fullName,
        target_role: targetRole,
        target_industry: targetIndustry,
        experience_level: experienceLevel || null,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Profile saved successfully!");
      await fetchProfile();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      if (!user) return;

      const file = event.target.files[0];
      
      // Validation
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      if (file.size > 2 * 1024 * 1024) { // 2MB
        toast.error('Image size must be less than 2MB');
        return;
      }

      setUploading(true);

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update User Profile
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Update Local State
      if (profile) {
        setProfile({ ...profile, avatar_url: publicUrl });
      } else {
        // Fallback if profile is null (shouldn't happen here but safe to check)
         setProfile({
          id: user.id,
          email: user.email || "",
          full_name: fullName,
          avatar_url: publicUrl,
          total_attempts: 0,
          average_score: 0,
          best_score: 0,
          current_streak: 0,
          experience_level: null,
          target_role: null,
          target_industry: null
        });
      }
      
      toast.success('Avatar updated successfully!');

    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  }

  // Premium Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-stone-50 dark:from-surface-900 dark:via-surface-950 dark:to-surface-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <LoadingSpinner size="xl" className="text-primary-500" />
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <User className="w-7 h-7 text-primary-500" />
            </div>
          </div>
          <p className="text-stone-600 dark:text-surface-300 font-medium">Loading your profile...</p>
          <p className="text-sm text-stone-400 dark:text-surface-500 mt-1">Just a moment</p>
        </div>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-500";
    if (score >= 60) return "text-primary-500";
    if (score >= 40) return "text-amber-500";
    return "text-stone-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "from-emerald-500/10 to-emerald-500/5";
    if (score >= 60) return "from-primary-500/10 to-primary-500/5";
    if (score >= 40) return "from-amber-500/10 to-amber-500/5";
    return "from-stone-500/10 to-stone-500/5";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-white to-stone-50 dark:from-surface-900 dark:via-surface-950 dark:to-surface-900">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-30"></div>
        
        <div className="relative max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-32 h-32 rounded-2xl bg-white/20 backdrop-blur-sm p-1 transition-transform duration-300">
                <div className="relative w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-white to-white/80 flex items-center justify-center text-4xl font-bold text-primary-600">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    fullName
                      ? fullName.charAt(0).toUpperCase()
                      : user?.email?.charAt(0).toUpperCase()
                  )}
                  
                  {/* Upload Overlay */}
                  <label 
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  >
                    <div className="bg-white/20 backdrop-blur-md p-2 rounded-full">
                      {uploading ? (
                         <LoadingSpinner size="sm" className="text-white" />
                      ) : (
                         <Camera className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white dark:bg-surface-800 rounded-xl shadow-lg flex items-center justify-center pointer-events-none">
                <Sparkles className="w-5 h-5 text-primary-500" />
              </div>
            </div>

            {/* User Info */}
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-bold text-white mb-2">
                {fullName || "Welcome!"}
              </h1>
              <p className="text-white/80 flex items-center justify-center md:justify-start gap-2">
                <Mail className="w-4 h-4" />
                {user?.email}
              </p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
                {experienceLevel && (
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {EXPERIENCE_LEVELS.find(l => l.value === experienceLevel)?.label}
                  </span>
                )}
                {targetIndustry && (
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    {targetIndustry}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Band */}
      <div className="relative -mt-6 z-10 max-w-5xl mx-auto px-6">
        <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-xl border border-stone-200/50 dark:border-surface-700/50 p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Total Sessions */}
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 dark:from-blue-500/20 dark:to-blue-500/10">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/20 mb-3">
                <Target className="w-6 h-6 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-stone-800 dark:text-white">{profile?.total_attempts || 0}</p>
              <p className="text-sm text-stone-500 dark:text-surface-400">Total Sessions</p>
            </div>

            {/* Average Score */}
            <div className={`text-center p-4 rounded-xl bg-gradient-to-br ${getScoreBg(profile?.average_score || 0)} dark:from-primary-500/20 dark:to-primary-500/10`}>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-500/20 mb-3">
                <TrendingUp className="w-6 h-6 text-primary-500" />
              </div>
              <p className={`text-3xl font-bold ${getScoreColor(profile?.average_score || 0)}`}>
                {profile?.average_score?.toFixed(0) || 0}
              </p>
              <p className="text-sm text-stone-500 dark:text-surface-400">Avg Score</p>
            </div>

            {/* Best Score */}
            <div className={`text-center p-4 rounded-xl bg-gradient-to-br ${getScoreBg(profile?.best_score || 0)} dark:from-emerald-500/20 dark:to-emerald-500/10`}>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/20 mb-3">
                <Award className="w-6 h-6 text-emerald-500" />
              </div>
              <p className={`text-3xl font-bold ${getScoreColor(profile?.best_score || 0)}`}>
                {profile?.best_score?.toFixed(0) || 0}
              </p>
              <p className="text-sm text-stone-500 dark:text-surface-400">Best Score</p>
            </div>

            {/* Streak */}
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 dark:from-orange-500/20 dark:to-orange-500/10">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-orange-500/20 mb-3">
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
              <p className="text-3xl font-bold text-orange-500">{profile?.current_streak || 0}</p>
              <p className="text-sm text-stone-500 dark:text-surface-400">Day Streak</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Left Column - Quick Actions */}
          <div className="space-y-6">
            {/* Account Status */}
            <div className="bg-white dark:bg-surface-800 rounded-2xl border border-stone-200 dark:border-surface-700 p-6">
              <h3 className="font-semibold text-stone-800 dark:text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary-500" />
                Account Status
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                  <span className="text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Email Verified
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-surface-700/50 border border-stone-200 dark:border-surface-600">
                  <span className="text-sm text-stone-600 dark:text-surface-300 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Member since
                  </span>
                  <span className="text-sm font-medium text-stone-800 dark:text-white">
                    {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Interview Preferences */}
            <div className="bg-white dark:bg-surface-800 rounded-2xl border border-stone-200 dark:border-surface-700 p-6">
              <h3 className="font-semibold text-stone-800 dark:text-white mb-4">
                Interview Settings
              </h3>
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-surface-700/50 transition-colors text-left">
                  <div>
                    <p className="text-sm font-medium text-stone-800 dark:text-white">Target Role</p>
                    <p className="text-xs text-stone-500 dark:text-surface-400">{targetRole || "Not set"}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </button>
                <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-stone-50 dark:hover:bg-surface-700/50 transition-colors text-left">
                  <div>
                    <p className="text-sm font-medium text-stone-800 dark:text-white">Difficulty</p>
                    <p className="text-xs text-stone-500 dark:text-surface-400">
                      {experienceLevel ? EXPERIENCE_LEVELS.find(l => l.value === experienceLevel)?.label : "Auto"}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Profile Form */}
          <div className="md:col-span-2">
            <div className="bg-white dark:bg-surface-800 rounded-2xl border border-stone-200 dark:border-surface-700 p-8">
              <h2 className="text-xl font-bold text-stone-800 dark:text-white mb-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-500" />
                </div>
                Personal Information
              </h2>

              <div className="space-y-6">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-surface-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 dark:bg-surface-700 border border-stone-200 dark:border-surface-600 text-stone-800 dark:text-white placeholder-stone-400 dark:placeholder-surface-500 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-surface-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 rounded-xl bg-stone-100 dark:bg-surface-900 border border-stone-200 dark:border-surface-700 text-stone-500 dark:text-surface-400 cursor-not-allowed"
                    value={user?.email || ""}
                    disabled
                  />
                  <p className="text-xs text-stone-400 dark:text-surface-500 mt-1">
                    Email cannot be changed
                  </p>
                </div>

                {/* Two Column Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Target Role */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-surface-300 mb-2">
                      Target Role
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 dark:bg-surface-700 border border-stone-200 dark:border-surface-600 text-stone-800 dark:text-white placeholder-stone-400 dark:placeholder-surface-500 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                      placeholder="e.g., Software Engineer"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                    />
                  </div>

                  {/* Industry */}
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-surface-300 mb-2">
                      Target Industry
                    </label>
                    <select
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 dark:bg-surface-700 border border-stone-200 dark:border-surface-600 text-stone-800 dark:text-white focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all"
                      value={targetIndustry}
                      onChange={(e) => setTargetIndustry(e.target.value)}
                    >
                      <option value="">Select industry</option>
                      {INDUSTRIES.map((industry) => (
                        <option key={industry} value={industry}>
                          {industry}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Experience Level */}
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-surface-300 mb-3">
                    Experience Level
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {EXPERIENCE_LEVELS.map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setExperienceLevel(level.value)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          experienceLevel === level.value
                            ? "border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400"
                            : "border-stone-200 dark:border-surface-600 hover:border-stone-300 dark:hover:border-surface-500 text-stone-600 dark:text-surface-400"
                        }`}
                      >
                        <span className="text-xl mb-1 block">{level.icon}</span>
                        <span className="text-xs font-medium">{level.value.charAt(0).toUpperCase() + level.value.slice(1)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
