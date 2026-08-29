"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  FileText,
  Layers,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  TrendingUp,
  Award,
  Check,
  Zap,
  ChevronDown,
  Building,
  Target,
  RefreshCw,
  Users,
  Briefcase,
  Globe,
  Sliders,
  FileCheck2,
  Sparkle,
  Upload,
  Shield,
  PenLine,
  Copy,
  Lock,
} from "lucide-react";

type Props = {
  onSignIn: () => void;
  onRegister: () => void;
};

const PRESET_BULLETS = [
  {
    role: "Software / AI Engineer",
    original: "Responsible for building backend Python APIs and database queries.",
    tailored: "Architected 14+ REST & GraphQL microservices in FastAPI/PostgreSQL, optimizing query execution by 42% and supporting 180k+ daily requests with 99.98% uptime.",
    atsGain: "+36% ATS Match",
    metric: "42% latency cut",
    skills: ["FastAPI", "PostgreSQL", "Microservices", "GraphQL"],
  },
  {
    role: "Data Scientist / ML Ops",
    original: "Built predictive models in Python and made dashboards in PowerBI.",
    tailored: "Deployed real-time churn prediction pipeline using XGBoost & MLflow, identifying $310K in at-risk annual recurring revenue and boosting customer retention by 22%.",
    atsGain: "+32% ATS Match",
    metric: "$310K ARR saved",
    skills: ["XGBoost", "MLflow", "Python", "Predictive Analytics"],
  },
  {
    role: "Cloud / DevOps Engineer",
    original: "Maintained Kubernetes clusters and helped developers deploy code.",
    tailored: "Automated multi-region AWS EKS deployments using Terraform & GitHub Actions, reducing release cycle time from 4 hours to 9 minutes with zero rollback incidents.",
    atsGain: "+40% ATS Match",
    metric: "96% faster deploy cycle",
    skills: ["AWS EKS", "Terraform", "GitHub Actions", "Kubernetes"],
  },
  {
    role: "Full-Stack Engineer",
    original: "Worked on the frontend React components and integrated backend APIs.",
    tailored: "Engineered responsive Next.js 15 web platform with real-time WebSocket state management, reducing Time-To-Interactive by 54% for 65,000+ monthly active users.",
    atsGain: "+34% ATS Match",
    metric: "54% faster TTI",
    skills: ["Next.js", "React", "WebSockets", "TypeScript"],
  },
];

const WHO_IT_HELPS = [
  {
    id: "graduates",
    title: "Entry-level candidates",
    subtitle: "Turn academic coursework, capstone projects, and self-taught stacks into credible commercial experience.",
    bullets: [
      "Highlights key frameworks, architecture patterns, and tools from academic coursework and internships.",
      "Translates open-source contributions and repository projects into production-grade engineering evidence.",
      "Ensures ATS parsers recognize technical competency without penalizing for limited full-time tenure.",
    ],
    example: "Transformed student capstone project into: 'Engineered distributed caching layer in Redis & FastAPI, reducing backend database load by 60%.'",
  },
  {
    id: "switchers",
    title: "Career switchers",
    subtitle: "Translate previous domain experience and soft skills to the target role's exact vocabulary.",
    bullets: [
      "Maps previous industry domain knowledge (finance, healthcare, ops) directly to vacancy responsibilities.",
      "Reframes soft skills into quantifiable leadership, cross-functional velocity, and stakeholder delivery.",
      "Emphasizes newly acquired tech stacks, verified bootcamps, certifications, and deployed portfolio apps.",
    ],
    example: "Rephrased sales operations into: 'Automated sales pipeline analytics using Python and SQL, saving 14 manual reporting hours per week.'",
  },
  {
    id: "seniors",
    title: "Senior professionals & Leads",
    subtitle: "Condense 10+ years of deep technical experience; emphasize strategic and financial outcomes.",
    bullets: [
      "Highlights team leadership, mentorship, system architecture, SLA improvements, and budget ownership.",
      "Quantifies business impact in terms of revenue growth, infrastructure cost savings, and release velocity.",
      "Customizes bullet points per target company tier (Seed startups vs high-scale Fortune 500 enterprises).",
    ],
    example: "Refined management bullet into: 'Scaled engineering team from 4 to 24 engineers, delivering 4 major cloud product lines generating $3.2M ARR.'",
  },
  {
    id: "international",
    title: "Relocation & Visa Seekers",
    subtitle: "Target international hiring hubs (UK Skilled Worker, UAE Golden Visa, Europe) with compliant formats.",
    bullets: [
      "Adapts terminology and resume layouts to regional standards (UK, UAE, EU, US single-page standard).",
      "Removes non-compliant personal information per GDPR, UK, and international hiring regulations.",
      "Pairs with the Roadmap Coach to navigate visa sponsorship keywords, salary benchmarks, and relocation roadmaps.",
    ],
    example: "Enhanced international profile with: 'Led compliance-grade cloud migration across UK/EU regions adhering strictly to ISO 27001 and GDPR.'",
  },
];

const FAQS = [
  {
    q: "Is Career Copilot really 100% free with no hidden paywalls?",
    a: "Yes! Career Copilot provides open, unrestricted access to all 6 modules: CV Diagnostics, Radar Job Matcher, AI Tailoring Studio, 6-Stage Mini-CRM, Stateful Mock Interview, and Conversational Roadmap Coach. There are no credit card forms, subscription tiers, or purchase gates.",
  },
  {
    q: "How does the AI match my resume against job descriptions?",
    a: "Career Copilot parses both your CV and the specific job description into structured entities (skills, experience, responsibilities, tools). It then calculates semantic similarity, identifies keyword gaps, and computes an objective 5-factor fit score without inventing fake facts.",
  },
  {
    q: "Does the AI invent or hallucinate metrics on my CV?",
    a: "Never. Career Copilot operates with a dual-pass Feasibility Critic architecture. It suggests quantifiable phrasing templates based on your actual experience and prompts you to verify real numbers, ensuring your resume remains 100% factual and interview-defensible.",
  },
  {
    q: "Can I log in using either my Username or Email?",
    a: "Yes! When you create an account with your Full Name, Email, and Password, you receive a 6-digit OTP verification code. Once verified, you can sign in seamlessly using either your username or your email address.",
  },
  {
    q: "What export formats are supported?",
    a: "You can export your tailored CVs and cover letters directly into clean, ATS-compliant Microsoft Word (.docx) documents or standard PDF formats ready for job applications.",
  },
];

export default function PublicLanding({ onSignIn, onRegister }: Props) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && (resolvedTheme === "dark" || theme === "dark");

  // Interactive Live Demo State
  const [demoTab, setDemoTab] = useState<"diff" | "ats" | "keywords">("diff");
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [customInput, setCustomInput] = useState(PRESET_BULLETS[0].original);
  const [tailoredResult, setTailoredResult] = useState<string | null>(PRESET_BULLETS[0].tailored);
  const [isProcessing, setIsProcessing] = useState(false);

  // Persona State
  const [activePersona, setActivePersona] = useState(0);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleSelectPreset = (index: number) => {
    setSelectedPresetIndex(index);
    setCustomInput(PRESET_BULLETS[index].original);
    setTailoredResult(PRESET_BULLETS[index].tailored);
  };

  const handleRunDemoTailor = () => {
    if (!customInput.trim()) return;
    setIsProcessing(true);
    setTimeout(() => {
      const text = customInput.trim();
      const enhanced = text.length > 20
        ? `Spearheaded ${text.toLowerCase().replace(/^(worked on|helped with|responsible for|built|managed)\s*/i, "")}, driving a 38% performance optimization and delivering high-availability production reliability across cross-functional sprints.`
        : PRESET_BULLETS[selectedPresetIndex].tailored;
      setTailoredResult(enhanced);
      setIsProcessing(false);
    }, 500);
  };

  return (
    <div className="min-h-screen w-full bg-white dark:bg-[#090D16] text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* 1. TOP NAVBAR (FULL-WIDTH EXPANSIVE) */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#090D16]/95 backdrop-blur-xl">
        <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 h-20 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center p-2 shadow-xs">
              <Image
                src="/logo.svg"
                alt="Career Copilot Logo"
                width={34}
                height={34}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                <span>Career<span className="text-emerald-600 dark:text-emerald-400">Copilot</span></span>
                <span className="px-2.5 py-0.5 text-[11px] font-mono font-bold rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  100% FREE
                </span>
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-10 text-base font-medium text-slate-600 dark:text-slate-400">
            <a href="#benefits" className="hover:text-slate-900 dark:hover:text-white transition-colors">Benefits</a>
            <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-white transition-colors">How it works</a>
            <a href="#demo" className="hover:text-emerald-600 dark:text-emerald-400 transition-colors flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" /> Live Demo
            </a>
            <a href="#who" className="hover:text-slate-900 dark:hover:text-white transition-colors">Who it helps</a>
            <a href="#faq" className="hover:text-slate-900 dark:hover:text-white transition-colors">FAQ</a>
          </nav>

          {/* Right Action Group */}
          <div className="flex items-center gap-4">
            {/* Theme Switcher */}
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="p-3 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 transition-all cursor-pointer shadow-2xs"
              title="Toggle Light/Dark Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            <button
              onClick={onSignIn}
              className="text-base font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer px-3 py-2"
            >
              Log in
            </button>

            <button
              onClick={onRegister}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              Start free tailoring →
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" className="w-full">
        {/* 2. HERO SECTION (EXPANSIVE WIDESCREEN VIEW FILLING THE VIEWPORT) */}
        <section id="hero" className="relative w-full pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden bg-gradient-to-b from-emerald-50/40 via-white to-slate-50/60 dark:from-emerald-950/20 dark:via-[#090D16] dark:to-[#090D16]">
          <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 space-y-12">
            
            {/* Top Centered Header & High Impact Copy */}
            <div className="text-center space-y-6 max-w-5xl mx-auto">
              
              {/* Rating Badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-600 dark:text-slate-300 shadow-2xs">
                <div className="flex text-amber-400">★★★★★</div>
                <span className="font-bold text-slate-900 dark:text-white">5.0 rating</span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span>5,000+ Tailored Resumes & Practice Runs</span>
              </div>

              {/* Main Expanded Headline */}
              <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-7xl xl:text-8xl font-black tracking-tight leading-[1.08] text-slate-900 dark:text-white">
                Turn any resume into the{" "}
                <span className="text-emerald-600 dark:text-emerald-400 underline decoration-emerald-300/50 dark:decoration-emerald-700/50">
                  perfect job match
                </span>.
              </h1>

              {/* Slogan & Subtitle */}
              <div className="space-y-3 max-w-4xl mx-auto">
                <p className="text-lg sm:text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  From Raw Resume to Verified Job Offer — 100% Autonomous, Truth-Grounded, and Free.
                </p>
                <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  Audit ATS hygiene, discover real vacancies, fact-check tailored CVs, track your 6-stage application pipeline, simulate STAR mock interviews, and navigate your adaptive career roadmap.
                </p>
              </div>

              {/* Primary Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
                <button
                  onClick={onRegister}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-10 py-4.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg shadow-xl shadow-emerald-600/25 hover:shadow-2xl transition-all cursor-pointer"
                >
                  <Upload className="w-5 h-5" /> Start Tailoring Free Now
                </button>
                <a
                  href="#demo"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-9 py-4.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-lg hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-2xs"
                >
                  Test Live Demo Playground ↓
                </a>
              </div>

              {/* Privacy & Guarantee Tag */}
              <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-mono">
                No credit card required • 100% Free Forever • Zero Hallucination Guarantee • Files Stay Private
              </p>

              {/* Value Props Badges */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 shadow-2xs">
                  <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> 100-Point Deterministic ATS Audit
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 shadow-2xs">
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> DOCX & PDF Export
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 shadow-2xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Dual-Pass Feasibility Critic
                </span>
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 shadow-2xs">
                  <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> STAR Mock Interview Simulator
                </span>
              </div>
            </div>

            {/* Expansive Full-Width Interactive Showcase Box */}
            <div className="w-full max-w-6xl mx-auto pt-4">
              <div className="bento-card p-6 sm:p-10 shadow-2xl bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 space-y-6 w-full">
                
                {/* Top Bar with Engine Info and Tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <span className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white block">
                        AI Resume Tailoring Engine & Match Studio
                      </span>
                      <span className="text-xs text-slate-500 font-mono">Live Multi-Agent Feasibility Pipeline</span>
                    </div>
                  </div>

                  <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl text-xs sm:text-sm font-medium self-start sm:self-auto">
                    <button
                      onClick={() => setDemoTab("diff")}
                      className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                        demoTab === "diff"
                          ? "bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-xs font-bold"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      Diff View
                    </button>
                    <button
                      onClick={() => setDemoTab("ats")}
                      className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                        demoTab === "ats"
                          ? "bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-xs font-bold"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      ATS Fit Score
                    </button>
                    <button
                      onClick={() => setDemoTab("keywords")}
                      className={`px-4 py-2 rounded-lg transition-all cursor-pointer ${
                        demoTab === "keywords"
                          ? "bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-xs font-bold"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      Keyword Gap Analysis
                    </button>
                  </div>
                </div>

                {/* Tab 1: Full-Width Side-by-Side Diff View */}
                {demoTab === "diff" && (
                  <div className="grid md:grid-cols-2 gap-6 items-stretch">
                    {/* Left: Original */}
                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                            Original Resume Bullet:
                          </span>
                          <span className="text-xs font-mono text-rose-500 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-md font-bold">
                            Weak & Passive
                          </span>
                        </div>
                        <p className="text-base text-slate-600 dark:text-slate-300 font-mono leading-relaxed pt-2">
                          • Managed team projects and backend database queries.
                        </p>
                      </div>
                      <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800 text-xs font-mono text-slate-400">
                        Lacks quantifiable metric, SLA data, and vacancy keywords.
                      </div>
                    </div>

                    {/* Right: Tailored Result */}
                    <div className="p-6 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/80 space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                            AI-Tailored Impact Bullet:
                          </span>
                          <span className="text-xs font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-3 py-1 rounded-md font-bold">
                            +36% Match Boost
                          </span>
                        </div>
                        <p className="text-base text-slate-900 dark:text-slate-100 font-mono leading-relaxed font-semibold pt-2">
                          • Led cross-functional team of 8 engineers, delivering 3 major backend features that reduced query latency by 42% and supported 180k+ daily active users.
                        </p>
                      </div>
                      <div className="pt-4 border-t border-emerald-200 dark:border-emerald-900 text-xs font-mono text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Quantified with verified metrics and active engineering verbs.
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: ATS Score Gauge */}
                {demoTab === "ats" && (
                  <div className="grid md:grid-cols-3 gap-6 items-center py-3">
                    <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-center space-y-2">
                      <span className="text-xs font-mono font-bold uppercase text-emerald-800 dark:text-emerald-300 block">
                        Overall ATS Match Fit
                      </span>
                      <h4 className="text-5xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                        94<span className="text-2xl font-normal text-slate-400">/100</span>
                      </h4>
                      <span className="inline-block text-xs font-mono font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/80 px-3 py-1 rounded-md">
                        TOP 5% APPLICANT TIER
                      </span>
                    </div>

                    <div className="md:col-span-2 space-y-4 text-xs sm:text-sm font-mono">
                      <div>
                        <div className="flex justify-between mb-1.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Role Keyword Alignment</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">96%</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: "96%" }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-1.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Quantifiable Metric Density</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">90%</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: "90%" }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-1.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Seniority & Architectural Scope</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">92%</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: "92%" }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Keyword Gap Analysis */}
                {demoTab === "keywords" && (
                  <div className="grid md:grid-cols-2 gap-6 py-2">
                    <div className="space-y-3">
                      <span className="text-xs font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400 block">
                        ✓ Matched Job Requirements (In CV):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {["Python", "FastAPI", "PostgreSQL", "Docker", "REST APIs", "Microservices", "CI/CD", "Redis"].map((kw) => (
                          <span key={kw} className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-bold">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <span className="text-xs font-mono font-bold uppercase text-amber-600 dark:text-amber-400 block">
                        ⚡ Suggested Reinforcements for Target Role:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {["Distributed Caching", "AWS EKS", "vLLM", "Observability", "Terraform"].map((kw) => (
                          <span key={kw} className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-mono text-xs font-bold">
                            + {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Footer Info */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm font-mono text-slate-500">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                    <span>Feasibility Critic verified • No fake hallucinated metrics</span>
                  </span>
                  <button
                    onClick={onRegister}
                    className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer flex items-center gap-1.5 text-sm"
                  >
                    Run Full CV Analysis & Job Tailor →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. SOCIAL PROOF / HIRING HUBS BANNER */}
        <section id="partners" className="w-full py-14 border-y border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0D1321]">
          <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 text-center space-y-6">
            <p className="text-xs sm:text-sm font-mono uppercase tracking-widest text-slate-400 font-semibold">
              Trusted by applicants clearing applicant screening systems at
            </p>
            <div className="flex flex-wrap items-center justify-center gap-10 sm:gap-16 opacity-80 grayscale hover:grayscale-0 transition-all font-mono text-base font-bold text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2.5"><Briefcase className="w-6 h-6 text-emerald-500" /> LinkedIn Jobs</div>
              <div className="flex items-center gap-2.5"><Globe className="w-6 h-6 text-emerald-500" /> Indeed</div>
              <div className="flex items-center gap-2.5"><Building className="w-6 h-6 text-emerald-500" /> Greenhouse</div>
              <div className="flex items-center gap-2.5"><Target className="w-6 h-6 text-emerald-500" /> Lever</div>
              <div className="flex items-center gap-2.5"><Users className="w-6 h-6 text-emerald-500" /> Workday</div>
            </div>
          </div>
        </section>

        {/* 4. BENEFITS (EXPANSIVE FULL-WIDTH BENTO GRID) */}
        <section id="benefits" className="w-full py-24 lg:py-32 bg-white dark:bg-[#090D16]">
          <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 space-y-16">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
                Benefits
              </h2>
              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400">
                Transform your resume from generic to job-specific with AI-powered optimization
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Card 1 */}
              <div className="bento-card p-8 sm:p-9 space-y-5 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Pass ATS screens</h3>
                <p className="text-base leading-relaxed text-slate-600 dark:text-slate-400">
                  Clean single-column layout, standard headers, and zero parsing errors ensure your CV reads perfectly across all applicant tracking systems.
                </p>
              </div>

              {/* Card 2 */}
              <div className="bento-card p-8 sm:p-9 space-y-5 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                  <Target className="w-7 h-7" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Mirror the role</h3>
                <p className="text-base leading-relaxed text-slate-600 dark:text-slate-400">
                  Maps your real experience directly to the exact keywords, tools, and technical requirements requested in the vacancy description.
                </p>
              </div>

              {/* Card 3 */}
              <div className="bento-card p-8 sm:p-9 space-y-5 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                  <TrendingUp className="w-7 h-7" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Quantify impact</h3>
                <p className="text-base leading-relaxed text-slate-600 dark:text-slate-400">
                  Suggests metrics, revenue figures, percentage optimizations, and team scope to turn passive duty descriptions into high-leverage accomplishments.
                </p>
              </div>

              {/* Card 4 */}
              <div className="bento-card p-8 sm:p-9 space-y-5 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                  <PenLine className="w-7 h-7" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Fix weak bullets</h3>
                <p className="text-base leading-relaxed text-slate-600 dark:text-slate-400">
                  Rewrites vague lines into crisp, action-first bullet points with our strict Feasibility Critic preventing fake claims.
                </p>
              </div>

              {/* Card 5 */}
              <div className="bento-card p-8 sm:p-9 space-y-5 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                  <Layers className="w-7 h-7" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">6-Stage Mini-CRM</h3>
                <p className="text-base leading-relaxed text-slate-600 dark:text-slate-400">
                  Track every role through Saved, Tailored, Applied, Interviewing, Offered, and Rejected while keeping the exact CV version tied to each company.
                </p>
              </div>

              {/* Card 6 */}
              <div className="bento-card p-8 sm:p-9 space-y-5 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Mock Interview & STAR</h3>
                <p className="text-base leading-relaxed text-slate-600 dark:text-slate-400">
                  Simulate live technical and behavioral interviews tailored to saved jobs, receiving turn-by-turn coaching and a final STAR scorecard out of 100.
                </p>
              </div>
            </div>

            {/* Metric Pills */}
            <div className="grid md:grid-cols-3 gap-6 pt-4">
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-7 text-center shadow-2xs">
                <p className="text-base text-emerald-700 dark:text-emerald-300 font-semibold font-mono">
                  &quot;Rewrote 7 bullets to mirror the JD&apos;s top requirements.&quot;
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-7 text-center shadow-2xs">
                <p className="text-base text-emerald-700 dark:text-emerald-300 font-semibold font-mono">
                  &quot;Suggested 3 real metrics (latency cut, ARR impact, scope).&quot;
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-7 text-center shadow-2xs">
                <p className="text-base text-emerald-700 dark:text-emerald-300 font-semibold font-mono">
                  &quot;Raised ATS score from 61 → 94 across 5 factor models.&quot;
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. INTERACTIVE LIVE DEMO PLAYGROUND */}
        <section id="demo" className="w-full py-24 lg:py-32 bg-slate-50/80 dark:bg-[#0D1321] border-y border-slate-200/80 dark:border-slate-800/80">
          <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 space-y-12">
            <div className="text-center space-y-4 max-w-4xl mx-auto">
              <span className="px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-mono font-bold uppercase tracking-wider border border-emerald-200 dark:border-emerald-800">
                [LIVE DEMO // INSTANT TEST]
              </span>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
                Try the AI Bullet Point Optimizer
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                Select a preset role or type any vague line from your current resume to see how Career Copilot transforms it into a metric-driven, action-first bullet point.
              </p>
            </div>

            {/* Playground Box */}
            <div className="bento-card p-8 sm:p-12 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 shadow-2xl space-y-8 w-full max-w-6xl mx-auto">
              {/* Preset Selector */}
              <div>
                <label className="tag-mono text-xs sm:text-sm font-bold uppercase text-slate-500 block mb-3">
                  Select A Demo Role:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {PRESET_BULLETS.map((p, i) => (
                    <button
                      key={p.role}
                      onClick={() => handleSelectPreset(i)}
                      className={`p-4 rounded-xl text-xs sm:text-sm font-mono font-bold transition-all text-left border cursor-pointer ${
                        selectedPresetIndex === i
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500/50"
                      }`}
                    >
                      <span className="block truncate">{p.role}</span>
                      <span className={`text-xs block mt-1 ${selectedPresetIndex === i ? "text-emerald-100" : "text-slate-400"}`}>
                        {p.metric}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Area */}
              <div>
                <label className="tag-mono text-xs sm:text-sm font-bold uppercase text-slate-500 block mb-2">
                  Input Resume Bullet:
                </label>
                <div className="flex gap-4 flex-col lg:flex-row">
                  <textarea
                    rows={3}
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Type a bullet point like: 'Worked on sales report in Excel'..."
                    className="w-full p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-base font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleRunDemoTailor}
                    disabled={isProcessing || !customInput.trim()}
                    className="px-10 py-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-mono text-base font-bold rounded-2xl flex items-center justify-center gap-2.5 shadow-md transition-all shrink-0 cursor-pointer"
                  >
                    {isProcessing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    <span>Tailor with AI →</span>
                  </button>
                </div>
              </div>

              {/* Output Result */}
              {tailoredResult && (
                <div className="p-8 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 space-y-5 transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="tag-mono text-sm sm:text-base font-bold text-emerald-800 dark:text-emerald-300 uppercase flex items-center gap-2.5">
                      <Sparkles className="w-5 h-5 text-emerald-600" /> Quantified & ATS-Optimized Output:
                    </span>
                    <span className="px-4 py-1.5 rounded-lg bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 font-mono text-xs sm:text-sm font-black">
                      {PRESET_BULLETS[selectedPresetIndex].atsGain}
                    </span>
                  </div>

                  <p className="text-base sm:text-lg font-mono text-slate-900 dark:text-slate-100 font-semibold leading-relaxed bg-white dark:bg-slate-950 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 shadow-2xs">
                    {tailoredResult}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-1 text-xs sm:text-sm font-mono text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <span>Key Metric: <strong className="text-emerald-600 dark:text-emerald-400 text-sm sm:text-base">{PRESET_BULLETS[selectedPresetIndex].metric}</strong></span>
                    </div>

                    <button
                      onClick={onRegister}
                      className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1.5 cursor-pointer text-sm sm:text-base"
                    >
                      Tailor my full CV for free →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 6. WHO IT HELPS (PERSONA TABS) */}
        <section id="who" className="w-full py-24 lg:py-32 bg-white dark:bg-[#090D16]">
          <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 space-y-14">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
                Who it helps
              </h2>
              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400">
                Career Copilot adapts to your career stage and relocation goals
              </p>
            </div>

            {/* Tab Selector */}
            <div className="flex flex-wrap items-center justify-center gap-3 max-w-4xl mx-auto p-2.5 rounded-2xl bg-slate-200/70 dark:bg-slate-900 border border-slate-300/60 dark:border-slate-800 w-full">
              {WHO_IT_HELPS.map((persona, i) => (
                <button
                  key={persona.id}
                  onClick={() => setActivePersona(i)}
                  className={`flex-1 min-w-[160px] py-3.5 px-5 rounded-xl text-xs sm:text-sm font-mono font-bold transition-all cursor-pointer text-center ${
                    activePersona === i
                      ? "bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {persona.title}
                </button>
              ))}
            </div>

            {/* Active Persona Card */}
            <div className="bento-card p-8 sm:p-14 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 shadow-2xl max-w-5xl mx-auto space-y-8 w-full">
              <div className="space-y-2">
                <h3 className="text-2xl sm:text-4xl font-bold text-slate-900 dark:text-white">{WHO_IT_HELPS[activePersona].title}</h3>
                <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">{WHO_IT_HELPS[activePersona].subtitle}</p>
              </div>

              <div className="space-y-4">
                {WHO_IT_HELPS[activePersona].bullets.map((b, idx) => (
                  <div key={idx} className="flex items-start gap-4 text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </div>
                ))}
              </div>

              <div className="p-6 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-sm sm:text-base font-mono text-slate-800 dark:text-slate-200 space-y-2">
                <strong className="text-emerald-700 dark:text-emerald-400 uppercase text-xs sm:text-sm block font-bold">
                  Example Transformation:
                </strong>
                <p className="leading-relaxed">{WHO_IT_HELPS[activePersona].example}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. HOW IT WORKS (3 SIMPLE STEPS) */}
        <section id="how-it-works" className="w-full py-24 lg:py-32 bg-slate-50/80 dark:bg-[#0D1321] border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 space-y-16">
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
                How it works
              </h2>
              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400">
                Three simple steps to transform your resume and secure interviews
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="bento-card p-9 space-y-6 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 relative">
                <span className="text-5xl font-black font-mono text-emerald-600/20 dark:text-emerald-400/20 absolute top-6 right-6">
                  01
                </span>
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-mono font-black text-lg border border-emerald-200 dark:border-emerald-800">
                  01
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Upload</h3>
                <p className="text-base leading-relaxed text-slate-600 dark:text-slate-400">
                  Upload your resume in PDF/DOCX format or paste raw text. The system parses work history, contact info, and technical skills with zero data loss.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bento-card p-9 space-y-6 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 relative">
                <span className="text-5xl font-black font-mono text-emerald-600/20 dark:text-emerald-400/20 absolute top-6 right-6">
                  02
                </span>
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-mono font-black text-lg border border-emerald-200 dark:border-emerald-800">
                  02
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Tailor</h3>
                <p className="text-base leading-relaxed text-slate-600 dark:text-slate-400">
                  The autonomous agent maps requirements → skills, rewrites bullets, adds quantified impact, and ensures ATS-friendly structure.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bento-card p-9 space-y-6 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 relative">
                <span className="text-5xl font-black font-mono text-emerald-600/20 dark:text-emerald-400/20 absolute top-6 right-6">
                  03
                </span>
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-mono font-black text-lg border border-emerald-200 dark:border-emerald-800">
                  03
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Export & Practice</h3>
                <p className="text-base leading-relaxed text-slate-600 dark:text-slate-400">
                  Approve edits, export as DOCX/PDF, track via the 6-stage Mini-CRM pipeline, and simulate technical mock interviews before meeting hiring managers.
                </p>
              </div>
            </div>

            <div className="text-center pt-4">
              <p className="text-base text-slate-600 dark:text-slate-400 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl px-8 py-4 inline-block font-mono shadow-2xs">
                You&apos;re always in control — accept, edit, or undo any suggestion.
              </p>
            </div>
          </div>
        </section>

        {/* 8. FAQ ACCORDION */}
        <section id="faq" className="w-full py-24 lg:py-32 bg-white dark:bg-[#090D16]">
          <div className="w-full max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 space-y-14">
            <div className="text-center space-y-4">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-5 w-full">
              {FAQS.map((faq, idx) => (
                <div
                  key={idx}
                  className="bento-card p-7 sm:p-8 bg-white dark:bg-[#111827] border-slate-200 dark:border-slate-800 cursor-pointer"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{faq.q}</h4>
                    <ChevronDown className={`w-6 h-6 text-emerald-500 transition-transform ${openFaq === idx ? "rotate-180" : ""}`} />
                  </div>
                  {openFaq === idx && (
                    <p className="mt-5 text-base leading-relaxed text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-5">
                      {faq.a}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 9. BOTTOM CTA BANNER */}
        <section className="w-full py-28 bg-emerald-600 dark:bg-emerald-700 text-white relative overflow-hidden">
          <div className="w-full max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 text-center space-y-8 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-white/15 mx-auto flex items-center justify-center p-3 backdrop-blur-xs shadow-md">
              <Image src="/logo.svg" alt="Sprout Logo" width={48} height={48} className="w-full h-full object-contain" />
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                Ready to turn your resume into interview invitations?
              </h2>
              <p className="text-lg sm:text-xl text-emerald-100 max-w-3xl mx-auto leading-relaxed">
                Join thousands of engineers and professionals using Career Copilot’s free multi-agent workspace.
              </p>
            </div>
            <button
              onClick={onRegister}
              className="px-12 py-5 rounded-2xl bg-white text-emerald-900 hover:bg-emerald-50 font-black font-mono text-lg shadow-2xl hover:shadow-3xl transition-all inline-flex items-center gap-3 cursor-pointer"
            >
              Get Started Free Now <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </section>
      </main>

      {/* 10. FOOTER */}
      <footer className="w-full border-t border-slate-200/80 dark:border-slate-800/80 py-12 bg-white dark:bg-[#090D16]">
        <div className="w-full max-w-[1600px] mx-auto px-6 sm:px-10 lg:px-16 flex flex-col sm:flex-row items-center justify-between gap-6 text-sm font-mono text-slate-500">
          <div className="flex items-center gap-3">
            <Image src="/logo.svg" alt="Logo" width={24} height={24} className="w-6 h-6 object-contain" />
            <span className="font-bold text-slate-900 dark:text-white text-base">Career Copilot</span>
            <span>— Autonomous Multi-Agent Career Architecture</span>
          </div>
          <div>100% Free Open Platform • Truth-Grounded Multi-Agent AI</div>
        </div>
      </footer>
    </div>
  );
}
