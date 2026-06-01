import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div id="layout-root" className="fixed inset-0 bg-[#020205] text-[#e0e0ff] font-sans selection:bg-purple-500/30 overflow-hidden flex flex-col noise-overlay">
      {/* Dynamic Atmospheric Gradients */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-purple-900/20 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[1000px] h-[1000px] bg-blue-900/20 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent shadow-[0_0_20px_rgba(255,255,255,0.05)]" />
      </div>

      {/* Subtle Grid Texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Concentric Technical Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] border border-white/[0.01] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border border-white/[0.02] rounded-full pointer-events-none" />

      {/* Technical Header */}
      <header className="w-full flex justify-between items-start z-20 p-12">
        <div className="flex flex-col">
          <span className="text-[10px] tracking-[0.4em] uppercase font-bold text-blue-400 opacity-80">Nova Core</span>
          <span className="text-[10px] tracking-[0.2em] uppercase text-white/40">V.2.4.0-Stable</span>
        </div>
        <div className="flex items-center space-x-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] tracking-[0.2em] uppercase text-white/40">Latency</span>
            <span className="text-[10px] font-mono text-emerald-400">24ms</span>
          </div>
          <div className="w-[1px] h-8 bg-white/10"></div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] tracking-[0.2em] uppercase text-white/40">Sync</span>
            <span className="text-[10px] font-mono text-blue-400">Optimized</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        {children}
      </main>

      {/* Minimal Technical Footer */}
      <footer className="w-full flex justify-between items-center z-10 p-12">
        <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-full backdrop-blur-md flex items-center space-x-4">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
           <span className="text-[10px] tracking-widest uppercase font-medium text-white/60">Emotional Sync: Active</span>
        </div>
        
        <div className="flex space-x-8 text-white/20 uppercase tracking-[0.3em] text-[10px]">
          <span className="hover:text-white/60 cursor-pointer transition-colors">Config</span>
          <span className="hover:text-white/60 cursor-pointer transition-colors">Neural</span>
          <span className="text-blue-400/60 font-medium">Voice: Zephyr</span>
        </div>
      </footer>
    </div>
  );
}
