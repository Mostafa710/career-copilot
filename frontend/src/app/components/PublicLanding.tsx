"use client";

import {
  ArrowRight, CheckCircle2, Compass, FileText, Layers, MessageSquare,
  Search, ShieldCheck, Sparkles,
} from "lucide-react";

type Props = {
  onSignIn: () => void;
  onRegister: () => void;
};

const features = [
  [FileText, "JD-targeted CV review", "Measure fit against the vacancy you want, or choose a clearly labeled general health review."],
  [Search, "Real job matcher", "Rank individual job postings against the evidence in your CV—never category pages padded as jobs."],
  [Sparkles, "Fact-checked tailoring", "Generate tailored CV text, cover letters, and outreach while a critic checks every claim."],
  [Layers, "Application Mini-CRM", "Save roles, track each stage, and keep the exact CV version used for every application."],
  [MessageSquare, "Interview practice", "Practice technical and behavioral interviews grounded in your CV and target job."],
  [Compass, "Adaptive career planning", "Plan applications, relocation, transitions, or learning from what the system already knows."],
] as const;

export default function PublicLanding({ onSignIn, onRegister }: Props) {
  return (
    <div className="min-h-screen bg-[#FAFAF6] text-[#102A2A]">
      <header className="sticky top-0 z-30 border-b border-[#D9E5E1] bg-[#FAFAF6]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
          <a href="#top" className="flex items-center gap-3 font-black tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#102A2A] font-mono text-xs text-white">CC</span>
            <span>Career Copilot</span>
          </a>
          <nav className="hidden items-center gap-7 text-sm font-semibold md:flex">
            <a href="#features" className="hover:text-[#23877A]">Features</a>
            <a href="#how" className="hover:text-[#23877A]">How it works</a>
            <a href="#who" className="hover:text-[#23877A]">Who it helps</a>
            <a href="#faq" className="hover:text-[#23877A]">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={onSignIn} className="rounded-xl px-4 py-2 text-sm font-bold hover:bg-[#EDF8F5]">Sign in</button>
            <button onClick={onRegister} className="rounded-xl bg-[#176B61] px-4 py-2 text-sm font-bold text-white hover:bg-[#102A2A]">Get started</button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="overflow-hidden bg-[#102A2A] px-5 py-20 text-white lg:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-[#CDEB8B]">
                <Sparkles className="h-3.5 w-3.5" /> Your full job-search journey, one workspace
              </div>
              <h1 className="max-w-3xl text-5xl font-black leading-[1.02] tracking-[-0.05em] sm:text-6xl">
                Turn one CV into a smarter career strategy.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-white/70">
                Match a real job description, fix weak evidence line by line, find individual vacancies, tailor applications, practice interviews, and plan what comes next.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <button onClick={onRegister} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#CDEB8B] px-6 py-3.5 font-black text-[#102A2A] hover:bg-white">
                  Analyze my CV <ArrowRight className="h-4 w-4" />
                </button>
                <a href="#how" className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3.5 font-bold hover:bg-white/10">See how it works</a>
              </div>
              <p className="mt-4 text-xs text-white/45">No pricing wall. No invented achievements. You approve every change.</p>
            </div>

            <div className="rounded-[2rem] border border-white/15 bg-[#EDF8F5] p-4 text-[#102A2A] shadow-2xl shadow-black/30 sm:p-6">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-xs font-bold uppercase tracking-widest text-[#23877A]">Targeted CV review</p><h3 className="mt-1 text-xl font-black">AI Engineer · UAE</h3></div>
                  <div className="rounded-xl bg-[#DDF2EA] px-3 py-2 text-right"><span className="block text-2xl font-black">78</span><span className="text-[10px] font-bold">MATCH ESTIMATE</span></div>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-red-100 bg-red-50 p-4"><span className="text-[10px] font-black uppercase text-red-600">CV evidence</span><p className="mt-2 text-sm">Responsible for building ML APIs.</p></div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4"><span className="text-[10px] font-black uppercase text-emerald-700">Suggested correction</span><p className="mt-2 text-sm">Developed ML APIs for production workflows.</p></div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-[#FAFAF6] p-3 text-xs"><span>Evidence-grounded · user controlled</span><span className="font-black text-[#176B61]">Accept / Edit / Ignore</span></div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm font-black uppercase tracking-[.2em] text-[#23877A]">One connected platform</p>
            <h2 className="mt-3 max-w-3xl text-4xl font-black tracking-tight">More than CV tailoring. The whole application loop.</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map(([Icon, title, copy]) => (
                <article key={title} className="rounded-2xl border border-[#D9E5E1] bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#176B61]/5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#DDF2EA] text-[#176B61]"><Icon className="h-5 w-5" /></div>
                  <h3 className="mt-5 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#49625F]">{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="bg-[#EDF8F5] px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-sm font-black uppercase tracking-[.2em] text-[#23877A]">How it works</p><h2 className="mt-3 text-4xl font-black">From CV upload to interview-ready.</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-4">
              {[
                ["01", "Upload once", "Keep one current CV plus three previous versions."],
                ["02", "Add a real JD", "Use targeted analysis—or general analysis with a visible limitation."],
                ["03", "Approve corrections", "Compare original evidence and suggested text. Accept, edit, or ignore."],
                ["04", "Run the journey", "Find jobs, tailor, track, practice, and plan from one verified profile."],
              ].map(([number, title, copy]) => <div key={number} className="rounded-2xl bg-white p-6"><span className="font-mono text-sm font-black text-[#23877A]">{number}</span><h3 className="mt-8 text-lg font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-[#49625F]">{copy}</p></div>)}
            </div>
          </div>
        </section>

        <section id="who" className="px-5 py-20 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2 lg:items-center">
          <div><p className="text-sm font-black uppercase tracking-[.2em] text-[#23877A]">Built for changing careers</p><h2 className="mt-3 text-4xl font-black">Useful whether you are starting, switching, or scaling up.</h2><p className="mt-5 leading-7 text-[#49625F]">Career Copilot adapts to students, early-career applicants, experienced engineers moving markets, and specialists targeting a better role.</p></div>
          <div className="grid gap-3">{["Students building evidence before their first role", "Professionals tailoring for a specific opportunity", "Engineers relocating or entering a new job market"].map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl border border-[#D9E5E1] bg-white p-4 font-bold"><CheckCircle2 className="h-5 w-5 text-[#23877A]" />{item}</div>)}</div>
        </div></section>

        <section className="px-5 pb-20 lg:px-8"><div className="mx-auto grid max-w-7xl gap-6 rounded-[2rem] bg-[#176B61] p-8 text-white md:grid-cols-2 md:p-12">
          <div><ShieldCheck className="h-8 w-8 text-[#CDEB8B]" /><h2 className="mt-5 text-3xl font-black">Truth before score inflation.</h2></div>
          <p className="self-center leading-7 text-white/75">Scores show unavailable factors instead of fake neutral values. Missing skills become evidence questions, and invented metrics are blocked behind confirmation.</p>
        </div></section>

        <section id="faq" className="bg-white px-5 py-20 lg:px-8"><div className="mx-auto max-w-4xl"><h2 className="text-center text-4xl font-black">Questions, answered.</h2><div className="mt-10 space-y-3">{[
          ["Is the match score my employer’s ATS score?", "No. It is a transparent estimate using your CV and supplied JD. The employer’s private rules are not visible."],
          ["Can I analyze only my CV?", "Yes. General mode checks CV health and clearly tells you it is not job-specific."],
          ["Does Career Copilot rewrite facts?", "No. Safe wording changes preserve the source fact. Metrics and missing skills require your evidence."],
        ].map(([q, a]) => <details key={q} className="rounded-2xl border border-[#D9E5E1] bg-[#FAFAF6] p-5"><summary className="cursor-pointer font-black">{q}</summary><p className="mt-3 text-sm leading-6 text-[#49625F]">{a}</p></details>)}</div></div></section>

        <section className="px-5 py-20 text-center lg:px-8"><h2 className="text-4xl font-black">Ready to make your CV specific?</h2><p className="mx-auto mt-4 max-w-xl text-[#49625F]">Start with your CV and one real job description. Keep control of every correction.</p><button onClick={onRegister} className="mt-8 rounded-xl bg-[#176B61] px-7 py-3.5 font-black text-white hover:bg-[#102A2A]">Create your workspace</button></section>
      </main>

      <footer className="border-t border-[#D9E5E1] px-5 py-8"><div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-[#49625F] sm:flex-row sm:items-center sm:justify-between"><span className="font-black text-[#102A2A]">Career Copilot</span><span>CV review · Job matching · Applications · Interviews · Roadmaps</span></div></footer>
    </div>
  );
}
