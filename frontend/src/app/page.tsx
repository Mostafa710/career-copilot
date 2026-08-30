"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import PublicLanding from "./components/PublicLanding";
import {
  FileText,
  User as UserIcon,
  Check,
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
  Terminal,
  Activity,
  Cpu,
  CornerDownRight,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export default function CareerCopilotApp() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = mounted && (resolvedTheme === "dark" || theme === "dark");
  const [activeTab, setActiveTab] = useState<"cv" | "jobs" | "tailor" | "crm" | "interview" | "roadmap">("cv");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Authentication State
  const [token, setToken] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register" | "verify">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [authDevCode, setAuthDevCode] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccessMsg, setAuthSuccessMsg] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [authPanelOpen, setAuthPanelOpen] = useState(false);

  // User & CV State
  const [activeCV, setActiveCV] = useState<any>(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [selectedCVFile, setSelectedCVFile] = useState<File | null>(null);
  const [cvVersions, setCvVersions] = useState<any[]>([]);
  const [cvReviewMode, setCvReviewMode] = useState<"targeted" | "general">("targeted");
  const [targetRole, setTargetRole] = useState("");
  const [targetJobDescription, setTargetJobDescription] = useState("");
  const [cvReview, setCvReview] = useState<any>(null);
  const [cvReviewLoading, setCvReviewLoading] = useState(false);
  const [cvReviewError, setCvReviewError] = useState("");
  const [suggestionDecisions, setSuggestionDecisions] = useState<Record<string, "accepted" | "ignored">>({});
  const [suggestionEdits, setSuggestionEdits] = useState<Record<string, string>>({});

  // Job Search & Matcher Modal State
  const [searchQuery, setSearchQuery] = useState("Software Engineer");
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedMatcherJob, setSelectedMatcherJob] = useState<any>(null);
  const [jobDetailsModalOpen, setJobDetailsModalOpen] = useState(false);
  const [insightsExpanded, setInsightsExpanded] = useState(false);
  const [companyInsights, setCompanyInsights] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  // Application Tailor State
  const [tailoredApp, setTailoredApp] = useState<any>(null);
  const [tailorLoading, setTailorLoading] = useState(false);

  // Mini-CRM State (All 6 Stages)
  const [crmApplications, setCrmApplications] = useState<any[]>([]);
  const [selectedCRMApp, setSelectedCRMApp] = useState<any>(null);
  const [crmModalOpen, setCrmModalOpen] = useState(false);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);

  // Mock Interview State
  const [interviewType, setInterviewType] = useState<"General" | "Technical" | "Behavioral">("Technical");
  const [interviewDomain, setInterviewDomain] = useState("Artificial Intelligence & Machine Learning");
  const [selectedInterviewJobId, setSelectedInterviewJobId] = useState<string>("");
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
        "Tell me what outcome you want. I can use your CV to plan a job search, relocation, career transition, or a learning roadmap—and I’ll ask only the next question that matters.",
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
    const storedName = localStorage.getItem("career_copilot_name");
    if (storedToken) {
      setToken(storedToken);
      if (storedEmail) setUserEmail(storedEmail);
      if (storedName) setUserName(storedName);
      fetchActiveCV(storedToken);
      fetchCVVersions(storedToken);
      fetchCRM(storedToken);
    }
  }, []);

  useEffect(() => {
    roadmapChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [roadmapMessages]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Authenticated Fetch Helper
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

  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "None", color: "bg-slate-200" };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 25, label: "Weak", color: "bg-rose-500" };
    if (score <= 3) return { score: 65, label: "Good", color: "bg-amber-500" };
    return { score: 100, label: "Strong", color: "bg-emerald-500" };
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccessMsg("");
    setAuthLoading(true);

    try {
      if (authMode === "register") {
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: authName.trim(),
            email: authEmail.trim().toLowerCase(),
            password: authPassword,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setAuthError(data.detail || "Registration failed.");
          return;
        }
        setAuthDevCode(data.dev_code || null);
        setAuthSuccessMsg(`A 6-digit verification code was sent to ${authEmail}.`);
        setAuthMode("verify");
        setResendCooldown(30);
      } else if (authMode === "login") {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identifier: authEmail.trim(), // Can be username or email
            password: authPassword,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 403 && data.detail?.code === "unverified_email") {
            setAuthEmail(data.detail.email);
            setAuthDevCode(data.detail.dev_code || null);
            setAuthSuccessMsg("Email verification is required before sign in.");
            setAuthMode("verify");
            setResendCooldown(30);
            return;
          }
          setAuthError(typeof data.detail === "string" ? data.detail : "Invalid username/email or password.");
          return;
        }

        setToken(data.access_token);
        setUserEmail(data.email);
        setUserName(data.name || "");
        localStorage.setItem("career_copilot_token", data.access_token);
        localStorage.setItem("career_copilot_email", data.email);
        if (data.name) localStorage.setItem("career_copilot_name", data.name);

        fetchActiveCV(data.access_token);
        fetchCVVersions(data.access_token);
        fetchCRM(data.access_token);
      }
    } catch (err: any) {
      setAuthError("Unable to connect to backend server. Ensure API is running on port 8000.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authCode.trim()) return;
    setAuthError("");
    setAuthLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authEmail.trim().toLowerCase(),
          code: authCode.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAuthError(data.detail || "Invalid or expired verification code.");
        return;
      }

      setToken(data.access_token);
      setUserEmail(data.email);
      setUserName(data.name || authName || "");
      localStorage.setItem("career_copilot_token", data.access_token);
      localStorage.setItem("career_copilot_email", data.email);
      if (data.name || authName) {
        localStorage.setItem("career_copilot_name", data.name || authName);
      }

      fetchActiveCV(data.access_token);
      fetchCVVersions(data.access_token);
      fetchCRM(data.access_token);
    } catch (err) {
      setAuthError("Verification failed. Please check network connection.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || !authEmail.trim()) return;
    setAuthError("");
    try {
      const res = await fetch(`${API_BASE}/auth/resend-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authEmail.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAuthDevCode(data.dev_code || null);
        setAuthSuccessMsg(`Fresh verification code sent to ${authEmail}.`);
        setResendCooldown(30);
      } else {
        setAuthError(data.detail || "Failed to resend code.");
      }
    } catch (e) {
      setAuthError("Failed to resend code.");
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUserEmail("");
    setUserName("");
    setActiveCV(null);
    setJobs([]);
    setTailoredApp(null);
    setCrmApplications([]);
    setInterviewSession(null);
    setAuthPanelOpen(false);
    localStorage.removeItem("career_copilot_token");
    localStorage.removeItem("career_copilot_email");
    localStorage.removeItem("career_copilot_name");
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
      console.log("CV fetch note:", e);
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

  const fetchCVVersions = async (authToken = token) => {
    try {
      const res = await authFetch("/cv/versions", {}, authToken);
      if (res.ok) {
        const data = await res.json();
        setCvVersions(data.versions || []);
      }
    } catch (e) {
      console.log("CV versions fetch note:", e);
    }
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setSelectedCVFile(e.target.files[0]);
  };

  const handleFileUpload = async () => {
    if (!selectedCVFile) return;
    const file = selectedCVFile;
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
        setSelectedCVFile(null);
        fetchCVVersions();
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
        fetchCVVersions();
      }
    } catch (err) {
      console.error("Paste error:", err);
    } finally {
      setCvLoading(false);
    }
  };

  const handleCVReview = async (mode = cvReviewMode) => {
    if (!activeCV) {
      setCvReviewError("Upload or paste your CV first.");
      return;
    }
    setCvReviewError("");
    setCvReviewLoading(true);
    setSuggestionDecisions({});
    try {
      const res = await authFetch("/cv/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          target_role: mode === "targeted" ? targetRole : null,
          job_description: mode === "targeted" ? targetJobDescription : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCvReviewError(typeof data.detail === "string" ? data.detail : "The review could not be completed.");
        return;
      }
      setCvReview(data);
      setSuggestionEdits(Object.fromEntries((data.suggestions || []).map((item: any) => [item.id, item.suggested_text])));
    } catch (err) {
      console.error("CV review error:", err);
      setCvReviewError("Unable to connect to the CV review service.");
    } finally {
      setCvReviewLoading(false);
    }
  };

  const copyAcceptedCorrections = async () => {
    const accepted = (cvReview?.suggestions || [])
      .filter((item: any) => suggestionDecisions[item.id] === "accepted")
      .map((item: any) => `${item.section}\n${suggestionEdits[item.id] || item.suggested_text}`)
      .join("\n\n");
    if (accepted) await navigator.clipboard.writeText(accepted);
  };

  const copyTailoredCVText = async (cvData: any) => {
    if (!cvData) return;
    const experience = (cvData.experience || []).map((exp: any) =>
      `${exp.title || ""} — ${exp.company || ""}\n${(exp.bullets || []).map((bullet: string) => `• ${bullet}`).join("\n")}`
    ).join("\n\n");
    const text = [
      cvData.professional_summary ? `PROFESSIONAL SUMMARY\n${cvData.professional_summary}` : "",
      cvData.skills?.length ? `SKILLS\n${cvData.skills.join(", ")}` : "",
      experience ? `EXPERIENCE\n${experience}` : "",
    ].filter(Boolean).join("\n\n");
    if (text) await navigator.clipboard.writeText(text);
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
        alert(`Saved "${job.title}" to Mini-CRM!`);
      }
    } catch (err) {
      console.error("Save job error:", err);
    }
  };

  const handleOpenJobDetails = (job: any, autoExpandInsights = false) => {
    setSelectedMatcherJob(job);
    setSelectedJob(job);
    setJobDetailsModalOpen(true);
    setCompanyInsights(job.company_insights || null);
    if (autoExpandInsights) {
      setInsightsExpanded(true);
      if (!job.company_insights) {
        fetchInsightsForJob(job);
      }
    } else {
      setInsightsExpanded(false);
    }
  };

  const fetchInsightsForJob = async (job: any) => {
    setInsightsLoading(true);
    try {
      const res = await authFetch(`/jobs/${job.id}/insights`);
      if (res.ok) {
        const data = await res.json();
        setCompanyInsights(data.insights);
        setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, company_insights: data.insights } : j)));
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
    setTailoredApp(null);
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
        setTailoredApp(null);
        const errData = await res.json().catch(() => ({}));
        const detail = errData.detail;
        const message = typeof detail === "string" ? detail : detail?.message;
        alert(message || "The application could not be tailored safely. Please try again.");
        if (detail?.code !== "TAILORING_FACT_CHECK_FAILED") {
          setActiveTab("cv");
        }
      }
    } catch (err) {
      console.error("Tailor error:", err);
      setTailoredApp(null);
    } finally {
      setTailorLoading(false);
    }
  };

  const handleSaveToCRM = async () => {
    if (!tailoredApp || !tailoredApp.critic_passed || !selectedJob) return;
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
          source_cv_version_id: tailoredApp.source_cv_version_id,
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

  // Mini-CRM Handlers
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
    if (confirm("Remove this application from your pipeline?")) {
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

  // Mock Interview Handlers
  const handleStartInterview = async () => {
    if ((interviewType === "Technical" || interviewType === "Behavioral") && !selectedInterviewJobId) {
      alert("Please select a target job opportunity from your Mini-CRM pipeline.");
      return;
    }
    if (interviewType === "General" && !interviewDomain.trim()) {
      alert("Please enter a target interview domain or focus field.");
      return;
    }
    setInterviewLoading(true);
    try {
      const jobId = (interviewType === "Technical" || interviewType === "Behavioral")
        ? selectedInterviewJobId
        : null;

      const res = await authFetch("/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interview_type: interviewType,
          domain: interviewType === "General" ? interviewDomain : null,
          job_id: jobId,
          total_turns: 999,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setInterviewSession(data);
        setInterviewTurns([{ role: "interviewer", content: data.question }]);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || "Failed to initialize interview.");
      }
    } catch (err) {
      console.error("Interview start error:", err);
    } finally {
      setInterviewLoading(false);
    }
  };

  const handleExitInterview = () => {
    setInterviewSession(null);
    setInterviewTurns([]);
    setCandidateAnswer("");
  };

  const handleSubmitAnswer = async () => {
    if (!candidateAnswer.trim() || !interviewSession || interviewLoading || endingInterview) return;
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
    if (!interviewSession || endingInterview) return;
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
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.detail || "Failed to conclude interview.");
      }
    } catch (err) {
      console.error("End interview error:", err);
    } finally {
      setEndingInterview(false);
    }
  };

  // Conversational Roadmap Handler
  const handleResetRoadmapChat = () => {
    if (roadmapMessages.length > 1) {
      if (!confirm("End this conversation and start a new roadmap session?")) {
        return;
      }
    }
    setRoadmapMessages([
      {
        role: "assistant",
        content:
          "Tell me what outcome you want. I can use your CV to plan a job search, relocation, career transition, or a learning roadmap—and I’ll ask only the next question that matters.",
      },
    ]);
    setRoadmapInput("");
  };

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
            suggestedReplies: data.suggested_replies || [],
          },
        ]);
      } else {
        setRoadmapMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I could not continue the plan just now. Please try that message again.",
          },
        ]);
      }
    } catch (err) {
      setRoadmapMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "ERR // Connection to Career Roadmap agent failed.",
        },
      ]);
    } finally {
      setRoadmapLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirm("Permanently delete your account and all associated data?")) {
      try {
        const res = await authFetch("/auth/account", { method: "DELETE" });
        if (res.ok || res.status === 401) {
          handleLogout();
          setSettingsOpen(false);
          alert("Account and records permanently deleted.");
        }
      } catch (err) {
        console.error("Delete error:", err);
        handleLogout();
        setSettingsOpen(false);
      }
    }
  };

  if (!mounted) return null;

  // Unauthenticated Flow: Architectural Gate Screen
  if (!token) {
    if (!authPanelOpen) {
      return (
        <PublicLanding
          onSignIn={() => {
            setAuthMode("login");
            setAuthError("");
            setAuthSuccessMsg("");
            setAuthPanelOpen(true);
          }}
          onRegister={() => {
            setAuthMode("register");
            setAuthError("");
            setAuthSuccessMsg("");
            setAuthPanelOpen(true);
          }}
        />
      );
    }

    const isDark = mounted && (resolvedTheme === "dark" || theme === "dark");
    const passStrength = calculatePasswordStrength(authPassword);

    return (
      <div className="min-h-screen bg-slate-50/70 dark:bg-[#090D16] flex flex-col items-center justify-center p-6 text-slate-900 dark:text-slate-100 transition-colors selection:bg-emerald-500 selection:text-white">
        <div className="w-full max-w-lg space-y-6">
          <button
            onClick={() => {
              setAuthPanelOpen(false);
              setAuthError("");
              setAuthSuccessMsg("");
            }}
            className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            ← Back to Career Copilot
          </button>

          {/* Brand Header */}
          <div className="text-center space-y-2.5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center p-3 mx-auto shadow-sm">
              <Image
                src="/logo.svg"
                alt="Career Copilot Sprout Logo"
                width={52}
                height={52}
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              <span>Career<span className="text-emerald-600 dark:text-emerald-400">Copilot</span></span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-mono">
              Autonomous Multi-Agent Career Strategy & Job Search Platform
            </p>
          </div>

          {/* Form Card */}
          <div className="bento-card p-8 sm:p-10 space-y-6 shadow-2xl bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800">
            {/* Mode Switcher (Hidden in verify mode) */}
            {authMode !== "verify" ? (
              <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 bg-slate-100 dark:bg-slate-900 font-mono text-xs sm:text-sm">
                <button
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError("");
                    setAuthSuccessMsg("");
                  }}
                  className={`flex-1 py-2.5 font-bold rounded-lg transition-all cursor-pointer ${
                    authMode === "login"
                      ? "bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthMode("register");
                    setAuthError("");
                    setAuthSuccessMsg("");
                  }}
                  className={`flex-1 py-2.5 font-bold rounded-lg transition-all cursor-pointer ${
                    authMode === "register"
                      ? "bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  Create Account
                </button>
              </div>
            ) : (
              <div className="text-center space-y-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  [STEP 02: EMAIL VERIFICATION]
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Verify Your Account</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  We sent a 6-digit verification code to <strong className="text-slate-800 dark:text-slate-200">{authEmail}</strong>
                </p>
              </div>
            )}

            {/* Error Message */}
            {authError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Success Message */}
            {authSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{authSuccessMsg}</span>
              </div>
            )}

            {/* MODE 1 & 2: LOGIN / REGISTER FORMS */}
            {authMode !== "verify" ? (
              <form onSubmit={handleAuthSubmit} className="space-y-4.5">
                {/* Full Name / Username (Register Only) */}
                {authMode === "register" && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 block uppercase">
                      Full Name or Username
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="e.g. Alex Hunter"
                        className="w-full pl-10 pr-3.5 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Email / Identifier */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 block uppercase">
                    {authMode === "login" ? "Email Address or Username" : "Email Address"}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type={authMode === "register" ? "email" : "text"}
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder={authMode === "login" ? "candidate@domain.com or username" : "candidate@domain.com"}
                      className="w-full pl-10 pr-3.5 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 block uppercase">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-11 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Meter (Register Mode) */}
                  {authMode === "register" && authPassword && (
                    <div className="pt-2 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400">Password Strength:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300">{passStrength.label}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${passStrength.color} transition-all duration-300 rounded-full`}
                          style={{ width: `${passStrength.score}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-mono font-bold rounded-xl shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-3 cursor-pointer"
                >
                  {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {authMode === "login" ? "Sign In →" : "Create Account & Verify →"}
                </button>
              </form>
            ) : (
              /* MODE 3: 6-DIGIT OTP VERIFICATION FORM */
              <form onSubmit={handleVerifyEmail} className="space-y-6">
                {/* Dev Mode Instant Helper */}
                {authDevCode && (
                  <div
                    onClick={() => setAuthCode(authDevCode)}
                    className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 text-xs font-mono cursor-pointer hover:bg-amber-100 transition-all text-center"
                  >
                    <span>💡 Development Test Code: </span>
                    <strong className="underline tracking-wider font-mono text-sm">{authDevCode}</strong>
                    <span className="block text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">(Click to fill automatically)</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400 block uppercase text-center">
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full py-3.5 text-center text-3xl font-mono font-black tracking-[0.4em] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading || authCode.length < 4}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-mono font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Verify & Enter Workspace →
                </button>

                <div className="pt-2 flex items-center justify-between text-xs font-mono text-slate-500">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("register");
                      setAuthError("");
                    }}
                    className="hover:underline text-slate-600 dark:text-slate-400 cursor-pointer"
                  >
                    ← Edit Details
                  </button>

                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendCooldown > 0}
                    className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Main Surface
  return (
    <div className="min-h-screen bg-white dark:bg-[#090D16] text-slate-900 dark:text-slate-100 transition-colors selection:bg-emerald-500 selection:text-white">
      {/* Top Dock Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#090D16]/95 backdrop-blur-xl">
        <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 h-20 flex items-center justify-between">
          
          {/* Brand Logo with Sprout */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center p-2 shadow-xs">
              <Image
                src="/logo.svg"
                alt="Career Copilot Sprout Logo"
                width={32}
                height={32}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  <span>Career<span className="text-emerald-600 dark:text-emerald-400">Copilot</span></span>
                </span>
                <span className="tag-mono text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> FREE
                </span>
              </div>
            </div>
          </div>

          {/* Dock Tabs with Emerald Indicators */}
          <nav className="hidden lg:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            {[
              { id: "cv", label: "01. CV Audit", icon: FileText },
              { id: "jobs", label: "02. Matcher", icon: Search },
              { id: "tailor", label: "03. Studio", icon: Sparkles },
              { id: "crm", label: "04. Mini-CRM", icon: Layers },
              { id: "interview", label: "05. Interview", icon: MessageSquare },
              { id: "roadmap", label: "06. Roadmap", icon: Compass },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`nav-pill flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Right Controls: User Name Avatar & Theme */}
          <div className="flex items-center gap-3">
            {/* User Profile Pill */}
            <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-black text-xs flex items-center justify-center">
                {(userName || userEmail || "U").charAt(0).toUpperCase()}
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-200 max-w-[140px] truncate">
                {userName || userEmail}
              </span>
              <span title="Verified User">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              </span>
            </div>

            {/* Theme Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setTheme("light")}
                className={`p-2 rounded-lg cursor-pointer transition-all ${
                  !isDark ? "bg-white text-amber-500 shadow-xs" : "text-slate-400 hover:text-slate-200"
                }`}
                title="Light Mode"
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`p-2 rounded-lg cursor-pointer transition-all ${
                  isDark ? "bg-slate-800 text-emerald-400 shadow-xs" : "text-slate-400 hover:text-slate-700"
                }`}
                title="Dark Mode"
              >
                <Moon className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 cursor-pointer"
              title="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>

            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200 dark:border-slate-800 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Surface (Widescreen Expanded View) */}
      <main className="w-full max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 py-10 space-y-12">
        {/* TAB 1: CV AUDIT */}
        {activeTab === "cv" && (
          <div className="space-y-8">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-6 space-y-2">
              <span className="tag-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
                [MODULE // 01: CV ANALYSIS & ATS AUDIT ENGINE]
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                CV Review & 100-Point Deterministic ATS Scoring
              </h2>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-normal leading-relaxed max-w-4xl">
                Audit syntax, formatting hygiene, metric density, and role keyword alignment without hallucinations. Choose between targeted job evaluation or general document health.
              </p>
            </div>

            <div className="bento-card overflow-hidden bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 shadow-xl">
              <div className="grid lg:grid-cols-[.85fr_1.15fr]">
                <div className="bg-slate-900 dark:bg-[#0D1321] p-8 sm:p-10 text-white flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <span className="text-xs font-mono font-black uppercase tracking-[.18em] text-emerald-400">Choose Scoring Context</span>
                    <h3 className="text-2xl sm:text-3xl font-black leading-tight">A useful ATS estimate needs context.</h3>
                    <p className="text-sm sm:text-base leading-relaxed text-slate-300">
                      Targeted mode compares this CV with one real job description. General mode checks document parsing health, metrics, and brevity.
                    </p>
                  </div>
                  <div className="flex rounded-2xl bg-white/10 p-1.5 text-xs sm:text-sm font-bold font-mono">
                    <button
                      onClick={() => setCvReviewMode("targeted")}
                      className={`flex-1 rounded-xl px-4 py-3.5 transition-all cursor-pointer ${
                        cvReviewMode === "targeted" ? "bg-emerald-500 text-slate-950 font-black shadow-sm" : "text-white/70 hover:text-white"
                      }`}
                    >
                      Targeted Job Fit
                    </button>
                    <button
                      onClick={() => setCvReviewMode("general")}
                      className={`flex-1 rounded-xl px-4 py-3.5 transition-all cursor-pointer ${
                        cvReviewMode === "general" ? "bg-emerald-500 text-slate-950 font-black shadow-sm" : "text-white/70 hover:text-white"
                      }`}
                    >
                      General CV Health
                    </button>
                  </div>
                </div>

                <div className="space-y-6 p-8 sm:p-10">
                  {cvReviewMode === "targeted" ? (
                    <>
                      <div className="space-y-2">
                        <label className="block text-xs sm:text-sm font-mono font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                          Specific Job Role:
                        </label>
                        <input
                          value={targetRole}
                          onChange={(e) => setTargetRole(e.target.value)}
                          placeholder="e.g. Senior Backend Engineer / AI Engineer"
                          className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-5 py-3.5 text-sm sm:text-base font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs sm:text-sm font-mono font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                          Job Description:
                        </label>
                        <textarea
                          value={targetJobDescription}
                          onChange={(e) => setTargetJobDescription(e.target.value)}
                          rows={6}
                          placeholder="Paste the full vacancy description..."
                          className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-5 text-sm sm:text-base font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 p-6 sm:p-8 text-sm sm:text-base leading-relaxed text-slate-800 dark:text-slate-200 space-y-2">
                      <strong className="block text-emerald-800 dark:text-emerald-300 font-bold uppercase text-xs sm:text-sm">
                        General CV Health Mode Active
                      </strong>
                      <p>
                        This audits parsing reliability, action verb density, measurable accomplishments, contact completeness, and page formatting.
                      </p>
                    </div>
                  )}

                  {cvReviewError && (
                    <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm font-mono text-rose-700">
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      <span>{cvReviewError}</span>
                    </div>
                  )}

                  <button
                    onClick={() => handleCVReview()}
                    disabled={cvReviewLoading || !activeCV || (cvReviewMode === "targeted" && (!targetRole.trim() || targetJobDescription.trim().length < 80))}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl bg-emerald-600 py-4.5 text-sm sm:text-base font-mono font-bold text-white hover:bg-emerald-700 disabled:opacity-40 transition-all shadow-lg shadow-emerald-600/25 cursor-pointer"
                  >
                    {cvReviewLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                    {cvReviewMode === "targeted" ? "Analyze CV Against This Vacancy →" : "Run General CV Health Audit →"}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Upload Card */}
              <div className="bento-card p-8 sm:p-10 space-y-6 lg:col-span-1 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" /> Active Resume File
                  </h3>
                  <span className="tag-mono text-xs px-2.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                    PDF / DOCX
                  </span>
                </div>

                <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 text-center hover:border-emerald-500 transition-colors bg-slate-50/50 dark:bg-slate-950/50">
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={handleFileSelection}
                    className="hidden"
                    id="cv-file-input"
                  />
                  <label htmlFor="cv-file-input" className="cursor-pointer flex flex-col items-center gap-3">
                    <FileText className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {selectedCVFile ? "Choose a different file" : "Upload Resume File"}
                    </span>
                    <span className="tag-mono text-xs text-slate-400">PDF & DOCX parsing supported</span>
                  </label>
                </div>

                {selectedCVFile && (
                  <div className="space-y-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block">{selectedCVFile.name}</span>
                        <span className="tag-mono text-xs text-slate-500">
                          {(selectedCVFile.size / 1024).toFixed(1)} KB • Ready to analyze
                        </span>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    </div>
                    <button
                      onClick={handleFileUpload}
                      disabled={cvLoading}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-mono font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                    >
                      {cvLoading ? "Analyzing your CV..." : "Analyze & Improve My CV →"}
                    </button>
                  </div>
                )}

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase font-mono">
                    <span className="bg-white dark:bg-[#111827] px-3 text-slate-400">Or Paste Text</span>
                  </div>
                </div>

                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste resume text directly..."
                  rows={4}
                  className="w-full text-xs sm:text-sm p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={handlePasteCV}
                  disabled={cvLoading || !pasteText.trim()}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-mono font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  {cvLoading ? "Analyzing..." : "Analyze Pasted Text →"}
                </button>
              </div>

              {/* Score Display Card */}
              <div className="bento-card p-8 sm:p-10 space-y-6 lg:col-span-2 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800">
                {cvLoading ? (
                  <div className="py-24 flex flex-col items-center justify-center text-center space-y-5 font-mono">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-2xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/40 flex items-center justify-center shadow-inner">
                        <RefreshCw className="w-10 h-10 animate-spin text-emerald-600" />
                      </div>
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping" />
                    </div>

                    <div className="space-y-1.5">
                      <span className="tag-mono text-xs font-bold text-emerald-600 uppercase tracking-widest block">
                        [SYS // PARSING & DETERMINISTIC EVALUATION]
                      </span>
                      <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                        Analyzing Resume Architecture
                      </h4>
                      <p className="text-sm text-slate-400">
                        Extracting sections and computing 100-point ATS compliance...
                      </p>
                    </div>
                  </div>
                ) : activeCV?.general_ats_score ? (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-3">
                      <div>
                        <span className="tag-mono text-xs font-bold text-slate-400 uppercase">
                          ACTIVE FILE: {activeCV.filename}
                        </span>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                          Readiness Score Breakdown
                        </h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-5xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                            {activeCV.general_ats_score.overall_score}
                            <span className="text-lg font-normal text-slate-400">/100</span>
                          </div>
                          <span className="tag-mono text-xs font-bold px-3 py-1 rounded-md uppercase border inline-block mt-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                            Tier: {activeCV.general_ats_score.rating_tier || "Standard"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 5 Standardized Sub-Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                      {[
                        { label: "Parseability", weight: "30%", val: activeCV.general_ats_score.category_scores?.parseability ?? 100 },
                        { label: "Action Impact", weight: "25%", val: activeCV.general_ats_score.category_scores?.action_impact ?? 85 },
                        { label: "Quantification", weight: "20%", val: activeCV.general_ats_score.category_scores?.quantification ?? 70 },
                        { label: "Contact Hygiene", weight: "15%", val: activeCV.general_ats_score.category_scores?.contact_hygiene ?? 100 },
                        { label: "Brevity & Format", weight: "10%", val: activeCV.general_ats_score.category_scores?.brevity_formatting ?? 90 },
                      ].map((cat, i) => (
                        <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                          <div>
                            <span className="tag-mono text-xs text-slate-500 uppercase block font-bold">{cat.label}</span>
                            <span className="tag-mono text-[10px] text-emerald-600 block">Weight: {cat.weight}</span>
                          </div>
                          <span className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-2">
                            {cat.val}<span className="text-xs text-slate-400 font-normal">/100</span>
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Feedback Checklist */}
                    <div>
                      <h4 className="tag-mono text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-3">
                        Improvement Action Items
                      </h4>
                      <div className="space-y-2.5">
                        {activeCV.general_ats_score.feedback_checklist?.length > 0 ? (
                          activeCV.general_ats_score.feedback_checklist.map((fb: string, i: number) => (
                            <div key={i} className="flex items-start gap-3 text-xs sm:text-sm font-mono text-amber-800 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/40">
                              <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                              <span>{fb}</span>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center gap-3 text-xs sm:text-sm font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            <span>100% ATS hygiene criteria satisfied.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Extracted Skills */}
                    <div>
                      <h4 className="tag-mono text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-3">
                        Detected Skills Inventory ({activeCV.parsed_profile?.skills_inventory?.length || 0})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {activeCV.parsed_profile?.skills_inventory?.map((s: string, i: number) => (
                          <span key={i} className="tag-mono text-xs px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-24 text-center text-slate-400 font-mono text-xs sm:text-sm">
                    <FileText className="w-14 h-14 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                    <p className="font-bold text-slate-700 dark:text-slate-300 text-base">NO CV PROFILE LOADED</p>
                    <p className="text-slate-400 mt-1">Upload a resume to initialize the ATS scoring pipeline.</p>
                  </div>
                )}
              </div>
            </div>

            {cvReview && (
              <div className="bento-card p-8 sm:p-10 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 space-y-6">
                <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{cvReview.scope_label}</span>
                    <h3 className="mt-1.5 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Problems Paired with Controlled Corrections</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">{cvReview.disclaimer}</p>
                  </div>
                  {cvReview.target_match && (
                    <div className="min-w-36 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-5 text-right text-slate-900 dark:text-white">
                      <span className="block text-4xl font-black font-mono text-emerald-600 dark:text-emerald-400">{cvReview.target_match.match_score ?? "N/A"}%</span>
                      <span className="text-xs font-mono font-bold uppercase">Target Match</span>
                      <span className="mt-1 block text-xs text-slate-500">{cvReview.target_match.score_confidence} Confidence</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {(cvReview.suggestions || []).length ? cvReview.suggestions.map((item: any) => {
                    const decision = suggestionDecisions[item.id];
                    return (
                      <article key={item.id} className={`rounded-2xl border p-6 transition-all ${decision === "accepted" ? "border-emerald-300 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20" : decision === "ignored" ? "border-slate-200 opacity-60 dark:border-slate-800" : "border-slate-200 dark:border-slate-800"}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-mono font-bold uppercase text-slate-600 dark:text-slate-300">{item.section}</span>
                            <span className="text-base font-bold text-slate-900 dark:text-white">{item.category}</span>
                          </div>
                          {item.requires_confirmation && <span className="rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 px-3 py-1 text-xs font-mono font-bold">Confirm evidence before use</span>}
                        </div>
                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                          <div className="rounded-xl border border-red-100 bg-red-50 p-4.5 dark:border-red-950 dark:bg-red-950/20">
                            <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-600">Current CV / Missing Evidence</span>
                            <p className="mt-2 text-xs sm:text-sm font-mono leading-relaxed text-red-950 dark:text-red-100">{item.source_text}</p>
                          </div>
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4.5 dark:border-emerald-950 dark:bg-emerald-950/20">
                            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-700">Suggested Correction / Action</span>
                            <textarea value={suggestionEdits[item.id] ?? item.suggested_text} onChange={(e) => setSuggestionEdits((prev) => ({ ...prev, [item.id]: e.target.value }))} rows={3} className="mt-2 w-full resize-y bg-transparent text-xs sm:text-sm font-mono leading-relaxed text-emerald-950 outline-none dark:text-emerald-100" />
                          </div>
                        </div>
                        <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-500">{item.rationale}</p>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button onClick={() => setSuggestionDecisions((prev) => ({ ...prev, [item.id]: "accepted" }))} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-mono font-bold text-white hover:bg-emerald-700 transition-all cursor-pointer">{item.requires_confirmation ? "I verified / keep in draft" : "Accept into draft"}</button>
                          <button onClick={() => setSuggestionDecisions((prev) => ({ ...prev, [item.id]: "ignored" }))} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-all cursor-pointer">Ignore</button>
                          <button onClick={() => navigator.clipboard.writeText(suggestionEdits[item.id] || item.suggested_text)} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition-all cursor-pointer">Copy</button>
                        </div>
                      </article>
                    );
                  }) : <div className="rounded-2xl bg-emerald-50 p-6 text-sm text-emerald-800 font-mono">No source-linked corrections were found in the parsed CV.</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: JOB MATCHER */}
        {activeTab === "jobs" && (
          <div className="space-y-8">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-6 space-y-2">
              <span className="tag-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
                [MODULE // 02: MARKET RADAR & HYBRID JOB MATCHING]
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                Verified Vacancy Opportunities & Semantic Fit Engine
              </h2>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-normal leading-relaxed max-w-4xl">
                Search real, individual job postings filtered against generic job-board category lists. Each vacancy is semantically evaluated across a 5-factor fit model matching your active resume.
              </p>
            </div>

            {/* Search Bar */}
            <div className="bento-card p-5 sm:p-6 flex flex-col sm:flex-row gap-4 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 shadow-lg">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Target Role or Skills (e.g. AI Engineer, Python, React, Cloud Remote)..."
                  className="w-full pl-12 pr-4 py-3.5 text-sm sm:text-base rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                onClick={handleSearchJobs}
                disabled={jobsLoading}
                className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm sm:text-base font-mono font-bold rounded-2xl flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer shrink-0"
              >
                {jobsLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                Execute Search →
              </button>
            </div>

            {/* Job Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {!jobsLoading && jobs.length === 0 && (
                <div className="bento-card col-span-full p-16 text-center bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 space-y-3">
                  <Search className="mx-auto h-12 w-12 text-emerald-600" />
                  <h3 className="text-lg font-black">Search for individual vacancies</h3>
                  <p className="text-sm text-slate-500 font-mono">Type a target role above to pull real verified job postings.</p>
                </div>
              )}
              {jobs.map((job, idx) => (
                <div
                  key={idx}
                  className="bento-card p-8 flex flex-col justify-between space-y-5 hover:border-emerald-500/50 transition-all cursor-pointer group bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800"
                  onClick={() => handleOpenJobDetails(job)}
                >
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {job.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="tag-mono text-xs px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border border-slate-200 dark:border-slate-700">
                            {job.source ? `[${job.source.toUpperCase()}]` : "[RADAR]"}
                          </span>
                          <span className="tag-mono text-xs text-slate-500 flex items-center gap-1">
                            <Building className="w-3.5 h-3.5" /> {job.company} • <MapPin className="w-3.5 h-3.5" /> {job.location || "Remote"}
                          </span>
                        </div>
                      </div>
                      {job.match_score != null ? (
                        <div className="tag-mono px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                          {job.match_score}% MATCH
                        </div>
                      ) : null}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-4 line-clamp-3 leading-relaxed font-mono">
                      {job.description}
                    </p>
                  </div>

                  <div
                    className="flex items-center justify-between pt-5 border-t border-slate-100 dark:border-slate-800 gap-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2 font-mono text-xs sm:text-sm">
                      <button
                        onClick={() => handleSaveJobToCRM(job)}
                        className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer"
                        title="Save Job to Mini-CRM"
                      >
                        <BookmarkPlus className="w-4 h-4 text-emerald-600" /> Save
                      </button>
                    </div>
                    <button
                      onClick={() => handleTailorApplication(job)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-mono font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" /> Tailor Application →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: APPLICATION STUDIO */}
        {activeTab === "tailor" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-6 gap-4">
              <div className="space-y-2">
                <span className="tag-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
                  [MODULE // 03: MULTI-AGENT FACT STUDIO]
                </span>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                  Fact-Checked Tailored Resume & Document Suite
                </h2>
                <p className="text-base text-slate-600 dark:text-slate-400">
                  Dual-pass Critic loop verifies zero hallucinations before generating ATS-optimized resumes, cover letters, and outreach emails.
                </p>
              </div>
              {tailoredApp?.critic_passed && (
                <div className="flex flex-wrap items-center gap-3 font-mono text-xs sm:text-sm">
                  <button
                    onClick={() => handleDownloadCVDocx(tailoredApp.tailored_cv_data, activeCV?.parsed_profile?.contact_info?.name || "Candidate")}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-600" /> CV (DOCX)
                  </button>
                  <button
                    onClick={() => handleDownloadCoverLetterDocx(tailoredApp.cover_letter, selectedJob?.company || "Company", selectedJob?.title || "Role")}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-600" /> Letter (DOCX)
                  </button>
                  {tailoredApp.cold_email && (
                    <button
                      onClick={() => handleDownloadEmailTxt(tailoredApp.cold_email, selectedJob?.company || "Hiring_Manager")}
                      className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-emerald-600" /> Email (TXT)
                    </button>
                  )}
                  <button
                    onClick={handleSaveToCRM}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    Save to CRM →
                  </button>
                </div>
              )}
            </div>

            {tailorLoading ? (
              <div className="bento-card py-24 text-center space-y-4 font-mono bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800">
                <RefreshCw className="w-12 h-12 mx-auto animate-spin text-emerald-600" />
                <p className="text-lg font-bold text-slate-900 dark:text-white">GENERATING FULL CV & FACT CRITIC LOOP...</p>
                <p className="text-sm text-slate-400">Verifying zero hallucinations against candidate profile.</p>
              </div>
            ) : tailoredApp ? (
              <div className="space-y-8">
                {/* Fact Critic Badge */}
                <div className={`p-6 rounded-2xl border flex items-center justify-between ${tailoredApp.critic_passed ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60" : "bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900/60"}`}>
                  <div className="flex items-center gap-4">
                    <ShieldCheck className={`w-7 h-7 ${tailoredApp.critic_passed ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`} />
                    <div>
                      <span className={`tag-mono text-xs sm:text-sm font-bold block ${tailoredApp.critic_passed ? "text-emerald-900 dark:text-emerald-200" : "text-red-900 dark:text-red-200"}`}>
                        FACT CRITIC: {tailoredApp.critic_passed ? "PASSED" : "FAILED — MANUAL REVIEW REQUIRED"} (ATTEMPT {tailoredApp.critic_attempts}/3)
                      </span>
                      <span className={`text-xs sm:text-sm ${tailoredApp.critic_passed ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                        {tailoredApp.critic_passed
                          ? "Verified against the complete candidate profile, including skills, letter, and email."
                          : "This content is not verified and cannot be saved or exported automatically."}
                      </span>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-xs text-slate-500 block font-bold">ATS MATCH GAIN:</span>
                    <div className="text-lg font-black text-slate-900 dark:text-slate-100">
                      {tailoredApp.ats_score_before != null ? `${tailoredApp.ats_score_before}%` : "N/A"} →{" "}
                      <span className="text-emerald-600 font-bold">
                        {tailoredApp.ats_score_after != null ? `${tailoredApp.ats_score_after}%` : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Full Tailored CV */}
                  <div className="bento-card p-8 sm:p-10 space-y-6 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                      <h3 className="tag-mono text-sm font-bold text-slate-600 dark:text-slate-400 uppercase flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600" /> Full Tailored Resume
                      </h3>
                      <button onClick={() => copyTailoredCVText(tailoredApp.tailored_cv_data)} className="tag-mono text-xs sm:text-sm font-bold text-emerald-600 hover:underline cursor-pointer">Copy CV Text</button>
                    </div>

                    {tailoredApp.tailored_cv_data?.professional_summary && (
                      <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                        <strong className="tag-mono text-xs font-bold text-slate-700 dark:text-slate-300 block uppercase">
                          Targeted Professional Summary:
                        </strong>
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
                          {tailoredApp.tailored_cv_data.professional_summary}
                        </p>
                      </div>
                    )}

                    {tailoredApp.tailored_cv_data?.skills?.length > 0 && (
                      <div>
                        <strong className="tag-mono text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2 uppercase">
                          Emphasized Technical Skills:
                        </strong>
                        <div className="flex flex-wrap gap-2">
                          {tailoredApp.tailored_cv_data.skills.map((s: string, i: number) => (
                            <span key={i} className="tag-mono text-xs px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      <strong className="tag-mono text-xs font-bold text-slate-700 dark:text-slate-300 block uppercase">
                        Tailored Experience:
                      </strong>
                      {tailoredApp.tailored_cv_data?.experience?.map((exp: any, i: number) => (
                        <div key={i} className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                          <strong className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                            {exp.title} — {exp.company}
                          </strong>
                          <ul className="mt-2 space-y-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 list-disc pl-5 font-mono">
                            {exp.bullets?.map((b: string, j: number) => (
                              <li key={j}>{b}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Letter & Outreach Email */}
                  <div className="bento-card p-8 sm:p-10 space-y-6 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h3 className="tag-mono text-sm font-bold text-slate-600 dark:text-slate-400 uppercase">Cover Letter</h3>
                        <button onClick={() => navigator.clipboard.writeText(tailoredApp.cover_letter || "")} className="tag-mono text-xs sm:text-sm font-bold text-emerald-600 hover:underline cursor-pointer">Copy</button>
                      </div>
                      <textarea
                        value={tailoredApp.cover_letter}
                        onChange={(e) => setTailoredApp({ ...tailoredApp, cover_letter: e.target.value })}
                        rows={10}
                        className="w-full text-xs sm:text-sm p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h3 className="tag-mono text-sm font-bold text-slate-600 dark:text-slate-400 uppercase">Cold Outreach Email</h3>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleDownloadEmailTxt(tailoredApp.cold_email, selectedJob?.company || "Hiring_Manager")}
                            className="tag-mono text-xs sm:text-sm font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> Download (.txt)
                          </button>
                          <button onClick={() => navigator.clipboard.writeText(tailoredApp.cold_email || "")} className="tag-mono text-xs sm:text-sm font-bold text-emerald-600 hover:underline cursor-pointer">Copy</button>
                        </div>
                      </div>
                      <textarea
                        value={tailoredApp.cold_email}
                        onChange={(e) => setTailoredApp({ ...tailoredApp, cold_email: e.target.value })}
                        rows={7}
                        className="w-full text-xs sm:text-sm p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bento-card py-24 text-center text-slate-400 font-mono text-xs sm:text-sm bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 space-y-2">
                <Sparkles className="w-14 h-14 mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                <p className="font-bold text-slate-700 dark:text-slate-300 text-base">SELECT A JOB POSTING</p>
                <p className="text-slate-400">Open Job Matcher and click &apos;Tailor App&apos; to generate documents.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MINI-CRM */}
        {activeTab === "crm" && (
          <div className="space-y-8">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-6 space-y-2">
              <span className="tag-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
                [MODULE // 04: PIPELINE CRM & APPLICATION TRACKER]
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                6-Stage Autonomous Application Pipeline
              </h2>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-normal leading-relaxed max-w-4xl">
                Track opportunities seamlessly across Saved, Tailored, Applied, Interviewing, Offered, and Rejected stages.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {["Saved", "Tailored", "Applied", "Interviewing", "Offered", "Rejected"].map((colStatus) => {
                const colApps = crmApplications.filter((a) => a.status === colStatus);
                return (
                  <div key={colStatus} className="bento-card p-5 space-y-4 flex flex-col justify-between bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800">
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                        <span className="tag-mono text-xs font-bold uppercase text-slate-700 dark:text-slate-300">{colStatus}</span>
                        <span className="tag-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {colApps.length}
                        </span>
                      </div>

                      <div className="space-y-3 mt-4">
                        {colApps.map((app, i) => (
                          <div
                            key={i}
                            onClick={() => handleOpenCRMAppDetails(app)}
                            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 cursor-pointer transition-all space-y-1.5"
                          >
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{app.title}</h4>
                            <span className="tag-mono text-xs text-slate-500 block line-clamp-1">{app.company}</span>
                            {app.ats_score_after && (
                              <span className="tag-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                                ATS: {app.ats_score_after}%
                              </span>
                            )}
                          </div>
                        ))}
                        {colApps.length === 0 && (
                          <p className="tag-mono text-xs text-slate-400 text-center py-10">-- EMPTY --</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: MOCK INTERVIEW */}
        {activeTab === "interview" && (
          <div className="space-y-8">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-6 space-y-2">
              <span className="tag-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
                [MODULE // 05: STATEFUL INTERVIEW SIMULATOR]
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                Technical & Behavioral Mock Interview Simulator
              </h2>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-normal leading-relaxed max-w-4xl">
                Practice real-time interactive interview scenarios tailored to your saved jobs with turn-by-turn STAR scoring.
              </p>
            </div>

            {!interviewSession ? (
              <div className="bento-card p-10 sm:p-12 max-w-2xl mx-auto space-y-7 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 shadow-2xl">
                <div className="text-center space-y-2">
                  <MessageSquare className="w-12 h-12 mx-auto text-emerald-600" />
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Configure Interview Protocol</h3>
                  <p className="tag-mono text-xs sm:text-sm text-slate-500">Select focus mode and target parameters.</p>
                </div>
                
                {/* Mode Selector */}
                <div className="flex border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 bg-slate-50 dark:bg-slate-950 font-mono text-xs sm:text-sm">
                  {(["General", "Technical", "Behavioral"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setInterviewType(mode)}
                      className={`flex-1 py-3 font-bold rounded-xl transition-all cursor-pointer ${
                        interviewType === mode
                          ? "bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-xs font-black"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {interviewType === "General" && (
                  <div className="text-left space-y-2">
                    <label className="tag-mono text-xs font-bold uppercase text-slate-700 dark:text-slate-300 block">
                      Target Interview Domain / Focus Field:
                    </label>
                    <input
                      type="text"
                      value={interviewDomain}
                      onChange={(e) => setInterviewDomain(e.target.value)}
                      placeholder="e.g. Machine Learning, Backend Engineering, Cloud Architecture..."
                      className="w-full text-xs sm:text-sm p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                {(interviewType === "Technical" || interviewType === "Behavioral") && (
                  <div className="text-left space-y-2">
                    <label className="tag-mono text-xs font-bold uppercase text-slate-700 dark:text-slate-300 block">
                      Target Job Opportunity (from Mini-CRM Pipeline):
                    </label>
                    {crmApplications.length > 0 ? (
                      <select
                        value={selectedInterviewJobId}
                        onChange={(e) => setSelectedInterviewJobId(e.target.value)}
                        className="w-full text-xs sm:text-sm p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">-- Select Mini-CRM Opportunity ({crmApplications.length} Available) --</option>
                        {crmApplications.map((app) => (
                          <option key={app.id} value={app.job_id}>
                            {app.title} — {app.company} [{app.status}]
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs sm:text-sm font-mono flex items-center justify-between">
                        <span>No jobs saved in Mini-CRM yet.</span>
                        <button
                          type="button"
                          onClick={() => setActiveTab("jobs")}
                          className="font-bold underline hover:text-amber-900 dark:hover:text-amber-100 cursor-pointer"
                        >
                          Find & Save Jobs →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleStartInterview}
                  disabled={
                    interviewLoading ||
                    (interviewType === "General"
                      ? !interviewDomain.trim()
                      : !selectedInterviewJobId)
                  }
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-mono font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  {interviewLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Terminal className="w-5 h-5" />}
                  Initialize Interview Session →
                </button>
              </div>
            ) : (
              <div className="bento-card p-8 sm:p-10 space-y-6 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
                  <span className="tag-mono text-xs sm:text-sm font-bold uppercase text-emerald-600 dark:text-emerald-400">
                    [INTERVIEW // {interviewSession.interview_type} — TURN {interviewSession.current_turn || 1}]
                  </span>
                  <div className="flex items-center gap-2.5 font-mono text-xs sm:text-sm">
                    {!interviewSession.is_completed ? (
                      <button
                        onClick={handleEndInterview}
                        disabled={endingInterview}
                        className="px-4 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-bold rounded-xl flex items-center gap-2 cursor-pointer"
                      >
                        {endingInterview ? <RefreshCw className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />}
                        Conclude & Scorecard
                      </button>
                    ) : (
                      <span className="tag-mono text-xs sm:text-sm font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-3.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        COMPLETED
                      </span>
                    )}
                    <button
                      onClick={handleExitInterview}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" /> Exit
                    </button>
                  </div>
                </div>

                {/* Conversation Transcript */}
                <div className="space-y-4 max-h-[520px] overflow-y-auto pr-2">
                  {interviewTurns.map((turn, i) => (
                    <div
                      key={i}
                      className={`p-5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        turn.role === "interviewer"
                          ? "bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
                          : turn.role === "feedback"
                          ? "bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50"
                          : "bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 ml-6 sm:ml-12"
                      }`}
                    >
                      <strong className="tag-mono block font-bold mb-2 uppercase text-slate-900 dark:text-slate-100 text-xs">
                        {turn.role === "interviewer" ? "[INTERVIEWER]" : turn.role === "feedback" ? "[MICRO-FEEDBACK]" : "[CANDIDATE]"}
                      </strong>
                      <p className="text-slate-800 dark:text-slate-200 font-mono">{turn.content}</p>
                    </div>
                  ))}
                </div>

                {/* Scorecard */}
                {interviewSession.final_evaluation && (
                  <div className="p-7 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="tag-mono text-sm sm:text-base font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                        <Award className="w-5 h-5 text-emerald-600" /> [FINAL EVALUATION SCORECARD]
                      </h4>
                      <span className="font-mono text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">
                        {interviewSession.final_evaluation.overall_score}/100
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-mono text-slate-700 dark:text-slate-300">
                      Recommendation: <strong className="text-emerald-600 uppercase font-bold">{interviewSession.final_evaluation.hiring_recommendation}</strong>
                    </p>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
                      {interviewSession.final_evaluation.star_method_assessment || interviewSession.final_evaluation.technical_depth_assessment}
                    </p>
                  </div>
                )}

                {!interviewSession.is_completed && (
                  <div className="flex gap-3">
                    <textarea
                      value={candidateAnswer}
                      onChange={(e) => setCandidateAnswer(e.target.value)}
                      placeholder={endingInterview ? "Concluding interview and compiling scorecard..." : "Type response to interviewer..."}
                      disabled={interviewLoading || endingInterview}
                      rows={3}
                      className="flex-1 text-xs sm:text-sm p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                    />
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={interviewLoading || endingInterview || !candidateAnswer.trim()}
                      className="px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-mono font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <Send className="w-4 h-4" /> Send
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: ROADMAP PLANNER */}
        {activeTab === "roadmap" && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-6 gap-4">
              <div className="space-y-2">
                <span className="tag-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
                  [MODULE // 06: CAREER STRATEGY & ROADMAP COACH]
                </span>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
                  Conversational Career Strategy & Learning Roadmap
                </h2>
                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-normal leading-relaxed max-w-4xl">
                  Explore role transitions, international visa paths, salary benchmarks, and step-by-step milestone projects.
                </p>
              </div>
              <button
                onClick={handleResetRoadmapChat}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold font-mono text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 shadow-xs shrink-0 cursor-pointer self-start sm:self-center"
                title="End current chat and start a new conversation"
              >
                <LogOut className="w-4 h-4 text-rose-500" /> End Chat / New Session
              </button>
            </div>

            <div className="bento-card flex flex-col h-[750px] bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 shadow-xl">
              {/* Chat Session Top Bar */}
              <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-950/50 rounded-t-2xl">
                <span className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300">
                  <Activity className="w-4 h-4 text-emerald-600" /> Interactive Career Coach
                </span>
                {roadmapMessages.length > 1 && (
                  <button
                    onClick={handleResetRoadmapChat}
                    className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" /> End Chat
                  </button>
                )}
              </div>

              {/* Messages Feed */}
              <div className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-5">
                {roadmapMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-4xl p-5 sm:p-6 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-emerald-600 text-white font-mono shadow-md"
                          : "bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <p className="whitespace-pre-wrap font-mono">{msg.content}</p>
                      ) : (
                        <div className="space-y-3 prose dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              table: ({ node, ...props }) => (
                                <div className="my-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                                  <table className="w-full text-left border-collapse text-xs" {...props} />
                                </div>
                              ),
                              thead: ({ node, ...props }) => (
                                <thead className="bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold" {...props} />
                              ),
                              th: ({ node, ...props }) => (
                                <th className="p-3 border-b border-slate-200 dark:border-slate-800 font-mono text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400" {...props} />
                              ),
                              td: ({ node, ...props }) => (
                                <td className="p-3 border-b border-slate-100 dark:border-slate-900/60 align-top" {...props} />
                              ),
                              h3: ({ node, ...props }) => (
                                <h3 className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 mt-4 mb-2 font-mono flex items-center gap-2" {...props} />
                              ),
                              h4: ({ node, ...props }) => (
                                <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mt-3 mb-1" {...props} />
                              ),
                              p: ({ node, ...props }) => (
                                <p className="mb-2.5 last:mb-0" {...props} />
                              ),
                              ul: ({ node, ...props }) => (
                                <ul className="list-disc pl-5 space-y-1.5 mb-2.5" {...props} />
                              ),
                              ol: ({ node, ...props }) => (
                                <ol className="list-decimal pl-5 space-y-1.5 mb-2.5" {...props} />
                              ),
                              li: ({ node, ...props }) => (
                                <li className="leading-relaxed" {...props} />
                              ),
                              hr: ({ node, ...props }) => (
                                <hr className="border-slate-200 dark:border-slate-800 my-4" {...props} />
                              ),
                              a: ({ node, ...props }) => (
                                <a target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 underline font-medium hover:opacity-80" {...props} />
                              ),
                              strong: ({ node, ...props }) => (
                                <strong className="font-semibold text-slate-900 dark:text-white" {...props} />
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}

                      {msg.roadmap && (
                        <div className="mt-4 space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                          <div className="flex items-center justify-between tag-mono text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            <span>{msg.roadmap.target_role} ({msg.roadmap.timeframe})</span>
                            <span className="px-3 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                              FEASIBILITY VERIFIED
                            </span>
                          </div>

                          {msg.roadmap.milestones?.map((m: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-4 sm:p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5"
                            >
                              <div className="flex items-center justify-between">
                                <strong className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-mono font-bold">{m.title}</strong>
                                <span className="tag-mono text-xs text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" /> {m.duration_weeks} wks ({m.allocated_hours} hrs)
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {m.core_topics?.map((topic: string, j: number) => (
                                  <span key={j} className="tag-mono text-xs px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                                    {topic}
                                  </span>
                                ))}
                              </div>

                              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-mono">
                                <strong className="tag-mono text-emerald-600 dark:text-emerald-400 uppercase">Deliverable: </strong>
                                <span>{m.hands_on_project}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {msg.suggestedReplies?.length > 0 && (
                        <div className="mt-3.5 flex flex-wrap gap-2 border-t border-slate-200 pt-3.5 dark:border-slate-800">
                          {msg.suggestedReplies.map((reply: string) => (
                            <button key={reply} onClick={() => setRoadmapInput(reply)} className="rounded-full border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-4 py-2 text-xs sm:text-sm font-bold font-mono text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 cursor-pointer transition-all">{reply}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {roadmapLoading && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-mono text-slate-400 p-3">
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>SYS // Evaluating feasibility against market trends...</span>
                  </div>
                )}
                <div ref={roadmapChatEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendRoadmapMessage} className="p-5 sm:p-6 border-t border-slate-200 dark:border-slate-800 flex gap-3 bg-slate-50/50 dark:bg-slate-950/50">
                <input
                  type="text"
                  value={roadmapInput}
                  onChange={(e) => setRoadmapInput(e.target.value)}
                  placeholder="Try: 'I want a job in UK' or 'Help me become an AI Engineer'..."
                  className="flex-1 text-sm sm:text-base px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={roadmapLoading || !roadmapInput.trim()}
                  className="px-8 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-mono font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" /> Send
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Mini-CRM Modal */}
      {crmModalOpen && selectedCRMApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bento-card max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8 space-y-6 shadow-2xl bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800">
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{selectedCRMApp.title}</h3>
                <span className="tag-mono text-xs sm:text-sm text-slate-500 flex items-center gap-1.5 mt-1">
                  <Building className="w-4 h-4" /> {selectedCRMApp.company} • <MapPin className="w-4 h-4" /> {selectedCRMApp.location || "Remote"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteCRMApp(selectedCRMApp.id)}
                  className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                  title="Delete Application"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCrmModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Stage Selector */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="tag-mono text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Stage:</span>
              <div className="flex flex-wrap gap-1.5 font-mono text-xs sm:text-sm">
                {["Saved", "Tailored", "Applied", "Interviewing", "Offered", "Rejected"].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateCRMStatus(selectedCRMApp.id, st)}
                    disabled={statusUpdateLoading}
                    className={`px-3.5 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                      selectedCRMApp.status === st
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Untailored CTA or Generated Tailored Assets */}
            {!selectedCRMApp.tailored_cv_data ? (
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <span className="tag-mono text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 uppercase">
                    <Sparkles className="w-4 h-4 text-emerald-600" /> Untailored Opportunity
                  </span>
                  <p className="text-xs sm:text-sm text-slate-500 font-mono">
                    Run the multi-agent Application Studio to generate a tailored CV, cover letter, and outreach email.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCrmModalOpen(false);
                    handleTailorApplication({
                      id: selectedCRMApp.job_id || selectedCRMApp.id,
                      title: selectedCRMApp.title,
                      company: selectedCRMApp.company,
                      description: selectedCRMApp.description,
                      location: selectedCRMApp.location,
                    });
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-mono font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" /> Run Application Agent →
                </button>
              </div>
            ) : (
              <div className="p-5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-3">
                <div className="flex items-center justify-between font-mono">
                  <span className="tag-mono text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 uppercase">
                    <Sparkles className="w-4 h-4 text-emerald-600" /> Generated Tailored Assets
                  </span>
                  {selectedCRMApp.ats_score_after && (
                    <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                      ATS: {selectedCRMApp.ats_score_after}%
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs sm:text-sm">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleDownloadCVDocx(selectedCRMApp.tailored_cv_data, activeCV?.parsed_profile?.contact_info?.name || "Candidate")}
                      className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-900 dark:text-slate-100 font-bold rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-emerald-600" /> CV (DOCX)
                    </button>
                    {selectedCRMApp.cover_letter && (
                      <button
                        onClick={() => handleDownloadCoverLetterDocx(selectedCRMApp.cover_letter, selectedCRMApp.company, selectedCRMApp.title)}
                        className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-900 dark:text-slate-100 font-bold rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-emerald-600" /> Letter (DOCX)
                      </button>
                    )}
                    {selectedCRMApp.cold_email && (
                      <button
                        onClick={() => handleDownloadEmailTxt(selectedCRMApp.cold_email, selectedCRMApp.company || "Hiring_Manager")}
                        className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-900 dark:text-slate-100 font-bold rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-emerald-600" /> Email (TXT)
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setCrmModalOpen(false);
                      handleTailorApplication({
                        id: selectedCRMApp.job_id || selectedCRMApp.id,
                        title: selectedCRMApp.title,
                        company: selectedCRMApp.company,
                        description: selectedCRMApp.description,
                        location: selectedCRMApp.location,
                      });
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-xs ml-auto cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" /> Re-Tailor →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Job Details Modal */}
      {jobDetailsModalOpen && selectedMatcherJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bento-card max-w-2xl w-full max-h-[88vh] overflow-y-auto p-8 space-y-6 shadow-2xl bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4 gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{selectedMatcherJob.title}</h3>
                  <span className="tag-mono text-xs px-2.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase font-bold border border-slate-200 dark:border-slate-700">
                    {selectedMatcherJob.source ? `[${selectedMatcherJob.source.toUpperCase()}]` : "[RADAR]"}
                  </span>
                  {selectedMatcherJob.match_score != null ? (
                    <span className="tag-mono text-xs px-3 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                      {selectedMatcherJob.match_score}% Match
                    </span>
                  ) : null}
                </div>
                <span className="tag-mono text-xs sm:text-sm text-slate-500 flex items-center gap-1.5 mt-2">
                  <Building className="w-4 h-4" /> {selectedMatcherJob.company} • <MapPin className="w-4 h-4" /> {selectedMatcherJob.location || "Remote"}
                </span>
              </div>
              <button
                onClick={() => setJobDetailsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 gap-3 font-mono text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSaveJobToCRM(selectedMatcherJob)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-bold shadow-xs cursor-pointer"
                >
                  <BookmarkPlus className="w-4 h-4 text-emerald-600" /> Save to Mini-CRM
                </button>
                {selectedMatcherJob.redirect_url && (
                  <a
                    href={selectedMatcherJob.redirect_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-bold shadow-xs"
                  >
                    <ExternalLink className="w-4 h-4 text-emerald-600" /> Open Job Link ↗
                  </a>
                )}
              </div>
              <button
                onClick={() => {
                  setJobDetailsModalOpen(false);
                  handleTailorApplication(selectedMatcherJob);
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" /> Tailor Application →
              </button>
            </div>

            {/* Full Job Description */}
            <div className="space-y-2">
              <span className="tag-mono text-xs font-bold uppercase text-slate-500 dark:text-slate-400 block">
                Full Job Description
              </span>
              <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 max-h-64 overflow-y-auto whitespace-pre-wrap font-mono">
                {selectedMatcherJob.description || "No description provided."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bento-card max-w-md w-full p-8 space-y-6 shadow-2xl bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <h3 className="tag-mono text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white uppercase">
                <SettingsIcon className="w-4 h-4 text-emerald-600" /> System Settings
              </h3>
              <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-slate-200 text-sm font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <div className="space-y-5 text-xs sm:text-sm font-mono">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1 uppercase text-xs">Active User</label>
                <p className="text-slate-600 dark:text-slate-400 font-bold">{userEmail}</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-2 uppercase text-xs">Theme Mode</label>
                <div className="flex gap-2">
                  {["light", "dark", "system"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`px-4 py-2 rounded-xl font-bold capitalize transition-all cursor-pointer ${
                        theme === t ? "bg-emerald-600 text-white shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <button
                  onClick={handleLogout}
                  className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
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

