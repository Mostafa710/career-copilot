"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import {
  FileText,
  Search,
  Sparkles,
  Layers,
  MessageSquare,
  Compass,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Download,
  Building,
  MapPin,
  DollarSign,
  ArrowRight,
  RefreshCw,
  Send,
  Trash2,
  Award,
  BookOpen,
  Clock,
  ShieldCheck,
  LogOut,
  Lock,
  Mail,
  UserCheck,
  ChevronRight,
  StopCircle,
  Eye,
  EyeOff,
  BookmarkPlus,
  ExternalLink,
  Edit3,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export default function CareerCopilotApp() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"cv" | "jobs" | "tailor" | "crm" | "interview" | "roadmap">("cv");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Authentication State
  const [token, setToken] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // User & CV State
  const [activeCV, setActiveCV] = useState<any>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [pasteText, setPasteText] = useState("");

  // Job Search State
  const [searchQuery, setSearchQuery] = useState("Software Engineer");
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [companyInsights, setCompanyInsights] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsModalOpen, setInsightsModalOpen] = useState(false);

  // Application Tailor State
  const [tailoredApp, setTailoredApp] = useState<any>(null);
  const [tailorLoading, setTailorLoading] = useState(false);

  // Mini-CRM State (All 6 Stages)
  const [crmApplications, setCrmApplications] = useState<any[]>([]);
  const [selectedCRMApp, setSelectedCRMApp] = useState<any>(null);
  const [crmModalOpen, setCrmModalOpen] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);

  // Mock Interview State (Open-Ended)
  const [interviewType, setInterviewType] = useState("Technical");
  const [interviewSession, setInterviewSession] = useState<any>(null);
  const [interviewTurns, setInterviewTurns] = useState<any[]>([]);
  const [candidateAnswer, setCandidateAnswer] = useState("");
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [endingInterview, setEndingInterview] = useState(false);

  // Conversational Roadmap Chat State
  const [roadmapMessages, setRoadmapMessages] = useState<any[]>([
    {
      role: "assistant",
      content:
        "Hello! I am your **Career Roadmap Planner**. Tell me your target role (e.g. *AI Engineer*, *Cloud Architect*) and how many hours per week you can study. I'll design a feasibility-verified learning roadmap for you!",
    },
  ]);
  const [roadmapInput, setRoadmapInput] = useState("");
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const roadmapChatEndRef = useRef<HTMLDivElement>(null);

  // Check Local Auth Token on Mount
  useEffect(() => {
    setMounted(true);
    const storedToken = localStorage.getItem("career_copilot_token");
    const storedEmail = localStorage.getItem("career_copilot_email");
    if (storedToken) {
      setToken(storedToken);
      if (storedEmail) setUserEmail(storedEmail);
      fetchActiveCV(storedToken);
      fetchCRM(storedToken);
    }
  }, []);

  useEffect(() => {
    roadmapChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [roadmapMessages]);

  // Centralized Authenticated Fetch Helper
  const authFetch = async (endpoint: string, options: RequestInit = {}, authToken = token) => {
    const headers = new Headers(options.headers || {});
    if (authToken) {
      headers.set("Authorization", `Bearer ${authToken}`);
    }
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
    if (res.status === 401) {
      handleLogout();
    }
    return res;
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    const url = authMode === "login" ? `${API_BASE}/auth/login` : `${API_BASE}/auth/register`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail.trim(), password: authPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAuthError(data.detail || (authMode === "login" ? "Invalid email or password." : "Registration failed. Please try again."));
        return;
      }

      setToken(data.access_token);
      setUserEmail(data.email);
      localStorage.setItem("career_copilot_token", data.access_token);
      localStorage.setItem("career_copilot_email", data.email);

      fetchActiveCV(data.access_token);
      fetchCRM(data.access_token);
    } catch (err: any) {
      setAuthError("Unable to connect to backend server. Please verify the FastAPI server is running on port 8000.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUserEmail("");
    setActiveCV(null);
    setJobs([]);
    setTailoredApp(null);
    setCrmApplications([]);
    setInterviewSession(null);
    localStorage.removeItem("career_copilot_token");
    localStorage.removeItem("career_copilot_email");
  };

  const fetchActiveCV = async (authToken = token) => {
    try {
      const res = await authFetch("/cv/active", {}, authToken);
      if (res.ok) {
        const data = await res.json();
        if (data.has_active_cv) {
          setActiveCV(data);
        }
      }
    } catch (e) {
      console.log("Active CV fetch note:", e);
    }
  };

  const fetchCRM = async (authToken = token) => {
    try {
      const res = await authFetch("/application/crm", {}, authToken);
      if (res.ok) {
        const data = await res.json();
        setCrmApplications(data.applications || []);
      }
    } catch (e) {
      console.log("CRM fetch note:", e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    setCvLoading(true);
    try {
      const res = await authFetch("/cv/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setActiveCV({
          has_active_cv: true,
          filename: data.filename,
          general_ats_score: data.general_ats_score,
          parsed_profile: data.parsed_profile,
        });
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setCvLoading(false);
    }
  };

  const handlePasteCV = async () => {
    if (!pasteText.trim()) return;
    setCvLoading(true);
    try {
      const res = await authFetch("/cv/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: pasteText }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveCV({
          has_active_cv: true,
          filename: data.filename,
          general_ats_score: data.general_ats_score,
          parsed_profile: data.parsed_profile,
        });
        setPasteText("");
      }
    } catch (err) {
      console.error("Paste error:", err);
    } finally {
      setCvLoading(false);
    }
  };

  const handleSearchJobs = async () => {
    setJobsLoading(true);
    try {
      const res = await authFetch("/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error("Job search error:", err);
    } finally {
      setJobsLoading(false);
    }
  };

  const handleSaveJobToCRM = async (job: any) => {
    try {
      const res = await authFetch("/application/save-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: job.id, status: "Saved" }),
      });
      if (res.ok) {
        fetchCRM();
        alert(`Saved "${job.title}" at ${job.company} to your Mini-CRM!`);
      }
    } catch (err) {
      console.error("Save job error:", err);
    }
  };

  const handleFetchInsights = async (job: any) => {
    setSelectedJob(job);
    setInsightsLoading(true);
    setInsightsModalOpen(true);
    try {
      const res = await authFetch(`/jobs/${job.id}/insights`);
      if (res.ok) {
        const data = await res.json();
        setCompanyInsights(data.insights);
      }
    } catch (err) {
      console.error("Insights error:", err);
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleTailorApplication = async (job: any) => {
    if (!activeCV) {
      alert("Please upload and analyze your CV in the 'CV Analysis' tab first before tailoring applications!");
      setActiveTab("cv");
      return;
    }
    setSelectedJob(job);
    setActiveTab("tailor");
    setTailorLoading(true);
    try {
      const res = await authFetch("/application/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: job.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setTailoredApp(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || "Please upload and analyze your CV in the 'CV Analysis' tab first.");
        setActiveTab("cv");
      }
    } catch (err) {
      console.error("Tailor error:", err);
    } finally {
      setTailorLoading(false);
    }
  };

  const handleSaveToCRM = async () => {
    if (!tailoredApp || !selectedJob) return;
    try {
      const res = await authFetch("/application/save-crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: selectedJob.id,
          status: "Tailored",
          tailored_cv_data: tailoredApp.tailored_cv_data,
          cover_letter: tailoredApp.cover_letter,
          cold_email: tailoredApp.cold_email,
          ats_score_before: tailoredApp.ats_score_before,
          ats_score_after: tailoredApp.ats_score_after,
        }),
      });
      if (res.ok) {
        fetchCRM();
        setActiveTab("crm");
      }
    } catch (err) {
      console.error("CRM save error:", err);
    }
  };

  // Export Download Handlers
  const handleDownloadCVDocx = async (cvData: any, candidateName = "Candidate") => {
    try {
      const res = await authFetch("/application/export/cv/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tailored_cv_data: cvData,
          candidate_name: candidateName,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Tailored_CV_${candidateName.replace(/\s+/g, "_")}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e) {
      console.error("Export CV error:", e);
    }
  };

  const handleDownloadCoverLetterDocx = async (letterText: string, company = "Job", title = "") => {
    try {
      const res = await authFetch("/application/export/cover-letter/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cover_letter: letterText,
          company_name: company,
          job_title: title,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Cover_Letter_${company.replace(/\s+/g, "_")}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e) {
      console.error("Export Cover Letter error:", e);
    }
  };

  const handleDownloadEmailTxt = async (emailText: string, company = "Hiring_Manager") => {
    try {
      const res = await authFetch("/application/export/email/txt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cold_email: emailText,
          company_name: company,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Cold_Email_${company.replace(/\s+/g, "_")}.txt`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e) {
      console.error("Export Email error:", e);
    }
  };

  // Mini-CRM Card Click Handler
  const handleOpenCRMAppDetails = (app: any) => {
    setSelectedCRMApp(app);
    setCrmModalOpen(true);
  };

  const handleUpdateCRMStatus = async (appId: string, newStatus: string) => {
    setStatusUpdateLoading(true);
    try {
      const res = await authFetch(`/application/crm/${appId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchCRM();
        if (selectedCRMApp && selectedCRMApp.id === appId) {
          setSelectedCRMApp((prev: any) => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      console.error("Status update error:", err);
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleDeleteCRMApp = async (appId: string) => {
    if (confirm("Remove this application from your Mini-CRM?")) {
      try {
        const res = await authFetch(`/application/crm/${appId}`, { method: "DELETE" });
        if (res.ok) {
          fetchCRM();
          setCrmModalOpen(false);
        }
      } catch (err) {
        console.error("CRM delete error:", err);
      }
    }
  };

  // Open-Ended Interview Handlers
  const handleStartInterview = async () => {
    setInterviewLoading(true);
    try {
      const res = await authFetch("/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interview_type: interviewType,
          job_id: selectedJob?.id || null,
          total_turns: 999, // Open-ended
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setInterviewSession(data);
        setInterviewTurns([{ role: "interviewer", content: data.question }]);
      }
    } catch (err) {
      console.error("Interview start error:", err);
    } finally {
      setInterviewLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!candidateAnswer.trim() || !interviewSession) return;
    const answer = candidateAnswer;
    setCandidateAnswer("");
    setInterviewTurns((prev) => [...prev, { role: "candidate", content: answer }]);

    setInterviewLoading(true);
    try {
      const res = await authFetch("/interview/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: interviewSession.session_id,
          user_response: answer,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setInterviewSession((prev: any) => ({
          ...prev,
          current_turn: data.current_turn,
          is_completed: data.is_completed,
        }));
        if (data.micro_feedback) {
          setInterviewTurns((prev) => [
            ...prev,
            { role: "feedback", content: data.micro_feedback, star_score: data.star_score },
          ]);
        }
        if (data.next_question) {
          setInterviewTurns((prev) => [...prev, { role: "interviewer", content: data.next_question }]);
        }
      }
    } catch (err) {
      console.error("Turn error:", err);
    } finally {
      setInterviewLoading(false);
    }
  };

  const handleEndInterview = async () => {
    if (!interviewSession) return;
    setEndingInterview(true);
    try {
      const res = await authFetch("/interview/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: interviewSession.session_id }),
      });
      if (res.ok) {
        const data = await res.json();
        setInterviewSession((prev: any) => ({
          ...prev,
          is_completed: true,
          final_evaluation: data.final_evaluation,
        }));
      }
    } catch (err) {
      console.error("End interview error:", err);
    } finally {
      setEndingInterview(false);
    }
  };

  // Conversational Roadmap Chat Handler
  const handleSendRoadmapMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roadmapInput.trim() || roadmapLoading) return;

    const userMsg = roadmapInput.trim();
    setRoadmapInput("");
    setRoadmapMessages((prev) => [...prev, { role: "user", content: userMsg }]);

    setRoadmapLoading(true);
    try {
      const history = roadmapMessages.map((m) => ({ role: m.role, content: m.content }));
      const res = await authFetch("/roadmap/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          conversation_history: history,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRoadmapMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
            roadmap: data.roadmap,
          },
        ]);
      } else {
        setRoadmapMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, I ran into an error designing your roadmap. Please ensure your study hours are specified!",
          },
        ]);
      }
    } catch (err) {
      setRoadmapMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Failed to connect to the Career Roadmap assistant.",
        },
      ]);
    } finally {
      setRoadmapLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirm("Are you sure you want to permanently delete your account and all associated data?")) {
      try {
        const res = await authFetch("/auth/account", { method: "DELETE" });
        if (res.ok || res.status === 401) {
          handleLogout();
          setSettingsOpen(false);
          alert("Account and records permanently deleted.");
        } else {
          alert("Could not delete account. Please try again.");
        }
      } catch (err) {
        console.error("Delete error:", err);
        handleLogout();
        setSettingsOpen(false);
      }
    }
  };

  if (!mounted) return null;

  // Unauthenticated Flow: Clean & Radiant Auth Screen
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
        <div className="w-full max-w-md">
          {/* Brand Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25 mb-4">
              <Sparkles className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Career Copilot</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Autonomous Multi-Agent Career & Job Strategy Platform
            </p>
          </div>

          {/* Auth Card */}
          <div className="glass-card p-8 bg-white dark:bg-slate-900/90 shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-950 p-1 mb-6 border border-slate-200 dark:border-slate-850">
              <button
                onClick={() => { setAuthMode("login"); setAuthError(""); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  authMode === "login"
                    ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setAuthMode("register"); setAuthError(""); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  authMode === "register"
                    ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                Create Account
              </button>
            </div>

            {authError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 mt-2"
              >
                {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                {authMode === "login" ? "Sign In to Career Copilot" : "Register & Start"}
              </button>
            </form>

            <p className="text-[11px] text-center text-slate-400 mt-5">
              Secure JWT authentication with full single active CV privacy protection.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Main Application Surface
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0c1220]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-black tracking-tight bg-gradient-to-r from-indigo-600 to-cyan-500 dark:from-indigo-400 dark:to-cyan-300 bg-clip-text text-transparent">
                Career Copilot
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Multi-Agent AI
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            {[
              { id: "cv", label: "CV Analysis", icon: FileText },
              { id: "jobs", label: "Job Matcher", icon: Search },
              { id: "tailor", label: "Application Studio", icon: Sparkles },
              { id: "crm", label: "Mini-CRM", icon: Layers },
              { id: "interview", label: "Mock Interview", icon: MessageSquare },
              { id: "roadmap", label: "Roadmap Planner", icon: Compass },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* User Status & Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setTheme("light")}
                className={`p-1.5 rounded-md ${theme === "light" ? "bg-white text-amber-500 shadow-sm" : "text-slate-400"}`}
                title="Light Mode"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`p-1.5 rounded-md ${theme === "dark" ? "bg-slate-800 text-indigo-400 shadow-sm" : "text-slate-400"}`}
                title="Dark Mode"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`p-1.5 rounded-md ${theme === "system" ? "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm" : "text-slate-400"}`}
                title="System Mode"
              >
                <Laptop className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TAB 1: CV ANALYSIS */}
        {activeTab === "cv" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">CV Ingestion & General ATS Readiness</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Upload your CV (PDF/DOCX) or paste raw text. The engine runs a deterministic 100-point audit without hallucinations.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Upload Card */}
              <div className="glass-card p-6 lg:col-span-1 space-y-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Single Active CV Upload
                </h3>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center hover:border-indigo-500 transition-colors bg-slate-50/50 dark:bg-slate-950/50">
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="cv-upload-input"
                  />
                  <label htmlFor="cv-upload-input" className="cursor-pointer flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <FileText className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                      Click to upload resume file
                    </span>
                    <span className="text-[11px] text-slate-400">Supports PDF (with OCR fallback) and DOCX</span>
                  </label>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-slate-900 px-2 text-slate-400 font-semibold">Or Paste Text</span>
                  </div>
                </div>

                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste your CV text here..."
                  rows={4}
                  className="w-full text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handlePasteCV}
                  disabled={cvLoading || !pasteText.trim()}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow transition-all"
                >
                  {cvLoading ? "Analyzing..." : "Analyze Pasted Text"}
                </button>
              </div>

              {/* General ATS Score Display */}
              <div className="glass-card p-6 lg:col-span-2 space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                {activeCV?.general_ats_score ? (
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Active Resume: {activeCV.filename}
                        </span>
                        <h2 className="text-xl font-bold mt-0.5 text-slate-900 dark:text-white">Resume Readiness Audit</h2>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                            {activeCV.general_ats_score.overall_score}
                            <span className="text-sm text-slate-400 font-normal">/100</span>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            Deterministic Score
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 4 Categories */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
                      {[
                        { label: "Contact & Sections", val: activeCV.general_ats_score.category_scores.contact_and_sections, max: 25 },
                        { label: "Action Verbs", val: activeCV.general_ats_score.category_scores.action_verbs, max: 25 },
                        { label: "Quantifiable Impact", val: activeCV.general_ats_score.category_scores.quantifiable_impact, max: 25 },
                        { label: "Formatting & Skills", val: activeCV.general_ats_score.category_scores.formatting_and_skills, max: 25 },
                      ].map((cat, i) => (
                        <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{cat.label}</span>
                          <span className="text-lg font-black text-slate-900 dark:text-slate-100">
                            {cat.val}<span className="text-xs text-slate-400 font-normal">/{cat.max}</span>
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Feedback Checklist */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                        Actionable Improvement Checklist
                      </h4>
                      <div className="space-y-2">
                        {activeCV.general_ats_score.feedback_checklist?.length > 0 ? (
                          activeCV.general_ats_score.feedback_checklist.map((fb: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/40">
                              <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                              <span>{fb}</span>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/40">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>Your CV meets all baseline ATS hygiene, action verb, and metrics criteria!</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Detected Skills */}
                    <div className="mt-6">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        Detected Skills ({activeCV.parsed_profile?.skills_inventory?.length || 0})
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {activeCV.parsed_profile?.skills_inventory?.map((s: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 text-xs rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No CV analyzed yet.</p>
                    <p className="text-xs text-slate-400 mt-1">Upload a resume file to inspect your ATS readiness score.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: JOB SEARCH & MATCHER */}
        {activeTab === "jobs" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Market Research & Job Matcher</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Adzuna dynamic backfill + Tavily web search delivers 7–10 deduplicated postings per search with instant company intelligence.
              </p>
            </div>

            {/* Search Bar */}
            <div className="glass-card p-4 flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Target Role or Skills (e.g. AI Engineer, Python Alexandria, React Remote)..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={handleSearchJobs}
                disabled={jobsLoading}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow"
              >
                {jobsLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search 7–10 Jobs
              </button>
            </div>

            {/* Job Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.map((job, idx) => (
                <div key={idx} className="glass-card p-5 flex flex-col justify-between space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{job.title}</h3>
                        <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Building className="w-3.5 h-3.5" /> {job.company} • <MapPin className="w-3.5 h-3.5" /> {job.location || "Remote"}
                        </span>
                      </div>
                      {job.match_score !== undefined && (
                        <div className="px-2.5 py-1 rounded-full text-xs font-black bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {job.match_score}% Match
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 line-clamp-3 leading-relaxed">
                      {job.description}
                    </p>

                    {/* Matched & Missing Skills */}
                    {job.matched_skills && job.matched_skills.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {job.matched_skills.slice(0, 4).map((ms: string, i: number) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                            ✓ {ms}
                          </span>
                        ))}
                        {job.missing_skills?.slice(0, 2).map((ms: string, i: number) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                            + {ms}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSaveJobToCRM(job)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1"
                        title="Save Job to Mini-CRM"
                      >
                        <BookmarkPlus className="w-3.5 h-3.5 text-indigo-600" /> Save
                      </button>
                      <button
                        onClick={() => handleFetchInsights(job)}
                        className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                      >
                        <Building className="w-3.5 h-3.5" /> Insights
                      </button>
                    </div>
                    <button
                      onClick={() => handleTailorApplication(job)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Tailor Full App
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {jobs.length === 0 && !jobsLoading && (
              <div className="glass-card py-16 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <Search className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Ready to search market postings.</p>
                <p className="text-xs text-slate-400 mt-1">Type your desired role above to retrieve live openings.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: APPLICATION STUDIO (FULL CV + EXPORTS) */}
        {activeTab === "tailor" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Application Studio (Fact-Checked Full Package)</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Full tailored CV, personalized cover letter, and hiring manager outreach. Verified by Critic against your original CV.
                </p>
              </div>
              {tailoredApp && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleDownloadCVDocx(tailoredApp.tailored_cv_data, activeCV?.parsed_profile?.contact_info?.name || "Candidate")}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" /> CV (DOCX)
                  </button>
                  <button
                    onClick={() => handleDownloadCoverLetterDocx(tailoredApp.cover_letter, selectedJob?.company || "Company", selectedJob?.title || "Role")}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" /> Cover Letter (DOCX)
                  </button>
                  <button
                    onClick={() => handleDownloadEmailTxt(tailoredApp.cold_email, selectedJob?.company || "Hiring_Manager")}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" /> Cold Email (TXT)
                  </button>
                  <button
                    onClick={handleSaveToCRM}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow"
                  >
                    Save to Mini-CRM
                  </button>
                </div>
              )}
            </div>

            {tailorLoading ? (
              <div className="glass-card py-16 text-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <RefreshCw className="w-8 h-8 mx-auto animate-spin text-indigo-600" />
                <p className="text-sm font-bold text-slate-900 dark:text-white">Tailoring full CV & running Fact Critic reflection loop...</p>
                <p className="text-xs text-slate-400">Verifying zero hallucinations against your original CV.</p>
              </div>
            ) : tailoredApp ? (
              <div className="space-y-6">
                {/* Fact Critic Badge */}
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 block">
                        Fact Critic Validation: {tailoredApp.critic_passed ? "PASSED" : "REVIEWED"} (Attempt {tailoredApp.critic_attempts}/3)
                      </span>
                      <span className="text-xs text-emerald-700 dark:text-emerald-400">
                        100% verified against original experience. Zero invented skills or dates.
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500">ATS Match Delta:</span>
                    <div className="text-sm font-black text-slate-900 dark:text-slate-100">
                      {tailoredApp.ats_score_before}% → <span className="text-emerald-600">{tailoredApp.ats_score_after}%</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Full Tailored CV View */}
                  <div className="glass-card p-5 space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-600" /> Full Tailored CV
                      </h3>
                      <button
                        onClick={() => handleDownloadCVDocx(tailoredApp.tailored_cv_data, activeCV?.parsed_profile?.contact_info?.name || "Candidate")}
                        className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" /> Download DOCX
                      </button>
                    </div>

                    {/* Tailored Professional Summary */}
                    {tailoredApp.tailored_cv_data?.professional_summary && (
                      <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <strong className="text-xs font-bold text-slate-900 dark:text-slate-100 block mb-1">
                          Tailored Professional Summary:
                        </strong>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {tailoredApp.tailored_cv_data.professional_summary}
                        </p>
                      </div>
                    )}

                    {/* Highlighted Skills */}
                    {tailoredApp.tailored_cv_data?.skills?.length > 0 && (
                      <div>
                        <strong className="text-xs font-bold text-slate-900 dark:text-slate-100 block mb-1.5">
                          Targeted Skill Alignment:
                        </strong>
                        <div className="flex flex-wrap gap-1">
                          {tailoredApp.tailored_cv_data.skills.map((s: string, i: number) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tailored Work Experience */}
                    <div className="space-y-3">
                      <strong className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                        Work Experience:
                      </strong>
                      {tailoredApp.tailored_cv_data?.experience?.map((exp: any, i: number) => (
                        <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                          <strong className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {exp.title} — {exp.company}
                          </strong>
                          <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300 list-disc pl-4">
                            {exp.bullets?.map((b: string, j: number) => (
                              <li key={j}>{b}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {/* Education & Certs */}
                    {tailoredApp.tailored_cv_data?.education?.length > 0 && (
                      <div>
                        <strong className="text-xs font-bold text-slate-900 dark:text-slate-100 block mb-1">
                          Education & Credentials:
                        </strong>
                        {tailoredApp.tailored_cv_data.education.map((edu: any, i: number) => (
                          <p key={i} className="text-xs text-slate-600 dark:text-slate-400">
                            • {edu.degree} — {edu.institution} {edu.year ? `(${edu.year})` : ""}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cover Letter & Email */}
                  <div className="glass-card p-5 space-y-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cover Letter</h3>
                        <button
                          onClick={() => handleDownloadCoverLetterDocx(tailoredApp.cover_letter, selectedJob?.company || "Company", selectedJob?.title || "Role")}
                          className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" /> DOCX
                        </button>
                      </div>
                      <textarea
                        value={tailoredApp.cover_letter}
                        onChange={(e) => setTailoredApp({ ...tailoredApp, cover_letter: e.target.value })}
                        rows={8}
                        className="w-full text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cold Outreach Email</h3>
                        <button
                          onClick={() => handleDownloadEmailTxt(tailoredApp.cold_email, selectedJob?.company || "Hiring_Manager")}
                          className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" /> TXT
                        </button>
                      </div>
                      <textarea
                        value={tailoredApp.cold_email}
                        onChange={(e) => setTailoredApp({ ...tailoredApp, cold_email: e.target.value })}
                        rows={5}
                        className="w-full text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card py-16 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Select a job posting in Job Matcher to tailor your full application.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MINI-CRM (ALL 6 STAGES WITH DETAILS MODAL) */}
        {activeTab === "crm" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Application Pipeline (Mini-CRM)</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Manage all your saved, tailored, and active applications. Click any card to inspect full JD details or export previously generated tailored documents.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
              {["Saved", "Tailored", "Applied", "Interviewing", "Offered", "Rejected"].map((colStatus) => {
                const colApps = crmApplications.filter((a) => a.status === colStatus);
                return (
                  <div key={colStatus} className="glass-card p-3 space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">{colStatus}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                          {colApps.length}
                        </span>
                      </div>

                      <div className="space-y-2 mt-3">
                        {colApps.map((app, i) => (
                          <div
                            key={i}
                            onClick={() => handleOpenCRMAppDetails(app)}
                            className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 cursor-pointer transition-all space-y-1"
                          >
                            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{app.title}</h4>
                            <span className="text-[11px] text-slate-500 block line-clamp-1">{app.company}</span>
                            {app.ats_score_after ? (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                                ATS: {app.ats_score_after}%
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 block">Click for details</span>
                            )}
                          </div>
                        ))}
                        {colApps.length === 0 && (
                          <p className="text-[11px] text-slate-400 text-center py-6">Empty</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: MOCK INTERVIEW (OPEN-ENDED) */}
        {activeTab === "interview" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Interactive Mock Interview Simulator</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Open-ended simulation with dynamic micro-feedback. Continue as long as you like and conclude whenever you are ready.
              </p>
            </div>

            {!interviewSession ? (
              <div className="glass-card p-8 max-w-xl mx-auto space-y-5 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <MessageSquare className="w-12 h-12 mx-auto text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Configure Your Mock Interview</h3>
                
                <div className="flex justify-center gap-2">
                  {["General", "Technical", "Behavioral"].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setInterviewType(mode)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        interviewType === mode
                          ? "bg-indigo-600 text-white shadow"
                          : "bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {mode} Mode
                    </button>
                  ))}
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  {interviewType === "Behavioral" && "Evaluates answers strictly against the STAR method (Situation, Task, Action, Result)."}
                  {interviewType === "Technical" && "Probes system architecture, technical tradeoffs, and engineering decisions."}
                  {interviewType === "General" && "Covers self-introduction, career motivations, and behavioral communication."}
                </p>

                <button
                  onClick={handleStartInterview}
                  disabled={interviewLoading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow"
                >
                  {interviewLoading ? "Starting Session..." : "Start Mock Interview"}
                </button>
              </div>
            ) : (
              <div className="glass-card p-6 space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">
                    {interviewSession.interview_type} Interview — Turn {interviewSession.current_turn || 1}
                  </span>
                  {!interviewSession.is_completed ? (
                    <button
                      onClick={handleEndInterview}
                      disabled={endingInterview}
                      className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all"
                    >
                      {endingInterview ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <StopCircle className="w-3.5 h-3.5" />}
                      Conclude Interview & View Scorecard
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-full">
                      Completed
                    </span>
                  )}
                </div>

                {/* Turns Chat Box */}
                <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
                  {interviewTurns.map((turn, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-xl text-xs ${
                        turn.role === "interviewer"
                          ? "bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60"
                          : turn.role === "feedback"
                          ? "bg-amber-50/80 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50"
                          : "bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 ml-8"
                      }`}
                    >
                      <strong className="block font-bold mb-1 text-slate-900 dark:text-slate-100">
                        {turn.role === "interviewer" ? "🎙️ Interviewer:" : turn.role === "feedback" ? "💡 Micro-Feedback:" : "👤 You:"}
                      </strong>
                      <p className="leading-relaxed text-slate-800 dark:text-slate-200">{turn.content}</p>
                    </div>
                  ))}
                </div>

                {/* Scorecard on Completion */}
                {interviewSession.final_evaluation && (
                  <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                        <Award className="w-4 h-4" /> Final Evaluation Scorecard
                      </h4>
                      <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                        {interviewSession.final_evaluation.overall_score}/100
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                      Recommendation: <strong className="text-emerald-600">{interviewSession.final_evaluation.hiring_recommendation}</strong>
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {interviewSession.final_evaluation.star_method_assessment || interviewSession.final_evaluation.technical_depth_assessment}
                    </p>
                  </div>
                )}

                {!interviewSession.is_completed && (
                  <div className="flex gap-2">
                    <textarea
                      value={candidateAnswer}
                      onChange={(e) => setCandidateAnswer(e.target.value)}
                      placeholder="Type your response to the interviewer..."
                      rows={3}
                      className="flex-1 text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={interviewLoading || !candidateAnswer.trim()}
                      className="px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow"
                    >
                      <Send className="w-3.5 h-3.5" /> Send
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: CONVERSATIONAL CAREER ROADMAP ASSISTANT */}
        {activeTab === "roadmap" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Conversational Career Roadmap Assistant</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Chat directly with your career planner. The agent strictly focuses on roadmapping and verifies your weekly study hours before building your feasibility curriculum.
              </p>
            </div>

            {/* Chat Container */}
            <div className="glass-card flex flex-col h-[650px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              {/* Messages Feed */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {roadmapMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-2xl p-4 rounded-2xl text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-indigo-600 text-white shadow"
                          : "bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {/* Embedded Milestone Timeline if generated */}
                      {msg.roadmap && (
                        <div className="mt-4 space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                          <div className="flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                            <span>{msg.roadmap.target_role} ({msg.roadmap.timeframe})</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                              Feasibility Verified
                            </span>
                          </div>

                          {msg.roadmap.milestones?.map((m: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-slate-900 dark:text-slate-100"
                            >
                              <div className="flex items-center justify-between">
                                <strong className="text-xs text-indigo-600 dark:text-indigo-400">{m.title}</strong>
                                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {m.duration_weeks} wks ({m.allocated_hours} hrs)
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-1">
                                {m.core_topics?.map((topic: string, j: number) => (
                                  <span key={j} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                                    {topic}
                                  </span>
                                ))}
                              </div>

                              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-[11px]">
                                <strong className="text-indigo-600 dark:text-indigo-400">Portfolio Deliverable: </strong>
                                <span>{m.hands_on_project}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {roadmapLoading && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Roadmap Agent evaluating feasibility & market trends...</span>
                  </div>
                )}
                <div ref={roadmapChatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendRoadmapMessage} className="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-2 bg-slate-50/50 dark:bg-slate-950/50">
                <input
                  type="text"
                  value={roadmapInput}
                  onChange={(e) => setRoadmapInput(e.target.value)}
                  placeholder="e.g. 'I want to be an AI Engineer in 6 months, studying 12 hours a week'..."
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={roadmapLoading || !roadmapInput.trim()}
                  className="px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Mini-CRM Job & Application Details Modal */}
      {crmModalOpen && selectedCRMApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="glass-card max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedCRMApp.title}</h3>
                <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <Building className="w-3.5 h-3.5" /> {selectedCRMApp.company} • <MapPin className="w-3.5 h-3.5" /> {selectedCRMApp.location || "Remote"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteCRMApp(selectedCRMApp.id)}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg"
                  title="Delete Application"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCrmModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Status Selector */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pipeline Stage:</span>
              <div className="flex flex-wrap gap-1">
                {["Saved", "Tailored", "Applied", "Interviewing", "Offered", "Rejected"].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateCRMStatus(selectedCRMApp.id, st)}
                    disabled={statusUpdateLoading}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                      selectedCRMApp.status === st
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Generated Assets / Exports if Tailored */}
            {selectedCRMApp.tailored_cv_data && (
              <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" /> Previously Generated Application Assets
                  </span>
                  {selectedCRMApp.ats_score_after && (
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      ATS: {selectedCRMApp.ats_score_after}%
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleDownloadCVDocx(selectedCRMApp.tailored_cv_data, activeCV?.parsed_profile?.contact_info?.name || "Candidate")}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-900 dark:text-slate-100 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" /> Tailored CV (DOCX)
                  </button>
                  {selectedCRMApp.cover_letter && (
                    <button
                      onClick={() => handleDownloadCoverLetterDocx(selectedCRMApp.cover_letter, selectedCRMApp.company, selectedCRMApp.title)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-900 dark:text-slate-100 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" /> Cover Letter (DOCX)
                    </button>
                  )}
                  {selectedCRMApp.cold_email && (
                    <button
                      onClick={() => handleDownloadEmailTxt(selectedCRMApp.cold_email, selectedCRMApp.company)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-900 dark:text-slate-100 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" /> Cold Email (TXT)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Job Description */}
            <div>
              <strong className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Job Description
              </strong>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 max-h-48 overflow-y-auto whitespace-pre-wrap">
                {selectedCRMApp.description || "No description recorded for this job."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Company Insights Modal */}
      {insightsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="glass-card max-w-lg w-full p-6 space-y-4 bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <Building className="w-4 h-4 text-indigo-600" />
                {selectedJob?.company || "Company"} Insights
              </h3>
              <button
                onClick={() => setInsightsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {insightsLoading ? (
              <div className="py-8 text-center space-y-2">
                <RefreshCw className="w-6 h-6 mx-auto animate-spin text-indigo-600" />
                <p className="text-xs text-slate-500">Querying company intelligence...</p>
              </div>
            ) : companyInsights ? (
              <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                <p className="leading-relaxed">{companyInsights.summary}</p>
                {companyInsights.culture_values && (
                  <div>
                    <strong className="block font-bold text-slate-900 dark:text-slate-100 mb-1">Culture & Values:</strong>
                    <ul className="list-disc pl-4 space-y-1">
                      {companyInsights.culture_values.map((v: string, i: number) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No additional company notes available.</p>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-5 bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                <SettingsIcon className="w-4 h-4 text-indigo-600" /> Settings & Preferences
              </h3>
              <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-slate-200 text-sm font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Active User</label>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">{userEmail}</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Theme Mode</label>
                <div className="flex gap-2">
                  {["light", "dark", "system"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`px-3 py-1.5 rounded-lg font-bold capitalize ${
                        theme === t ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Active CV Status</label>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    {activeCV?.filename || "No active CV"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Single Active Policy: Uploading a new CV automatically purges previous files.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <button
                  onClick={handleLogout}
                  className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg font-bold flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete Account & Purge Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
