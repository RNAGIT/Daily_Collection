import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Loan Manager | Access',
  description: 'Authenticate to access the loan manager dashboard.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.25),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.22),transparent_50%),radial-gradient(circle_at_10%_90%,rgba(236,72,153,0.24),transparent_55%)]" />
      <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rotate-12 rounded-[3rem] bg-gradient-to-br from-violet-500/40 via-sky-400/30 to-cyan-300/30 blur-3xl animate-orbit" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-gradient-to-tr from-cyan-500/30 via-sky-400/20 to-purple-500/30 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-[60px] animate-pulse-glow" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16">
        <div className="w-full max-w-5xl">{children}</div>
      </div>
    </div>
  );
}

