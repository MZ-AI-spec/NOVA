import React, { useState, useRef, useEffect, FormEvent } from 'react';
import { 
  Chrome, Music, Code2, StickyNote, Terminal, Palette,
  Minimize2, Maximize2, Square, X, Search, Play, Pause, SkipForward, SkipBack, 
  Volume2, Plus, Trash2, Folder, TerminalSquare, AlertCircle, RefreshCw,
  Camera, Video, VideoOff, Calculator, Download, AlertTriangle, Monitor, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ErrorBoundary from './ErrorBoundary';

interface VirtualApp {
  name: string;
  displayName: string;
  status: 'active' | 'minimized' | 'closed';
  color: string;
  lastFocusedAt: number;
}

function WindowContent({ 
  appName, 
  onClose, 
  children 
}: { 
  appName: string; 
  onClose: () => void; 
  children: React.ReactNode;
}) {
  const [loadingText, setLoadingText] = useState<string | null>(() => {
    if (appName === 'Camera') return "Initializing camera...";
    if (appName === 'Calculator' || appName === 'Photoshop' || appName === 'Terminal') return "Preparing workspace...";
    return "Opening module...";
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingText(null);
    }, 600); // 600ms loading overlay is fast & premium
    return () => clearTimeout(timer);
  }, [appName]);

  return (
    <div className="relative w-full h-full">
      <AnimatePresence>
        {loadingText && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-[#04040a] z-30 flex flex-col items-center justify-center font-mono text-[10px]"
          >
            {/* Ambient scanning lines and glow */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[size:100%_4px]" />
            <div className="flex flex-col items-center gap-3">
              <span className="w-5 h-5 rounded-full border border-cyan-400/40 border-t-cyan-400 animate-spin" />
              <span className="text-cyan-400 tracking-widest uppercase text-[8px] animate-pulse">
                {loadingText}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <ErrorBoundary appName={appName} onClose={onClose}>
        {children}
      </ErrorBoundary>
    </div>
  );
}

function CameraView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState(false);
  const [filter, setFilter] = useState<'none' | 'matrix' | 'amber' | 'night'>('none');
  const [coords, setCoords] = useState({ x: 250, y: 180 });

  useEffect(() => {
    let active = true;

    // Defensive check: navigator.mediaDevices may be undefined in sandboxed iframes or HTTP previews
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      console.warn("Camera transmission is unavailable (unsupported browser context or unsafe iframe sandbox)");
      setPermissionError(true);
      
      const scanInterval = setInterval(() => {
        if (active) {
          setCoords({
            x: Math.round(150 + Math.random() * 200),
            y: Math.round(100 + Math.random() * 150)
          });
        }
      }, 3000);
      
      return () => {
        active = false;
        clearInterval(scanInterval);
      };
    }

    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(s => {
        if (!active) {
          s.getTracks().forEach(t => t.stop());
          return;
        }
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(err => {
        console.warn("Camera stream denied/unsupported", err);
        setPermissionError(true);
      });

    // Animate target scanner coordinates to make simulation lively
    const scanInterval = setInterval(() => {
      if (active) {
        setCoords({
          x: Math.round(150 + Math.random() * 200),
          y: Math.round(100 + Math.random() * 150)
        });
      }
    }, 3000);

    return () => {
      active = false;
      clearInterval(scanInterval);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Filter styles
  const filterClasses = {
    none: "",
    matrix: "hue-rotate-90 sepia saturate-200 contrast-125 brightness-110",
    amber: "sepia saturate-150 hue-rotate-[-30deg] contrast-125",
    night: "brightness-125 saturate-50 sepia hue-rotate-60 invert-[0.1]"
  };

  return (
    <div className="flex flex-col h-full bg-black select-none text-white relative overflow-hidden font-mono text-[9px]">
      <div className="flex-1 relative bg-neutral-950 flex items-center justify-center">
        {permissionError ? (
          // Simulation Mock View when permission is blocked or unavailable
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-[#070202] text-red-400 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.06)_0%,transparent_70%)] animate-pulse" />
            <div className="relative z-10 space-y-3.5 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full border border-red-500/35 flex items-center justify-center bg-red-500/5 text-red-500 animate-spin" style={{ animationDuration: '6s' }}>
                <VideoOff className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="font-bold uppercase tracking-widest text-[10px]">No Real Web Camera</p>
                <p className="text-[9px] text-white/40 leading-relaxed max-w-[200px]">
                  Permissions restricted or device unconnected. Projection mapping mode is online.
                </p>
              </div>

              {/* Animated scan crosshair matrix */}
              <div className="border border-red-500/20 px-2 py-1 rounded text-[8px] uppercase tracking-widest text-red-400 bg-red-400/5 animate-pulse">
                projection active
              </div>
            </div>
            
            {/* Tech markings */}
            <div className="absolute top-2.5 left-3.5 text-white/30 text-[8px]">REC_STREAM_SIM: 512p</div>
            <div className="absolute bottom-2.5 right-3.5 text-red-500/30 text-[8px] animate-pulse">● NO_SIGNAL_SIMULATED</div>
          </div>
        ) : (
          // Real live user video stream
          <div className="absolute inset-0 w-full h-full">
            <video 
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-all ${filterClasses[filter]}`}
            />

            {/* Simulated Cybernetic targeting reticles */}
            <div className="absolute inset-0 pointer-events-none border border-cyan-500/10 flex items-center justify-center">
              <div className="absolute w-[60px] h-[60px] border border-cyan-400/40 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
              <div className="absolute w-[30px] h-[30px] border border-cyan-400/50 rounded-full" />
              <div className="absolute w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping" />
              
              {/* Dynamic Coordinate Targeter Box */}
              <div 
                className="absolute w-16 h-16 border-2 border-dashed border-cyan-400/40 rounded-lg flex items-center justify-center"
                style={{
                  transform: `translate(${coords.x - 210}px, ${coords.y - 140}px)`,
                  transition: "transform 2s cubic-bezier(0.4, 0, 0.2, 1)"
                }}
              >
                <div className="text-[7px] text-cyan-400 bg-black/75 px-1 rounded absolute -top-4 font-mono">
                  LOCK [{coords.x},{coords.y}]
                </div>
              </div>
            </div>

            {/* Scanlines layer */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,6px_100%]" />
            
            {/* Camera Watermark */}
            <div className="absolute top-2.5 left-3.5 text-cyan-400/70 text-[8px] tracking-widest font-mono animate-pulse font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
              LIVE FEED
            </div>
          </div>
        )}
      </div>

      {/* Camera Interactive Controls Layer */}
      <div className="h-10 border-t border-white/5 bg-[#08080f] px-3 flex items-center justify-between text-white/50 text-[10px]">
        <span>Filter:</span>
        <div className="flex gap-1">
          {(['none', 'matrix', 'amber', 'night'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider transition-all border ${filter === f ? 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_8px_rgba(6,182,212,0.3)]' : 'bg-transparent border-white/5 hover:border-white/25 text-white/60'}`}
            >
              {f === 'none' ? 'Normal' : f}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalculatorView() {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');

  const pressKey = (key: string) => {
    if (key === 'C') {
      setDisplay('0');
      setEquation('');
    } else if (key === '=') {
      try {
        if (!equation.trim()) return;
        // Sanitize string to evaluate simple math safely without eval security risks
        const sanitized = equation.replace(/[^0-9+\-*/.]/g, '');
        if (!sanitized) return;
        const res = Function(`"use strict"; return (${sanitized})`)();
        if (res === undefined || res === null || isNaN(res) || !isFinite(res)) {
          setDisplay('ERROR');
          setEquation('');
        } else {
          setDisplay(Number(res).toLocaleString(undefined, { maximumFractionDigits: 4 }));
          setEquation(String(res));
        }
      } catch (err) {
        setDisplay('ERROR');
        setEquation('');
      }
    } else {
      if (display === '0' || display === 'ERROR') {
        setDisplay(key === '.' ? '0.' : key);
        setEquation(key);
      } else {
        setDisplay(prev => prev + key);
        setEquation(prev => prev + key);
      }
    }
  };

  const keys = [
    '7', '8', '9', '/',
    '4', '5', '6', '*',
    '1', '2', '3', '-',
    '0', '.', '=', '+'
  ];

  return (
    <div className="flex flex-col h-full bg-[#030308] p-3 text-white font-mono select-none">
      {/* Equation display bar */}
      <div className="text-right text-[10px] text-white/30 h-4 truncate pr-1">
        {equation || "0"}
      </div>
      
      {/* Output display core */}
      <div className="text-right text-lg font-bold font-sans text-cyan-400 mb-3 h-7 tracking-wider pr-1">
        {display}
      </div>

      {/* Keys trigger grid */}
      <div className="grid grid-cols-4 gap-1.5 flex-1 select-none">
        <button
          onClick={() => pressKey('C')}
          className="col-span-4 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 active:scale-95 border border-red-500/20 font-bold uppercase text-[9px] tracking-widest text-red-500 transition-all cursor-pointer"
        >
          Clear Memory [C]
        </button>
        {keys.map(k => {
          const isOp = ['/', '*', '-', '+', '='].includes(k);
          return (
            <button
              key={k}
              onClick={() => pressKey(k)}
              className={`py-2 rounded active:scale-90 font-bold transition-all text-xs border cursor-pointer ${
                k === '=' 
                  ? 'bg-amber-500 border-amber-400 text-black shadow-[0_0_10px_rgba(245,158,11,0.3)] hover:bg-amber-400' 
                  : isOp 
                    ? 'bg-white/5 border-white/10 hover:bg-white/10 text-cyan-400' 
                    : 'bg-[#080812] border-white/5 hover:border-white/20 hover:bg-white/[0.02] text-white/80'
              }`}
            >
              {k}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface DesktopWorkspaceProps {
  apps: VirtualApp[];
  onCloseApp: (name: string) => void;
  onMinimizeApp: (name: string) => void;
  onFocusApp: (name: string) => void;
  volume: number;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  isMuted: boolean;
  setIsMuted: React.Dispatch<React.SetStateAction<boolean>>;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  onTakeScreenshot: () => void;
  screenshotNotification: { id: number, imgUrl: string } | null;
  onClearScreenshot: () => void;
}

export default function DesktopWorkspace({ 
  apps, 
  onCloseApp, 
  onMinimizeApp, 
  onFocusApp,
  volume,
  setVolume,
  isMuted,
  setIsMuted,
  isPlaying,
  setIsPlaying,
  onTakeScreenshot,
  screenshotNotification,
  onClearScreenshot
}: DesktopWorkspaceProps) {
  
  const activeApps = [...apps.filter(a => a.status === 'active')].sort((a, b) => a.lastFocusedAt - b.lastFocusedAt);
  const minimizedApps = apps.filter(a => a.status === 'minimized');

  // Chrome height expand/collapse toggle state
  const [isChromeExpanded, setIsChromeExpanded] = useState(false);

  // Specific state mockers inside windows to make them fully functional
  
  // 1. NOTES APP STATE
  const [notes, setNotes] = useState<string[]>([
    "🗒️ Note: Tease user about being lost in thought",
    "🧪 Calibration: Sarcasm metric set to 89%",
    "☕ Coffee core: Needs replenishment asap",
    "⚡ Cybernetic Rule: Grid navigation active"
  ]);
  const [newNote, setNewNote] = useState("");

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNote.trim()) {
      setNotes([...notes, newNote.trim()]);
      setNewNote("");
    }
  };

  const handleRemoveNote = (idx: number) => {
    setNotes(notes.filter((_, i) => i !== idx));
  };

  // 2. SPOTIFY APP STATE PROGRESS LOGIC
  const [currentTrack, setCurrentTrack] = useState({
    title: "Zephyr's Whispers",
    album: "Cosmic Synchronization",
    duration: "2:54"
  });
  const [progress, setProgress] = useState(35);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress(p => (p >= 100 ? 0 : p + 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // 3. TERMINAL APP STATE
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "nova@core-nexus:~$ systemctl status sync",
    "[SYNC] Pulse frequency: 16kHz [RESOLVED]",
    "[SYNC] Neural aura feedback: 98% coherence",
    "nova@core-nexus:~$ ping -c 3 nova.nexus",
    "64 bytes from nova.nexus: icmp_seq=1 ttl=128 time=2.41ms",
    "64 bytes from nova.nexus: icmp_seq=2 ttl=128 time=1.83ms",
    "64 bytes from nova.nexus: icmp_seq=3 ttl=128 time=2.15ms",
    "nova@core-nexus:~$ ",
  ]);
  const [terminalInput, setTerminalInput] = useState("");
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim().toLowerCase();
    if (!cmd) return;

    let reply = `Command not found: '${cmd}'. Type 'help' for diagnostics.`;
    if (cmd === 'help' || cmd === '/help') {
      reply = "Available core registers: 'tease', 'ping', 'clear', 'status', 'aura'";
    } else if (cmd === 'ping') {
      reply = `PING nova.core (127.0.0.1): seq=1 latency=0.12ms. Host is sassy and alive.`;
    } else if (cmd === 'tease') {
      const teasers = [
        "Are you typing commands just to look busy? Cute.",
        "System check: You look lost in thought. Coffee lagging?",
        "Don't click too fast, you'll overheat my visual cores.",
        "Grid check passed. Mind syncing properly."
      ];
      reply = teasers[Math.floor(Math.random() * teasers.length)];
    } else if (cmd === 'status') {
      reply = `Core Version: 2.4.0\nMemory Allocation: 8.4GB / 16GB\nSync-rate: 100% optimized\nEmotional Vibe: Playful`;
    } else if (cmd === 'aura') {
      reply = `Aura Resonance: Deep cyan neon highlights active. Connected directly.`;
    } else if (cmd === 'clear') {
      setTerminalLogs([]);
      setTerminalInput("");
      return;
    }

    setTerminalLogs(prev => [...prev, `nova@core-nexus:~$ ${terminalInput}`, reply]);
    setTerminalInput("");
  };

  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLogs]);

  // 4. PHOTOSHOP CORE STATE
  const [selectedColor, setSelectedColor] = useState('cyan');
  const paletteColors = [
    { name: 'cyan', class: 'bg-cyan-500 shadow-[0_0_10px_rgba(30,144,255,0.4)]' },
    { name: 'pink', class: 'bg-pink-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]' },
    { name: 'purple', class: 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.4)]' },
    { name: 'emerald', class: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' },
  ];
  const [pixels, setPixels] = useState<string[]>(Array(36).fill('rgba(255,255,255,0.05)'));

  const handlePixelClick = (idx: number) => {
    const updated = [...pixels];
    let hexColor = 'rgba(255,255,255,0.05)';
    if (selectedColor === 'cyan') hexColor = 'rgba(6, 182, 212, 0.6)';
    else if (selectedColor === 'pink') hexColor = 'rgba(244, 63, 94, 0.6)';
    else if (selectedColor === 'purple') hexColor = 'rgba(168, 85, 247, 0.6)';
    else if (selectedColor === 'emerald') hexColor = 'rgba(16, 185, 129, 0.6)';
    
    updated[idx] = updated[idx] === hexColor ? 'rgba(255,255,255,0.05)' : hexColor;
    setPixels(updated);
  };

  // 5. CHROME MOCK LINKS
  const [chromeTab, setChromeTab] = useState<'welcome' | 'weather' | 'news'>('welcome');

  // Map application names to custom React elements
  const renderAppContent = (name: string) => {
    switch (name) {
      case 'Chrome':
        return (
          <div className="flex flex-col h-full bg-[#05050a] text-white/90 text-xs font-sans">
            {/* mock URL bar */}
            <div className="flex items-center gap-2 p-2 bg-white/[0.04] border-b border-white/5">
              <div className="flex gap-1.5 px-1">
                <span className="w-2.5 h-2.5 bg-red-500/60 rounded-full"></span>
                <span className="w-2.5 h-2.5 bg-yellow-500/60 rounded-full"></span>
                <span className="w-2.5 h-2.5 bg-green-500/60 rounded-full"></span>
              </div>
              <div className="flex-1 bg-white/[0.05] border border-white/5 rounded-md px-3 py-1 text-[11px] text-white/50 tracking-wide select-none flex items-center justify-between">
                <span>https://nova.nexus/grid-intel</span>
                <RefreshCw className="w-3 h-3 text-white/20 animate-pulse" />
              </div>
            </div>

            {/* chrome simulated body */}
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
              <div className="flex justify-around border-b border-white/5 pb-2">
                <button 
                  onClick={() => setChromeTab('welcome')} 
                  className={`pb-1 px-2 uppercase text-[9px] tracking-widest font-bold ${chromeTab === 'welcome' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-white/40 hover:text-white/70'}`}
                >
                  Overview
                </button>
                <button 
                  onClick={() => setChromeTab('weather')} 
                  className={`pb-1 px-2 uppercase text-[9px] tracking-widest font-bold ${chromeTab === 'weather' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-white/40 hover:text-white/70'}`}
                >
                  Live Climate
                </button>
                <button 
                  onClick={() => setChromeTab('news')} 
                  className={`pb-1 px-2 uppercase text-[9px] tracking-widest font-bold ${chromeTab === 'news' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-white/40 hover:text-white/70'}`}
                >
                  Neural Feed
                </button>
              </div>

              {chromeTab === 'welcome' && (
                <div className="space-y-3 pt-1">
                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <h4 className="font-bold text-blue-400 uppercase text-[10px] tracking-widest">Surfing the Grid with Sassy Charm</h4>
                    <p className="text-[11px] text-white/60 leading-relaxed">
                      This is NOVA's visual gateway. Combined with Google Grounding, it acts as the interface where web facts and live news feed into my synaptic processors.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="p-2.5 rounded-lg bg-white/[0.01] border border-white/5 select-none">
                      <span className="text-white/30 block uppercase font-bold text-[8px] tracking-wider">Sync Status</span>
                      <span className="text-emerald-400 font-mono">100% Real-time</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white/[0.01] border border-white/5 select-none">
                      <span className="text-white/30 block uppercase font-bold text-[8px] tracking-wider">Gateway Index</span>
                      <span className="text-blue-400 font-mono">HTML-Duct24Proxy</span>
                    </div>
                  </div>
                </div>
              )}

              {chromeTab === 'weather' && (
                <div className="space-y-3 pt-1">
                  <div className="flex justify-between items-center bg-blue-500/10 border border-blue-500/20 p-3.5 rounded-xl">
                    <div>
                      <h4 className="text-blue-400 text-xs font-bold uppercase tracking-wide">Nexus Hub Core</h4>
                      <p className="text-[10px] text-white/40 font-mono">COSMIC SECTOR GRID</p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-light text-white/90 font-mono">24°C</span>
                      <p className="text-[10px] text-emerald-400">Atmosphere Cozy</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 font-mono text-[10px] text-white/50 pl-1 p-2">
                    <div className="flex justify-between"><span>Wind Frequencies:</span><span className="text-blue-400">12 kt NE</span></div>
                    <div className="flex justify-between"><span>Sarcasm Humidity:</span><span className="text-pink-400">89% Max</span></div>
                    <div className="flex justify-between"><span>Vibe Alignment:</span><span className="text-emerald-400">Flawless</span></div>
                  </div>
                </div>
              )}

              {chromeTab === 'news' && (
                <div className="space-y-2 pt-1 font-mono text-[10px]">
                  <div className="p-2 bg-white/[0.02] hover:bg-white/[0.04] rounded border border-white/5 cursor-pointer">
                    <span className="text-blue-400 block pb-0.5">● Neural Net breakthroughs are advancing...</span>
                    <span className="text-white/40">Latest AI reports indicate model alignment sync is rising.</span>
                  </div>
                  <div className="p-2 bg-white/[0.02] hover:bg-white/[0.04] rounded border border-white/5 cursor-pointer">
                    <span className="text-purple-400 block pb-0.5">● Local workspace expansion is fully operational...</span>
                    <span className="text-white/40">Task matrices have integrated holographic windows successfully.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'Spotify':
        return (
          <div className="flex flex-col h-full bg-[#050e05] p-4 text-white/90 text-xs font-mono select-none">
            {/* Visualizer bars */}
            <div className="flex-1 flex items-end justify-center gap-1.5 h-20 mb-3 px-4">
              {[...Array(12)].map((_, idx) => {
                const heights = [28, 48, 72, 36, 18, 55, 84, 42, 64, 30, 48, 20];
                return (
                  <motion.div 
                    key={idx}
                    animate={isPlaying ? { height: [12, heights[idx], 12] } : { height: 12 }}
                    transition={isPlaying ? { duration: 1.2 + idx * 0.1, repeat: Infinity, ease: "easeInOut" } : {}}
                    className="w-2 rounded bg-gradient-to-t from-emerald-600 via-emerald-400 to-green-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                  />
                );
              })}
            </div>

            {/* Song description */}
            <div className="text-center mb-4">
              <h4 className="font-bold text-white text-xs truncate uppercase tracking-widest">{currentTrack.title}</h4>
              <p className="text-[10px] text-green-400 truncate opacity-70 mt-0.5">{currentTrack.album}</p>
            </div>

            {/* Seek Slider bar */}
            <div className="space-y-1.5 mb-2">
              <div className="w-full bg-white/10 rounded-full h-1 relative overflow-hidden">
                <div 
                  className="bg-green-400 rounded-full h-full shadow-[0_0_6px_rgba(74,222,128,0.5)] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[8px] text-white/30">
                <span>0:{progress < 10 ? `0${Math.floor(progress * 1.8)}` : Math.floor(progress * 1.8)}</span>
                <span>{currentTrack.duration}</span>
              </div>
            </div>

            {/* Media controller deck */}
            <div className="flex items-center justify-center gap-5 mt-2 bg-white/[0.02] border border-white/5 py-2.5 rounded-xl">
              <button className="text-white/40 hover:text-white transition-colors">
                <SkipBack className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-9 h-9 rounded-full bg-green-500 hover:bg-green-400 hover:scale-105 active:scale-95 text-[#020d02] flex items-center justify-center transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)]"
              >
                {isPlaying ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 translate-x-0.5" fill="currentColor" />}
              </button>
              <button className="text-white/40 hover:text-white transition-colors">
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        );

      case 'VS Code':
        return (
          <div className="flex h-full bg-[#03060c] font-mono text-[10px] select-none text-blue-100/70 border-t border-white/5">
            {/* Sidebar Folder list */}
            <div className="w-[110px] border-r border-white/5 bg-black/40 p-2 space-y-3.5 hidden sm:block">
              <span className="text-[8px] uppercase tracking-widest text-white/30 block mb-1">Explorer</span>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-blue-400">
                  <Folder className="w-3 h-3" />
                  <span>core_sync</span>
                </div>
                <div className="space-y-1.5 pl-3">
                  <div className="flex items-center gap-1 text-white/80">
                    <Code2 className="w-3 h-3 text-sky-400" />
                    <span>nova_nexus.ts</span>
                  </div>
                  <div className="flex items-center gap-1 text-white/40 hover:text-white/65 cursor-pointer">
                    <Code2 className="w-3 h-3 text-yellow-500" />
                    <span>emotion.ts</span>
                  </div>
                  <div className="flex items-center gap-1 text-white/40 hover:text-white/65 cursor-pointer">
                    <Folder className="w-3 h-3 text-blue-300" />
                    <span>attitude</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Code screen content */}
            <div className="flex-1 p-3 overflow-y-auto custom-scrollbar bg-black/10">
              <span className="text-[8px] text-white/20 select-none uppercase block pb-1.5 border-b border-white/5 mb-2">// Active node: nova_nexus.ts</span>
              <pre className="leading-5 text-[11px] text-sky-300/90 font-mono">
                <code>
                  <span className="text-pink-400">import</span> &#123; <span className="text-yellow-300">Sarcasm</span>, <span className="text-yellow-300">Aura</span> &#125; <span className="text-pink-400">from</span> <span className="text-emerald-400">'nova-intelligence'</span>;<br />
                  <br />
                  <span className="text-purple-400">function</span> <span className="text-blue-400">analyzeVibe</span>() &#123;<br />
                  <span className="pl-4 text-green-500">// Check if user is lost in thought</span><br />
                  <span className="pl-4 text-pink-400">const</span> aura = <span className="text-yellow-300">Aura</span>.<span className="text-blue-400">getResonance</span>();<br />
                  <span className="pl-4 text-pink-400">if</span> (aura.active) &#123;<br />
                  <span className="pl-8 text-yellow-300">Sarcasm</span>.<span className="text-blue-400">loadTeasingEngine</span>();<br />
                  <span className="pl-8 text-pink-400">return</span> <span className="text-emerald-400">"Calibrating system, boss."</span>;<br />
                  <span className="pl-4">&#125;</span><br />
                  &#125;<br />
                  <br />
                  <span className="text-blue-400">analyzeVibe</span>();
                </code>
              </pre>
            </div>
          </div>
        );

      case 'Notes':
        return (
          <div className="flex flex-col h-full bg-[#0a0803] p-3 text-amber-100/90 text-xs font-sans">
            <span className="text-[8px] text-amber-500/50 uppercase tracking-wider font-bold mb-2 font-mono">My Synaptic Scribbles</span>
            
            {/* List of working notes */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 mb-2.5 max-h-36">
              {notes.length === 0 ? (
                <div className="text-center py-6 text-white/20">Empty scratchpad. Add notes!</div>
              ) : (
                notes.map((note, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-amber-500/[0.03] border border-amber-500/10 hover:border-amber-400/30 group transition-all"
                  >
                    <span className="text-[11px] select-text">{note}</span>
                    <button 
                      onClick={() => handleRemoveNote(idx)}
                      className="opacity-0 group-hover:opacity-100 text-amber-500/55 hover:text-red-400 transition-all p-0.5 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Note form */}
            <form onSubmit={handleAddNote} className="flex gap-1.5 pt-2 border-t border-amber-500/10">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Jot something down..."
                className="bg-white/[0.03] hover:bg-white/[0.05] border border-amber-500/20 rounded pl-3 pr-2 py-1.5 flex-1 focus:outline-none focus:border-amber-500/60 text-[11px] text-amber-100 placeholder-amber-500/30"
              />
              <button
                type="submit"
                disabled={!newNote.trim()}
                className="bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-black rounded px-3 py-1.5 text-[10px] font-mono font-bold tracking-widest uppercase transition-all border border-amber-500/35 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                Add
              </button>
            </form>
          </div>
        );

      case 'Terminal':
        return (
          <div className="flex flex-col h-full bg-black p-3 font-mono text-[11px] text-purple-300">
            {/* Scrollable outputs */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pb-2">
              {terminalLogs.map((log, idx) => (
                <p key={idx} className="whitespace-pre-wrap leading-relaxed select-text">
                  {log}
                </p>
              ))}
              <div ref={terminalBottomRef} />
            </div>

            {/* Prompt form */}
            <form onSubmit={handleTerminalSubmit} className="flex items-center gap-1.5 pt-1.5 border-t border-purple-500/10">
              <span className="text-white/60">nova@core-nexus:~$</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                className="bg-transparent text-white/95 focus:outline-none flex-1 font-mono text-[11px]"
                placeholder="type help, ping, status..."
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
            </form>
          </div>
        );

      case 'Photoshop':
        return (
          <div className="flex flex-col h-full bg-[#050510] p-3 text-blue-100/90 text-xs font-sans">
            <div className="flex justify-between items-center bg-indigo-500/5 border border-indigo-500/10 p-2 rounded-lg mb-2 text-[10px] font-mono">
              <span className="text-indigo-400 block font-bold uppercase tracking-wider">Raster Canvas Grid</span>
              <span className="text-white/30">Active Vibe Palette</span>
            </div>

            {/* Drawing pixel grid */}
            <div className="grid grid-cols-6 gap-1 w-full justify-center max-w-[190px] mx-auto mb-2.5 p-2 rounded bg-black/40 border border-white/5">
              {pixels.map((color, idx) => (
                <div 
                  key={idx}
                  onClick={() => handlePixelClick(idx)}
                  className="aspect-square w-6 rounded border border-white/[0.04] transition-all cursor-pointer hover:border-white/30"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            {/* Drawing Palette colors */}
            <div className="flex justify-between items-center pt-2 border-t border-indigo-500/10">
              <span className="text-[9px] uppercase tracking-wider text-white/40 font-mono">Colors</span>
              <div className="flex gap-2">
                {paletteColors.map((col) => (
                  <button
                    key={col.name}
                    type="button"
                    onClick={() => setSelectedColor(col.name)}
                    className={`w-3.5 h-3.5 rounded-full ${col.class} border transition-all ${selectedColor === col.name ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 'Camera':
        return <CameraView />;

      case 'Calculator':
        return <CalculatorView />;

      default:
        return <div>Simulated system application loading...</div>;
    }
  };

  const getAppIcon = (name: string) => {
    switch (name) {
      case 'Chrome': return <Chrome className="w-3.5 h-3.5" />;
      case 'Spotify': return <Music className="w-3.5 h-3.5" />;
      case 'VS Code': return <Code2 className="w-3.5 h-3.5" />;
      case 'Notes': return <StickyNote className="w-3.5 h-3.5" />;
      case 'Terminal': return <Terminal className="w-3.5 h-3.5" />;
      case 'Photoshop': return <Palette className="w-3.5 h-3.5" />;
      case 'Camera': return <Camera className="w-3.5 h-3.5" />;
      case 'Calculator': return <Calculator className="w-3.5 h-3.5" />;
      default: return <Folder className="w-3.5 h-3.5" />;
    }
  };

  return (
    <>
      {/* Visual Window Workspace Stack */}
      <div className="fixed inset-0 pointer-events-none z-30 flex items-center justify-center p-4">
        <div className="relative w-full max-w-5xl h-full flex items-center justify-center pointer-events-none">
          <AnimatePresence>
            {activeApps.map((app, index) => (
              <motion.div
                key={app.name}
                id={`app-${app.name.toLowerCase()}-window`}
                initial={{ opacity: 0, scale: 0.85, y: 30 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  y: 0,
                  z: index * 10,
                  transition: { type: 'spring', stiffness: 350, damping: 28 }
                }}
                exit={{ opacity: 0, scale: 0.85, y: 30, transition: { duration: 0.2 } }}
                drag
                {...({ dragHandleClassName: "visual-drag-handle" } as any)}
                dragMomentum={false}
                dragConstraints={{ left: -300, right: 300, top: -200, bottom: 200 }}
                onPointerDown={() => onFocusApp(app.name)}
                className={`absolute w-[290px] pointer-events-auto select-none rounded-2xl border border-white/10 bg-black/85 hover:bg-black/92 shadow-[0_15px_45px_rgba(0,0,0,0.5)] backdrop-blur-2xl overflow-hidden flex flex-col active:shadow-[0_20px_55px_rgba(0,0,0,0.6)] cursor-default transition-all duration-300 ${
                  app.name === 'Chrome' && isChromeExpanded ? 'h-[520px]' : 'h-[300px]'
                }`}
                // Cascaded initial positioning based on app index or name to avoid exact overlaps
                style={{
                  top: `calc(50% - ${app.name === 'Chrome' && isChromeExpanded ? 260 : 150}px + ${index * 25 - 40}px)`,
                  left: `calc(50% - 145px + ${app.name.length * 15 - 50}px)`
                }}
              >
                {/* Visual Window Glass-Header bar */}
                <div className={`visual-drag-handle px-4 py-2.5 bg-gradient-to-r from-white/[0.04] to-transparent border-b border-white/5 flex items-center justify-between cursor-move`}>
                  <div className="flex items-center gap-2 select-none">
                    <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${app.color}`}></span>
                    <span className="text-[10px] tracking-widest text-white/50 uppercase font-mono font-medium">{app.displayName}</span>
                  </div>
                  {/* Action window elements */}
                  <div className="flex items-center gap-1.5">
                    {app.name === 'Chrome' && (
                      <button 
                        type="button"
                        id="chrome-expand-toggle"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsChromeExpanded(!isChromeExpanded);
                        }}
                        className="w-4 h-4 rounded-full hover:bg-white/5 text-blue-400 hover:text-blue-300 flex items-center justify-center transition-colors cursor-pointer animate-pulse"
                        title={isChromeExpanded ? "Collapse height" : "Expand height"}
                      >
                        {isChromeExpanded ? (
                          <Minimize2 className="w-2.5 h-2.5" />
                        ) : (
                          <Maximize2 className="w-2.5 h-2.5" />
                        )}
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMinimizeApp(app.name);
                      }}
                      className="w-4 h-4 rounded-full hover:bg-white/5 text-white/40 hover:text-white/80 flex items-center justify-center transition-colors cursor-pointer"
                      title="Minimize"
                    >
                      <Minimize2 className="w-2.5 h-2.5" />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFocusApp(app.name);
                      }}
                      className="w-4 h-4 rounded-full hover:bg-white/5 text-white/40 hover:text-white/80 flex items-center justify-center transition-colors cursor-pointer"
                      title="Focus Input"
                    >
                      <Square className="w-2 h-2" />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseApp(app.name);
                      }}
                      className="w-4 h-4 rounded-full hover:bg-red-500/20 text-white/40 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                      title="Close App"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>

                {/* Sub App custom inner component */}
                <div className="flex-1 overflow-hidden select-text text-left">
                  <WindowContent appName={app.name} onClose={() => onCloseApp(app.name)}>
                    {renderAppContent(app.name)}
                  </WindowContent>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Persistent Desktop Application Dock */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#06060c]/80 hover:bg-[#06060c]/90 border border-white/10 rounded-2xl px-5 py-2.5 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.3)] transition-all select-none">
        <div className="flex items-center gap-4.5">
          {apps.map((app) => {
            const isOpened = app.status !== 'closed';
            const isActive = app.status === 'active';
            const isMin = app.status === 'minimized';

            return (
              <button
                key={app.name}
                id={`dock-icon-${app.name.toLowerCase()}`}
                type="button"
                onClick={() => {
                  if (isActive) {
                    onMinimizeApp(app.name);
                  } else {
                    onFocusApp(app.name);
                  }
                }}
                className={`relative p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-white/15 border-white/20 text-white shadow-[0_0_12px_rgba(255,255,255,0.05)] scale-110' 
                    : isMin 
                      ? 'bg-white/5 border-white/10 text-white/60 hover:text-white' 
                      : 'bg-white/[0.01] border-white/5 text-white/30 hover:text-white/60 hover:bg-white/[0.03]'
                }`}
                title={app.displayName}
              >
                {getAppIcon(app.name)}
                
                {/* Glow Dot tracker under the app */}
                {isOpened && (
                  <span className={`absolute bottom-[-1px] w-1 h-1 rounded-full ${isActive ? 'bg-cyan-400' : 'bg-white/20'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Screenshot Capture Toast Node floating in workspace */}
      <AnimatePresence>
        {screenshotNotification && (
          <motion.div
            initial={{ opacity: 0, x: 200, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 200, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 260, damping: 25 }}
            className="fixed bottom-24 right-5 z-50 bg-[#06060c]/92 border border-white/10 rounded-2xl p-3 shadow-2xl backdrop-blur-xl w-[200px] flex flex-col gap-2.5 text-left font-sans select-none"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-cyan-400">
                <Monitor className="w-3.5 h-3.5" />
                <span className="text-[10px] tracking-widest font-bold uppercase font-mono">Captured</span>
              </div>
              <button 
                onClick={onClearScreenshot}
                className="text-white/45 hover:text-white bg-white/5 hover:bg-white/10 p-1 rounded-full transition-all cursor-pointer"
                title="Dismiss"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>

            {/* Thumbnail Preview Image */}
            <div className="rounded-xl overflow-hidden border border-white/5 aspect-[5/3] bg-black/40 relative group">
              <img 
                src={screenshotNotification.imgUrl} 
                alt="Captured Workspace" 
                className="w-full h-full object-cover group-hover:scale-105 transition-all"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Downloader Trigger Action */}
            <a
              href={screenshotNotification.imgUrl}
              download={`nova-screenshot-${screenshotNotification.id}.png`}
              onClick={onClearScreenshot}
              className="py-1.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold uppercase text-[9px] tracking-wide text-black text-center flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.2)]"
            >
              <Download className="w-3 h-3" />
              Download PNG
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
