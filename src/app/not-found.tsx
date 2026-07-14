import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[color:var(--background)] flex flex-col relative overflow-hidden">
      {/* Abstract Glowing Backgrounds */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#38bdf8] opacity-[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#3FA37E] opacity-[0.03] rounded-full blur-[100px] translate-y-1/4 pointer-events-none" />
      
      {/* Premium Navbar placeholder to match the app layout feel */}
      <header className="absolute top-0 w-full p-6 z-20 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-8 w-8 rounded-lg bg-[color:var(--foreground)] text-[color:var(--background)] flex items-center justify-center font-bold text-sm shadow-md transition-transform group-hover:scale-105 group-active:scale-95">
            RC
          </div>
          <span className="font-bold tracking-wider uppercase text-[13px] text-[color:var(--foreground)] opacity-90 group-hover:opacity-100 transition-opacity">
            Relief Connect
          </span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 py-24 text-center">
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 flex flex-col items-center max-w-lg mx-auto">
          
          <div className="relative mb-8">
            <h1 className="text-[120px] sm:text-[180px] font-black tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-b from-[color:var(--foreground)] to-[color:var(--foreground)]/10 select-none">
              404
            </h1>
            <div className="absolute inset-0 bg-gradient-to-tr from-[#38bdf8]/20 to-[#3FA37E]/20 blur-2xl -z-10 rounded-full scale-75 opacity-50" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[color:var(--foreground)] mb-4">
            Area Not Found
          </h2>
          
          <p className="text-[15px] sm:text-[16px] text-[color:var(--foreground)]/60 mb-10 leading-relaxed max-w-md">
            The coordinates you provided don't match any known sectors. The page might have been moved, resolved, or never existed in our database.
          </p>

          <Link
            href="/"
            className="group relative inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--foreground)] px-8 py-3.5 text-[13px] font-bold uppercase tracking-wider text-[color:var(--background)] transition-all hover:scale-105 hover:bg-opacity-90 hover:shadow-[0_0_30px_-5px_rgba(56,189,248,0.4)] active:scale-95"
          >
            <svg 
              className="w-4 h-4 transition-transform group-hover:-translate-x-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Return to Base</span>
          </Link>
        </div>
      </main>

      {/* Decorative Border Bottom */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#38bdf8] via-[#3FA37E] to-[#D0A24C] opacity-80" />
    </div>
  );
}
