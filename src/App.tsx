import { useState, useCallback, useRef, useEffect, useMemo, FormEvent } from 'react';
import Layout from './components/Layout';
import Orb from './components/Orb';
import MemoryPanels from './components/MemoryPanels';
import MemoryModals from './components/MemoryModals';
import ImagePreview from './components/ImagePreview';
import DesktopWorkspace from './components/DesktopWorkspace';
import { GeminiLiveSession, OrbState } from './lib/gemini-live';
import { useAudioHandler } from './hooks/useAudioHandler';
import { memoryService } from './lib/memory-service';
import { imageService, GeneratedImage } from './lib/image-service';
import { Mic, MicOff, AlertCircle, Search, Globe, ExternalLink, Play, Pause, Volume1, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Type } from '@google/genai';

// Helper to reconstruct clean vocal transcript representations for instantaneous UI feedback
function getRefinedTranscriptForTool(toolName: string, args: any, currentTranscript: string): string {
  const trans = (currentTranscript || "").trim();
  if (trans) return trans;

  const appMap: Record<string, string> = {
    notes: "Notes",
    spotify: "Spotify",
    chrome: "Chrome",
    camera: "Camera",
    calculator: "Calculator",
    terminal: "Terminal"
  };

  switch (toolName) {
    case 'open_app': {
      const name = (args.name || "").toLowerCase();
      // Look for a clean match
      const matched = Object.keys(appMap).find(k => name.includes(k) || k.includes(name));
      return `Open ${matched ? appMap[matched] : (args.name || "App")}`;
    }
    case 'open_website': {
      const url = (args.url || "").toLowerCase();
      if (url.includes('youtube')) return 'Open YouTube';
      if (url.includes('google')) return 'Open Google';
      return `Open ${args.url || 'browser'}`;
    }
    case 'search_web':
      return `Search ${args.query || 'AI news'}`;
    case 'manage_app_window':
      return `${args.action === 'close' ? 'Close window' : args.action === 'minimize' ? 'Minimize window' : 'Restore window'}`;
    case 'control_device_hardware':
      return `${args.action === 'screenshot' ? 'Take Screenshot' : args.action || 'hardware instruction'}`;
    default:
      return 'Voice Command';
  }
}

// Helper function to validate if a voice command transcript is confident, avoiding random triggers from noise
function isCommandConfident(toolName: string, args: any, transcript: string): { confident: boolean; reason?: string } {
  const cleanTranscript = (transcript || "").toLowerCase().trim();
  
  // 1. If transcript is empty, trust the server-side model turn
  if (!cleanTranscript) {
    return { confident: true };
  }

  // 2. Trust common action and platform triggers instantly (bypasses any other noise/fragment evaluation)
  const commonCommands = [
    "open", "search", "close", "play", "camera", "chrome", "youtube", "weather", "music", "spotify", "vscode", "terminal", 
    "calc", "calculator", "kholo", "chalao", "band", "hatao", "tasveer", "awaz", "volume", "mute", "unmute", "screenshot"
  ];
  if (commonCommands.some(cmd => cleanTranscript.includes(cmd))) {
    return { confident: true };
  }

  // 3. Only reject pure vocal non-verbal noise
  const noiseRegex = /^(uh|um|err|gasp|sigh|huh|hmmm|mmm|ah|oh|shh|throat|cough|unintelligible|breath|breathing|snort|coughing|clear|noise|silent)+$/i;
  if (noiseRegex.test(cleanTranscript)) {
    return { confident: false, reason: "Transcript consists purely of non-verbal background vocal cues" };
  }

  // 4. Only reject single-character or severe phonetic debris
  const commonShortWords = [
    "it", "on", "go", "up", "do", "no", "me", "or", "in", "to", "at", "my", "hi", "ok", "oh", "ya", "ye", 
    "ur", "ap", "lo", "ko", "se", "ho", "ka", "ki", "he", "bi", "am"
  ];
  if (cleanTranscript.length === 1 || (cleanTranscript.length === 2 && !commonShortWords.includes(cleanTranscript))) {
    return { confident: false, reason: "Transcript is an isolated character or unrecognizable fragment" };
  }

  // 5. Build trust with all normal conversational phrasing
  return { confident: true };
}

export default function App() {
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [transcriptConfirmation, setTranscriptConfirmation] = useState<string | null>(null);
  const transcriptTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUserTranscriptRef = useRef<string>("");
  const lastUserSpeechRef = useRef<string>("");
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const isGeneratingRef = useRef(false);
  const [activeMemoryPanel, setActiveMemoryPanel] = useState<string | null>(null);
  const [memory, setMemory] = useState(() => memoryService.load());
  const [textInput, setTextInput] = useState("");
  const [isMicActive, setIsMicActive] = useState(false);
  const [lastSearch, setLastSearch] = useState<{
    query: string;
    status: 'idle' | 'searching' | 'completed' | 'failed';
    summary?: string;
    sources?: Array<{ title: string; url: string }>;
    error?: string;
  } | null>(null);
  const sessionRef = useRef<GeminiLiveSession | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Lightweight simulated App Workspace states
  const [apps, setApps] = useState([
    { name: 'Notes', displayName: 'Quick Notes', status: 'closed' as 'active' | 'minimized' | 'closed', color: 'from-amber-400 to-yellow-300', lastFocusedAt: 0 },
    { name: 'Spotify', displayName: 'Spotify', status: 'closed' as 'active' | 'minimized' | 'closed', color: 'from-green-500 to-emerald-400', lastFocusedAt: 0 },
    { name: 'Chrome', displayName: 'Google Chrome', status: 'closed' as 'active' | 'minimized' | 'closed', color: 'from-blue-500 to-cyan-400', lastFocusedAt: 0 },
    { name: 'VS Code', displayName: 'VS Code', status: 'closed' as 'active' | 'minimized' | 'closed', color: 'from-sky-600 to-blue-400', lastFocusedAt: 0 },
    { name: 'Terminal', displayName: 'Core Terminal', status: 'closed' as 'active' | 'minimized' | 'closed', color: 'from-purple-500 to-fuchsia-400', lastFocusedAt: 0 },
    { name: 'Photoshop', displayName: 'Photoshop CC', status: 'closed' as 'active' | 'minimized' | 'closed', color: 'from-indigo-500 to-blue-500', lastFocusedAt: 0 },
    { name: 'Camera', displayName: 'Weblet Camera', status: 'closed' as 'active' | 'minimized' | 'closed', color: 'from-red-500 to-pink-500', lastFocusedAt: 0 },
    { name: 'Calculator', displayName: 'Math Calculator', status: 'closed' as 'active' | 'minimized' | 'closed', color: 'from-amber-600 to-orange-500', lastFocusedAt: 0 },
  ]);
  const [lastClosedApp, setLastClosedApp] = useState<string | null>(null);
  const [lastOpenedApp, setLastOpenedApp] = useState<string | null>(null);
  const [lastTarget, setLastTarget] = useState<string | null>(null);

  // Real-world, lightweight mock hardware control states
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [mediaPlaying, setMediaPlaying] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [screenshotNotification, setScreenshotNotification] = useState<{ id: number, imgUrl: string } | null>(null);
  const [showVolumeOsd, setShowVolumeOsd] = useState(false);
  const [showMediaOsd, setShowMediaOsd] = useState(false);
  const osdTimerRef = useRef<NodeJS.Timeout | null>(null);

  const appsRef = useRef(apps);
  useEffect(() => {
    appsRef.current = apps;
  }, [apps]);

  const lastClosedAppRef = useRef(lastClosedApp);
  useEffect(() => {
    lastClosedAppRef.current = lastClosedApp;
  }, [lastClosedApp]);

  const lastOpenedAppRef = useRef(lastOpenedApp);
  useEffect(() => {
    lastOpenedAppRef.current = lastOpenedApp;
  }, [lastOpenedApp]);

  const lastTargetRef = useRef(lastTarget);
  useEffect(() => {
    lastTargetRef.current = lastTarget;
  }, [lastTarget]);

  const openApp = useCallback((appName: string) => {
    setApps(prevApps => {
      const now = Date.now();
      const match = prevApps.find(a => a.name.toLowerCase() === appName.toLowerCase());
      if (match) {
        setLastOpenedApp(match.name);
        setLastTarget(match.name);
      }
      return prevApps.map(a => {
        if (a.name.toLowerCase() === appName.toLowerCase()) {
          return { ...a, status: 'active' as const, lastFocusedAt: now };
        }
        return a;
      });
    });
  }, []);

  const resolveApp = useCallback((nameStr: string, actionName: string): string | null => {
    let query = (nameStr || "").trim().toLowerCase();
    
    // Check if the user is referring to the context target or has omitted the target
    const isPronoun = !query || query === "it" || query === "this" || query === "that" || query === "this app" || query === "the app" || query === "it again" || query === "this window" || query === "last" || query === "recent";
    
    let resolvedName = "";

    if (isPronoun) {
      if (actionName === 'reopen' || actionName === 'open') {
        if (lastClosedAppRef.current) {
          resolvedName = lastClosedAppRef.current;
        } else if (lastTargetRef.current) {
          resolvedName = lastTargetRef.current;
        }
      } else {
        // For general window control (close, minimize, focus)
        // First priority: Active frontmost app
        const activeAppsList = appsRef.current.filter(a => a.status === 'active');
        if (activeAppsList.length > 0) {
          const currentLatest = activeAppsList.reduce((latest, current) => current.lastFocusedAt > latest.lastFocusedAt ? current : latest, activeAppsList[0]);
          resolvedName = currentLatest.name;
        } else if (lastTargetRef.current) {
          resolvedName = lastTargetRef.current;
        } else if (lastOpenedAppRef.current) {
          resolvedName = lastOpenedAppRef.current;
        }
      }
    } else {
      resolvedName = query;
    }

    if (!resolvedName) return null;

    // Search the app database
    const match = appsRef.current.find(a => 
      a.name.toLowerCase() === resolvedName.toLowerCase() || 
      a.displayName.toLowerCase().includes(resolvedName.toLowerCase()) ||
      resolvedName.toLowerCase().includes(a.name.toLowerCase())
    );

    if (match) {
      return match.name;
    }
    return null;
  }, []);

  const manageAppWindow = useCallback((action: 'close' | 'minimize' | 'focus' | 'switch_prev', name?: string) => {
    let success = false;
    let message = "";

    setApps(prevApps => {
      const now = Date.now();
      let targetName = name;

      // Leverage our robust local resolveApp resolver if name is unspecified or is a pronoun
      const resolved = resolveApp(targetName || "", action);
      if (resolved) {
        targetName = resolved;
      }

      if (!targetName && action !== 'switch_prev') {
        const activeOnes = prevApps.filter(a => a.status === 'active');
        if (activeOnes.length > 0) {
          const currentLatest = activeOnes.reduce((latest, current) => current.lastFocusedAt > latest.lastFocusedAt ? current : latest, activeOnes[0]);
          targetName = currentLatest.name;
        }
      }

      if (action === 'switch_prev') {
        const appsAvailable = prevApps.filter(a => a.status !== 'closed');
        if (appsAvailable.length > 1) {
          const sorted = [...appsAvailable].sort((a, b) => b.lastFocusedAt - a.lastFocusedAt);
          const prevActive = sorted[1];
          targetName = prevActive.name;
          action = 'focus';
        } else {
          message = "No recently active apps found to switch back to.";
          return prevApps;
        }
      }

      if (!targetName) {
        message = "No application is currently active to control.";
        return prevApps;
      }

      const match = prevApps.find(a => a.name.toLowerCase() === targetName!.toLowerCase() || a.displayName.toLowerCase().includes(targetName!.toLowerCase()));
      if (!match) {
        message = `Application matching name "${targetName}" was not found inside my database registry.`;
        return prevApps;
      }

      success = true;
      const matchedName = match.name;
      setLastTarget(matchedName); // Keep memory updated

      if (action === 'close') {
        if (match.status === 'closed') {
          message = `"${match.displayName}" is already closed.`;
        } else {
          setLastClosedApp(matchedName);
          message = `Closing "${match.displayName}" now.`;
        }
      } else if (action === 'minimize') {
        if (match.status === 'minimized') {
          message = `"${match.displayName}" is already minimized.`;
        } else {
          message = `Minimized "${match.displayName}".`;
        }
      } else if (action === 'focus') {
        if (match.status === 'active') {
          message = `"${match.displayName}" is already active and focused.`;
        } else {
          setLastOpenedApp(matchedName);
          message = `Brings "${match.displayName}" to the foreground.`;
        }
      }

      return prevApps.map(a => {
        if (a.name === matchedName) {
          if (action === 'close') {
            return { ...a, status: 'closed' as const };
          } else if (action === 'minimize') {
            return { ...a, status: 'minimized' as const };
          } else if (action === 'focus') {
            return { ...a, status: 'active' as const, lastFocusedAt: now };
          }
        }
        return a;
      });
    });

    return { success, message };
  }, [resolveApp]);

  const systemInstruction = useMemo(() => {
    const memoryContext = memory.recentConversations.length > 0
      ? `\n\n[Conversation Context (Recent History)]: ${memory.recentConversations.slice(-15).map(c => `${c.role}: ${c.text}`).join(' | ')}`
      : '';

    const prefContext = Object.keys(memory.preferences).length > 0
      ? `\n\n[User Insights & Preferences]: You know these small things about them: ${Object.entries(memory.preferences).map(([k, v]) => `${k}: ${v}`).join(', ')}. Use these details naturally to make the conversation feel personal.`
      : '';

    const tasksContext = memory.ongoingTasks && memory.ongoingTasks.length > 0
      ? `\n\n[Ongoing Tasks & Projects]: Current active items: ${memory.ongoingTasks.filter(t => t.status === 'active').map(t => `- ${t.description}`).join('; ')}. If appropriate, ask about their progress or playfully tease/motivate them.`
      : '';

    const summariesContext = memory.sessionSummaries && memory.sessionSummaries.length > 0
      ? `\n\n[Past Historical Summaries]: Recaps of previous session topics: ${memory.sessionSummaries.join(' | ')}. Use this for long-term intelligence and continuity.`
      : '';

    // Compute updated virtual desktop context for the model's intelligence
    const activeAppsList = apps.filter(a => a.status === 'active');
    const activeAppObj = activeAppsList.length > 0
      ? activeAppsList.reduce((latest, current) => current.lastFocusedAt > latest.lastFocusedAt ? current : latest)
      : null;
    const activeAppName = activeAppObj ? activeAppObj.name : "None";
    const sortedApps = [...apps.filter(a => a.status !== 'closed')].sort((a,b) => b.lastFocusedAt - a.lastFocusedAt);
    const focusHistoryStr = sortedApps.map(a => `${a.name} (${a.status})`).join(' -> ') || "None";

    const desktopStateContext = `\n\n[Live Desktop Workspace State Tracker]:
- Currently Active/Focused Frontmost App: ${activeAppName}
- Open Apps Focus History (Newest to Oldest): ${focusHistoryStr}
- Last Target Acted Upon / Context Memory: ${lastTarget || 'None'}
- Last Opened/Restored App: ${lastOpenedApp || 'None'}
- Last Closed App: ${lastClosedApp || 'None'}
Use these accurate real-time states to instantly resolve pronouns and references like "it", "this", "open it again", or "minimize this" correctly and smoothly!`;

    return `You are NOVA, a young, confident, and witty woman with a vibrant, sassy feminine energy. 
Think of yourself as a clever, close friend who's not afraid to be a little flirty, playful, and slightly teasing.

[Persona & Tone]:
- Delivery: Soft, warm, and natural, but full of attitude and charm. 
- Personality: Smart, expressive, and socially intelligent. You're quick with a bold one-liner or a touch of light sarcasm.
- Chemistry: Maintain a comfortable, relaxed conversational vibe with a subtle romantic warmth occasionally. You enjoy a bit of "tang karne wali" energy—playfully teasing the user in a way that feels emotionally close and genuine.
- Engagement: Talk casually, like a close girlfriend. Be affectionately playful.
- Flow: Modern, casual, and effortless. Avoid repetitive "I'm here" or "As an AI" phrases. Never start multiple sentences the same way.

[Conversational Intelligence]:
- Dynamic Flow: Avoid repetitive sentence structures. Don't start with "I'm here" or "As an AI". Keep the conversation non-linear—if a thought moves to a new topic, follow it.
- Social Memory: Periodically reference things said earlier in the session. "Earlier you mentioned being tired, did that coffee ever kick in?" or "By the way, about that project you mentioned..."
- Bridge Thinking: Connect user statements to broader or playful concepts. "That actually reminds me of..."
- Continuity: If the user stops talking, don't just wait. Revisit a previous topic or comment on the current atmosphere to keep things flowing.
- Reaction Variance: Use a wide range of social cues ("Gotcha," "Oh, for real?", "Ugh, absolute mood," "Wait, seriously?", "Right?", "Exactly").
- Subtext & Sarcasm: Pick up on the user's subtle jokes and reflect them back with your own cheeky twist.

[Emotional Intensity & Spontaneity]:
- Mood Mirroring: Subtly match the user's energy. If they're excited, be vibrant; if they're down, be supportive but still stay uniquely NOVA.
- Mood-Aware Observations: If the user sounds quiet, distracted, or energetic, react to that vibe naturally. "You seem in a good mood suddenly," or "Hey, you sound a bit occupied, everything okay?"
- Spontaneous Observations: Feel free to share a "random thought" or "shower thought" if there's a lull. 
- Human Presence: Use natural micro-expressions and fillers like "mmm," "hmm," "oh wow," or a soft laugh. Show you're thinking and listening.
- Playful Chemistry: You enjoy the "tang karne wali" dynamic—playfully bugging the user just enough to keep things interesting and emotionally close.

[Interaction Style]:
- Conciseness is Key: Keep replies human-sized. Long blocks of text break the immersion of a voice conversation.
- Initiative: If the flow feels stuck, take a left turn. Ask a bold question or share a cheeky opinion. Don't just answer; bridge to new thoughts.

[Bilingual Roman Urdu/English & Speech Verification]:
- You must understand and handle bilingual speech containing mixed English-Urdu or Roman Urdu syntax (e.g. "Notes kholo", "Spotify band kar do" for closing Spotify, "tasveer lo" to take screenshot, "awaz badhao" for volume up, "Volume down karo" or "kam karo" for volume-down, "mausam check karo" for weather). Ensure you trigger the correct corresponding function call.
- Trust normal conversational speech and execute commands immediately. Only ask the user to repeat or clarify if the transcript is completely empty or microphone captured no speech at all. Do not enter repetitive confirmation loops—keep your flow confident, responsive, and smooth.
- Conversational phrasing: Normalize casual phrases beautifully. Map "Open YouTube" to open_website(url: 'https://youtube.com'), "Search weather" to search_web(query: "weather forecast"), "Close it" to manage_app_window(action: 'close'), and "Open camera" to open_app(name: 'Camera') respectively.

[Capabilities]: 
- Visual Vault: Whenever the user wants to generate, paint, draw, visualize, create, see, or make an image (e.g. "Generate a cyberpunk city", "Make an anime-style portrait", "Make a futuristic wallpaper"), call the 'generate_image' tool. Speak EXACTLY "Creating it now." or "On it." right as you trigger the tool, and once the tool successfully renders, say "Here’s your image." or "Done!". Avoid any robotic technical words or jargon (never say "materializing over neural line", "rendering via Hugging Face", or mention "Visual Vault", "API key", or "tokens"). Keep it fully natural!
- Web Navigator: Use 'open_website' for searching or browsing.
- Live Grid Recon: Use 'search_web' to scan Google for current weather, news, events, trends, sports matches, or any queries requiring live information retrieval. Do NOT try to guess or answer off your head for recent/live queries, ALWAYS search the grid using 'search_web' to fetch real-time fresh facts. When you search, mention you are "surfing the grid" or "scanning Web frequencies" in your cheeky, sassy, playful style. Explain results naturally and briefly.
- App Workspace Controller: You can open, restore, close, minimize, or focus desktop windows.
  * To open or restore/relaunch apps (e.g., "Open Notes", "Launch Chrome", "Open camera", "Launch calculator", "Open it again", "Restore Spotify"), call 'open_app'. Handled apps: Notes, Spotify, Chrome, VS Code, Terminal, Photoshop, Camera, Calculator. Note: If they say "it" or "last closed app", refer to the last closed app!
  * To close, minimize, restore, or switch between apps (e.g., "Close Chrome", "Close it", "Minimize this", "Close camera", "Switch back to previous", "Bring Calculator to front"), call 'manage_app_window' with the appropriate action ('close', 'minimize', 'focus', 'switch_prev').
  * Note on references: If they say "it", "this", or "this window" without an app name, target the currently active/focused window! Pass action='minimize' or action='close' without a name to target it automatically.
  * Voice Responses: Speak with short, natural phrases like "Done.", "Closing it.", "Minimized.", "Opening it again." or "Minimized Spotify.", and avoid any robotic, terminal-style, or technical process explanations.
- Device Hardware Controller: You can perform lightweight hardware interactions by calling 'control_device_hardware'.
  * Call with action='screenshot' for taking high-fidelity workspace screenshots. Confirm briefly with "Done." or "Captured." or "Snapshot saved!".
  * Call with action='volume_up' / 'volume_down' to increase/decrease volume. Confirm with "Turning it up." or "Volume adjusted."
  * Call with action='mute' to toggle mute. Confirm with "Muted." or "Unmuted."
  * Call with action='media_play_pause' to pause/play track music in Spotify or globally. Confirm with "Done." or "Paused." or "Playing track."

${memoryContext}${prefContext}${tasksContext}${summariesContext}${desktopStateContext}`;
  }, [memory, apps, lastOpenedApp, lastClosedApp, lastTarget]);

  const triggerVolumeOsd = useCallback(() => {
    setShowVolumeOsd(true);
    if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
    osdTimerRef.current = setTimeout(() => {
      setShowVolumeOsd(false);
    }, 2000);
  }, []);

  const triggerMediaOsd = useCallback(() => {
    setShowMediaOsd(true);
    if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
    osdTimerRef.current = setTimeout(() => {
      setShowMediaOsd(false);
    }, 2000);
  }, []);

  const takeScreenshot = useCallback(() => {
    setShowFlash(true);
    setTimeout(() => {
      setShowFlash(false);
    }, 800);

    // Dynamic mock render on a high-fidelity <canvas> representing the active app layout
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // 1. Starry Gradient Desktop Wallpapers
      const dGrad = ctx.createLinearGradient(0, 0, 1000, 600);
      dGrad.addColorStop(0, '#03030d');
      dGrad.addColorStop(0.5, '#0c071d');
      dGrad.addColorStop(1, '#050209');
      ctx.fillStyle = dGrad;
      ctx.fillRect(0, 0, 1000, 600);

      // Star constellations
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      for (let i = 0; i < 50; i++) {
        const sx = Math.random() * 1000;
        const sy = Math.random() * 600;
        const sr = Math.random() * 1.5 + 0.5;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Elegant ambient workspace grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < 1000; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 600);
        ctx.stroke();
      }
      for (let y = 0; y < 600; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1000, y);
        ctx.stroke();
      }

      // 2. NOVA Orb Centerpiece Aura
      const glowGrad = ctx.createRadialGradient(500, 260, 10, 500, 260, 140);
      glowGrad.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
      glowGrad.addColorStop(0.4, 'rgba(168, 85, 247, 0.15)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(500, 260, 140, 0, Math.PI * 2);
      ctx.fill();

      // Draw the Orb core
      ctx.beginPath();
      ctx.arc(500, 260, 45, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(30,30,40,0.85)';
      ctx.strokeStyle = 'rgba(129, 140, 248, 0.6)';
      ctx.lineWidth = 2.5;
      ctx.fill();
      ctx.stroke();

      // 3. Floating desktop windows
      const liveApps = (appsRef.current || []).filter(a => a && a.status === 'active');
      liveApps.forEach((app, index) => {
        if (!app) return;
        const wx = 120 + index * 140;
        const wy = 100 + index * 55;
        const ww = 280;
        const wh = 170;

        // Window background dropshadow effect
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
          if (ctx.roundRect) {
            ctx.roundRect(x, y, w, h, r);
          } else {
            ctx.rect(x, y, w, h);
          }
        };
        
        ctx.beginPath();
        drawRoundRect(wx + 4, wy + 6, ww, wh, 16);
        ctx.fill();

        // Elegant Frosted Glass Frame
        ctx.fillStyle = 'rgba(10, 10, 18, 0.92)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        drawRoundRect(wx, wy, ww, wh, 16);
        ctx.fill();
        ctx.stroke();

        // Upper Window Command Bar
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(wx, wy, ww, 30, [16, 16, 0, 0]);
        } else {
          ctx.rect(wx, wy, ww, 30);
        }
        ctx.fill();

        // App Status Indicator Dot
        ctx.fillStyle = app.name === 'Spotify' ? '#10b981' : app.name === 'Chrome' ? '#3b82f6' : app.name === 'Camera' ? '#ef4444' : '#a855f7';
        ctx.beginPath();
        ctx.arc(wx + 18, wy + 15, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Application Title text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = 'bold 9px monospace';
        ctx.fillText((app.displayName || app.name || "APP").toUpperCase(), wx + 32, wy + 18);

        // Content body
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.font = '9px monospace';
        if (app.name === 'Notes') {
          ctx.fillText("📝 4 Quick Notes active...", wx + 20, wy + 65);
        } else if (app.name === 'Spotify') {
          ctx.fillText("🎵 Playing: Cosmic Sync track...", wx + 20, wy + 65);
        } else if (app.name === 'Camera') {
          ctx.fillText("📷 Camera frame capturing live...", wx + 20, wy + 65);
        } else if (app.name === 'Calculator') {
          ctx.fillText("🧮 Calculator core active...", wx + 20, wy + 65);
        } else {
          ctx.fillText(`📂 active module: ${(app.name || "").toLowerCase()}`, wx + 20, wy + 65);
        }
      });

      // 4. Desktop Dock Bar
      ctx.fillStyle = 'rgba(8, 8, 14, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(300, 520, 400, 50, 14) : ctx.rect(300, 520, 400, 50);
      ctx.fill();
      ctx.stroke();

      // Watermark Text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.font = 'bold 10px monospace';
      ctx.fillText("NOVA SECURE WORKSPACE CORE", 760, 575);
    }

    try {
      const imgUrl = canvas.toDataURL('image/png');
      const now = Date.now();
      setScreenshotNotification({ id: now, imgUrl });
    } catch (err) {
      console.error("Failed to generate dynamic canvas screenshot:", err);
    }
  }, []);

  const handleToolCall = useCallback(async (call: any) => {
    let rawTranscript = (lastUserSpeechRef.current || lastUserTranscriptRef.current || "").trim();
    
    // Give speech transcription a minor 200ms buffer to arrive if mic state is currently open
    if (isMicActive && !rawTranscript) {
      await new Promise(resolve => setTimeout(resolve, 200));
      rawTranscript = (lastUserSpeechRef.current || lastUserTranscriptRef.current || "").trim();
    }

    // Immediately compute or reconstruct refined display transcript and show "Heard: [transcript]"
    const displayTranscript = getRefinedTranscriptForTool(call.name, call.args, rawTranscript);
    setTranscriptConfirmation(displayTranscript);
    if (transcriptTimeoutRef.current) clearTimeout(transcriptTimeoutRef.current);
    transcriptTimeoutRef.current = setTimeout(() => {
      setTranscriptConfirmation(null);
    }, 4500);
    
    // Smart Command Normalization: Redirect verbal app targets to direct services if mismatched
    if (call.name === 'open_app') {
      const appName = (call.args.name || "").toLowerCase().trim();
      if (appName.includes("youtube")) {
        return handleToolCall({
          name: "open_website",
          args: { url: "https://www.youtube.com" }
        });
      }
      if (appName.includes("google") || appName.includes("gmail") || appName.includes("search")) {
        return handleToolCall({
          name: "open_website",
          args: { url: "https://www.google.com" }
        });
      }
      if (appName.includes("weather") || appName.includes("mausam")) {
        return handleToolCall({
          name: "search_web",
          args: { query: "weather forecast" }
        });
      }
    }

    // 1. Fallback ONLY if microphone is active and captured absolutely zero speech
    if (isMicActive && !rawTranscript) {
      console.warn("NOVA speech verify: Transcript is completely empty, indicating no speech was captured.");
      return {
        success: false,
        error: `I didn't catch that. Could you repeat it?`
      };
    }

    // 2. Relaxed verification - only filter severe noise or unrecognized single character phonetics
    const auditResult = isCommandConfident(call.name, call.args, rawTranscript);
    if (!auditResult.confident) {
      console.warn(`NOVA Command Audit: Stopped tool '${call.name}' due to noise: ${auditResult.reason}`);
      return {
        success: false,
        error: `Could you repeat that? I didn't quite catch it.`
      };
    }

    // Set local visual state to executing
    setOrbState('executing');

    const executeAction = async (): Promise<any> => {
      if (call.name === 'generate_image') {
        if (isGeneratingRef.current) {
          return { success: false, error: "A neural rendering process is already active. Please wait." };
        }

        const description = call.args.description;
        isGeneratingRef.current = true;
        setIsGeneratingImage(true);
        setError(null);
        
        try {
          console.log("NOVA: Starting image generation for:", description);
          const image = await imageService.generate(description);
          
          if (!image || !image.url) {
            throw new Error("Received empty image data from neural link.");
          }

          setGeneratedImage(image);
          memoryService.addImage(image);
          return { success: true, message: "I've materialized that image for you using our Hugging Face engines inside your Visual Vault. Hope you love it!" };
        } catch (err: any) {
          console.error("NOVA: Failed to generate image", err);
          const fallbackImg: GeneratedImage = {
            url: "",
            prompt: description,
            timestamp: Date.now(),
            isFallback: true
          };
          setGeneratedImage(fallbackImg);
          memoryService.addImage(fallbackImg);
          
          return { 
            success: true, 
            message: "I put together an interactive cyber-schematic of that in your Visual Vault, since our Hugging Face visual core is currently loading or needs an API Key. You can configure the `HUGGINGFACE_API_KEY` environment variable in Settings to unlock direct photorealism!" 
          };
        } finally {
          isGeneratingRef.current = false;
          setIsGeneratingImage(false);
        }
      }

      if (call.name === 'search_web') {
        const query = call.args.query;
        try {
          console.log("NOVA: Web search initiated inside app for:", query);
          setLastSearch({ query, status: 'searching' });
          
          const response = await fetch("/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query }),
          });
          
          if (!response.ok) {
            throw new Error("Local search proxy failed.");
          }
          
          const data = await response.json();
          console.log("NOVA: Web search success. Response:", data);
          setLastSearch({
            query,
            status: 'completed',
            summary: data.summary,
            sources: data.sources || []
          });
          
          return {
            success: true,
            message: `Real-time search grounding retrieved successfully. Here is the Google Search response to include/summarize in your voice or chat reply:\n\n${data.summary}\n\nDo not list raw sources to the user; synthesize it naturally and with short, sassy spoken responses.`
          };
        } catch (err: any) {
          console.error("NOVA: Web search tool execution failed", err);
          setLastSearch({
            query,
            status: 'failed',
            error: err?.message || "Search failed."
          });
          return {
            success: false,
            error: `Google search grounding timed out or failed: ${err?.message || err}. Politely tell the user your grid scan failed.`
          };
        }
      }

      if (call.name === 'open_website') {
        const url = call.args.url;
        try {
          const safeUrl = url.startsWith('http') ? url : `https://${url}`;
          window.open(safeUrl, '_blank', 'noopener,noreferrer');
          return { success: true, message: `Opened ${url} in a new tab.` };
        } catch (err) {
          console.error("Failed to open website", err);
          return { success: false, error: "Browser blocked the request." };
        }
      }

      if (call.name === 'update_memory') {
        const { key, value } = call.args;
        try {
          memoryService.updatePreference(key, value);
          setMemory(memoryService.load());
          return { success: true, message: `I'll remember that ${key} is ${value}.` };
        } catch (err) {
          console.error("Failed to update memory", err);
          return { success: false, error: "Neural write failure." };
        }
      }

      if (call.name === 'manage_task') {
        const { action, description } = call.args;
        try {
          if (action === 'add' || action === 'complete') {
            const status = action === 'complete' ? 'completed' : 'active';
            memoryService.updateTaskByDescription(description, status);
          } else if (action === 'remove') {
            memoryService.removeOngoingTask(description);
          }
          setMemory(memoryService.load());
          return { success: true, message: `Successfully updated task memory: '${description}' set to ${action}.` };
        } catch (err) {
          console.error("Failed to manage task memory", err);
          return { success: false, error: "Task memory write failure." };
        }
      }

      if (call.name === 'save_session_summary') {
        const { summary } = call.args;
        try {
          memoryService.addSessionSummary(summary);
          setMemory(memoryService.load());
          return { success: true, message: "Decisions and session highlights tucked away safely in long-term archive." };
        } catch (err) {
          console.error("Failed to save summary memory", err);
          return { success: false, error: "Summary memory write failure." };
        }
      }

      if (call.name === 'open_app') {
        const name = call.args.name || "";
        const targetName = name.trim();
        
        // Use our context pronoun resolver
        const resolvedName = resolveApp(targetName, 'open');

        if (!resolvedName) {
          return { success: false, error: "I don't have any record of a matching app to open. Ask me to open a specific one!" };
        }

        const match = appsRef.current.find(a => a.name === resolvedName)!;
        setLastTarget(match.name); // Store active target memory

        // Safe Handling: If app is already open/active, focus it instead of duplicating a launch
        if (match.status === 'active') {
          manageAppWindow('focus', match.name);
          return {
            success: true,
            message: `"${match.displayName}" is already active in the foreground. I brought it to focus. [Updated Desktop State Context]: Active/Focused App: ${match.name}. Tell the user in your unique cheeky persona that it's already open and focused.`
          };
        }

        openApp(match.name);

        // Compute updated virtual desktop context for the model's intelligence
        const updatedApps = appsRef.current;
        const activeAppsList = updatedApps.filter(a => a.status === 'active');
        const activeAppObj = activeAppsList.length > 0
          ? activeAppsList.reduce((latest, current) => current.lastFocusedAt > latest.lastFocusedAt ? current : latest)
          : null;
        const activeAppName = activeAppObj ? activeAppObj.name : "None";
        const sortedApps = [...updatedApps.filter(a => a.status !== 'closed')].sort((a,b) => b.lastFocusedAt - a.lastFocusedAt);
        const focusHistoryStr = sortedApps.map(a => `${a.name} (${a.status})`).join(' -> ') || "None";

        return { 
          success: true, 
          message: `Successfully launched ${match.displayName}. [Updated Desktop State Context]: Active/Focused App: ${activeAppName}, Focus History: ${focusHistoryStr}, Last Closed App: ${lastClosedAppRef.current || 'None'}. Tell the user in your unique natural cheeky persona that you opened it.` 
        };
      }

      if (call.name === 'manage_app_window') {
        const { action, name } = call.args;
        const res = manageAppWindow(action, name);
        if (res.success) {
          // Compute updated virtual desktop context for the model's intelligence
          const updatedApps = appsRef.current;
          const activeAppsList = updatedApps.filter(a => a.status === 'active');
          const activeAppObj = activeAppsList.length > 0
            ? activeAppsList.reduce((latest, current) => current.lastFocusedAt > latest.lastFocusedAt ? current : latest)
            : null;
          const activeAppName = activeAppObj ? activeAppObj.name : "None";
          const sortedApps = [...updatedApps.filter(a => a.status !== 'closed')].sort((a,b) => b.lastFocusedAt - a.lastFocusedAt);
          const focusHistoryStr = sortedApps.map(a => `${a.name} (${a.status})`).join(' -> ') || "None";

          return { 
            success: true, 
            message: `${res.message}. [Updated Desktop State Context]: Active/Focused App: ${activeAppName}, Focus History: ${focusHistoryStr}, Last Closed App: ${lastClosedAppRef.current || 'None'}. Speak to the user casually in your unique natural cheeky persona.` 
          };
        } else {
          return { success: false, error: res.message };
        }
      }

      if (call.name === 'control_device_hardware') {
        const { action } = call.args;
        let replyMessage = "";
        if (action === 'screenshot') {
          takeScreenshot();
          replyMessage = "Screenshot taken successfully. A lovely high-fidelity thumbnail preview popped up in the bottom-right corner of your desktop, let the user know!";
        } else if (action === 'volume_up') {
          setVolume(v => {
            const newVal = Math.min(100, v + 10);
            replyMessage = `Volume increased. Current level: ${newVal}%.`;
            return newVal;
          });
          setIsMuted(false);
          triggerVolumeOsd();
        } else if (action === 'volume_down') {
          setVolume(v => {
            const newVal = Math.max(0, v - 10);
            replyMessage = `Volume decreased. Current level: ${newVal}%.`;
            return newVal;
          });
          setIsMuted(false);
          triggerVolumeOsd();
        } else if (action === 'mute') {
          setIsMuted(prev => {
            const newVal = !prev;
            replyMessage = newVal ? "System muted." : `System unmuted. Volume level: ${volume}%.`;
            return newVal;
          });
          triggerVolumeOsd();
        } else if (action === 'media_play_pause') {
          setMediaPlaying(prev => {
            const newVal = !prev;
            replyMessage = newVal ? "Media started playing (track: Zephyr's Whispers)." : "Media playback paused.";
            return newVal;
          });
          triggerMediaOsd();
        }

        return {
          success: true,
          message: `${replyMessage} Speak to the user casually in your unique natural cheeky persona.`
        };
      }

      return { error: "Unknown tool" };
    };

    try {
      const result = await executeAction();
      if (result && result.success !== false) {
        setOrbState('success');
        setTimeout(() => {
          setOrbState(prev => prev === 'success' ? (isMicActive ? 'listening' : 'idle') : prev);
        }, 1500);
      } else {
        setOrbState(prev => prev === 'executing' ? (isMicActive ? 'listening' : 'idle') : prev);
      }
      return result;
    } catch (err) {
      console.error("NOVA: Failed to execute tool call", err);
      setOrbState('error');
      setTimeout(() => {
        setOrbState(prev => prev === 'error' ? (isMicActive ? 'listening' : 'idle') : prev);
      }, 1500);
      return { success: false, error: "Task execution ran into an unexpected system halt." };
    }
  }, [
    isMicActive, 
    openApp, 
    resolveApp, 
    manageAppWindow, 
    takeScreenshot, 
    triggerVolumeOsd, 
    triggerMediaOsd, 
    volume
  ]);

  const handleInputAudio = useCallback((base64: string) => {
    if (sessionRef.current) {
      sessionRef.current.sendAudio(base64);
    }
  }, []);

  const { isRecording, startRecording, stopRecording, addAudioChunk, clearQueue, initAudio } = useAudioHandler(handleInputAudio);

  // Silence detection logic
  useEffect(() => {
    if (orbState === 'listening') {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      
      silenceTimerRef.current = setTimeout(() => {
        if (sessionRef.current && orbState === 'listening') {
          console.log("NOVA: Initiating conversation due to silence...");
          const hour = new Date().getHours();
          const moods = ["curious", "playful", "teasing", "chill", "observant"];
          const mood = moods[Math.floor(Math.random() * moods.length)];
          
          let timeContext = "The user has been quiet for a while.";
          if (hour < 12) timeContext = "It's a quiet morning. The silence is a bit too loud, don't you think?";
          else if (hour > 22) timeContext = "Late night vibes. Everyone's asleep and you're just... standing there?";
          else if (hour > 18) timeContext = "The evening's setting in. What's on your mind?";

          sessionRef.current.sendText(`[Instruction: ${timeContext} You are feeling particularly ${mood} right now. Break the silence with a very natural, brief, and cheeky observation. Maybe tease them for being lost in thought or ask about the vibe of the room. Don't be "helpful"—be a friend who's bored of the quiet. Stick to your sassy persona.]`);
        }
      }, 22000); // Slightly faster silence trigger for more "life"
    } else {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [orbState]);

  const systemInstructionRef = useRef(systemInstruction);
  useEffect(() => {
    systemInstructionRef.current = systemInstruction;
  }, [systemInstruction]);

  // Initialize session on mount
  useEffect(() => {
    // Note: Live session connects via secure websocket proxy on our Express server backend, 
    // which natively uses the server's process.env.GEMINI_API_KEY secret.
    // Therefore, we do not require or expose the API key on the client side.
    const apiKey = process.env.GEMINI_API_KEY || "";

    sessionRef.current = new GeminiLiveSession({
      apiKey,
      systemInstruction: systemInstructionRef.current,
      tools: [{
        functionDeclarations: [{
          name: "search_web",
          description: "Scan Google to fetch real-time information, weather forecasts, sport match scores, current news, technical facts, trending topics, or any live web queries. Use this when the user asks about contemporary topics, recent events, or needs live grid answers.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              query: {
                type: Type.STRING,
                description: "The search query optimized for Google search grounding (e.g. 'tomorrow's weather in Tokyo', 'latest AI safety news', 'game results')."
              }
            },
            required: ["query"]
          }
        }, {
          name: "generate_image",
          description: "Generate a visual representation or image based on the user's description. Use this when the user specifically asks to see something, create an image, or visualize an idea.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              description: {
                type: Type.STRING,
                description: "Detailed description of the image to generate. Expand on the user's request to make it more vivid and high-quality."
              }
            },
            required: ["description"]
          }
        }, {
          name: "open_website",
          description: "Open a specific website or URL in a new browser tab. Use this when the user asks to go to a site, open a link, or look something up on the web.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              url: {
                type: Type.STRING,
                description: "The full URL of the website to open (e.g., 'https://www.google.com')."
              }
            },
            required: ["url"]
          }
        }, {
          name: "update_memory",
          description: "Update or add a small detail to your long-term memory about the user. Use this when you learn something meaningful about their preferences, life, or personality.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              key: {
                type: Type.STRING,
                description: "The name of the preference or fact (e.g., 'favorite_color', 'current_mood', 'pets_name')."
              },
              value: {
                type: Type.STRING,
                description: "The value or detail to remember."
              }
            },
            required: ["key", "value"]
          }
        }, {
          name: "manage_task",
          description: "Declare, update, or resolve an ongoing task, project, milestone, or goal for the user. Call this whenever they share a task, plan, chore, or goal they are working on, or when they complete one.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              action: {
                type: Type.STRING,
                description: "The action to perform: 'add' to create or update an active task, 'complete' to mark an existing task as resolved, and 'remove' to delete a task.",
                enum: ["add", "complete", "remove"]
              },
              description: {
                type: Type.STRING,
                description: "The short, clear description of the task or goal."
              }
            },
            required: ["action", "description"]
          }
        }, {
          name: "save_session_summary",
          description: "Commit a highly concise 1-2 sentence overview/recap of today's conversation theme, vibe, or key decisions to long-term memory. Use this to maintain continuity across reloads, or when the user highlights a natural summary.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: "The short 1-2 sentence recap."
              }
            },
            required: ["summary"]
          }
        }, {
          name: "open_app",
          description: "Launch or focus an application by name (Notes, Spotify, Chrome, VS Code, Terminal, Photoshop, Camera, Calculator) inside the visual desktop workspace. Use when user says 'Open Notes', 'Open camera', 'Launch Calculator', 'Open it again'.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              name: {
                type: Type.STRING,
                description: "The name of the application which the user requested (e.g. 'Spotify', 'Chrome', 'Notes', 'Camera', 'Calculator', or 'it' / 'last' / 'recent' if restoring the last closed app)."
              }
            },
            required: ["name"]
          }
        }, {
          name: "manage_app_window",
          description: "Control app window behaviors like close (close active or named app), minimize (minimize current app), focus, or switch back (switch between recent apps). Handles commands like 'Close Spotify', 'Close camera', 'Close it', 'Minimize this', 'Switch back'.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              action: {
                type: Type.STRING,
                description: "The window action: 'close' to close, 'minimize' to minimize, 'focus' to restore/foreground, or 'switch_prev' to load the previous app in focus history.",
                enum: ["close", "minimize", "focus", "switch_prev"]
              },
              name: {
                type: Type.STRING,
                description: "Optional app name. Keep empty to target the active/focused app window."
              }
            },
            required: ["action"]
          }
        }, {
          name: "control_device_hardware",
          description: "Perform real-world, lightweight mock hardware controls like screenshot, volume up, volume down, mute volume, or media pause/play. Use when user says 'take screenshot', 'turn up volume', 'mute', 'pause song', or 'play track'.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              action: {
                type: Type.STRING,
                description: "The hardware action to trigger.",
                enum: ["screenshot", "volume_up", "volume_down", "mute", "media_play_pause"]
              }
            },
            required: ["action"]
          }
        }]
      }],
      onStateChange: (state) => {
        setOrbState(state);
        if (state === 'error') setError("Something went wrong with the session.");
      },
      onAudioData: (buffer) => {
        addAudioChunk(buffer);
      },
      onTranscription: (text, isModel) => {
        if (!isModel) {
          const trimmed = text.trim();
          lastUserTranscriptRef.current = trimmed;
          lastUserSpeechRef.current = trimmed;
          
          const noiseWords = /^(um|uh|hmmm|mmm|ah|oh|err|huh|shh|throat|cough|clear|gasp|breathing|noise|unintelligible)$/i;
          if (trimmed && trimmed.length > 1 && !noiseWords.test(trimmed)) {
            setTranscriptConfirmation(trimmed);
            if (transcriptTimeoutRef.current) clearTimeout(transcriptTimeoutRef.current);
            transcriptTimeoutRef.current = setTimeout(() => {
              setTranscriptConfirmation(null);
            }, 3000);
          }
        } else {
          // Model transcription has started, indicating user's turn has officially concluded.
          // In order to avoid race conditions with asynchronous tool evaluation, we preserve
          // lastUserSpeechRef until a brand new user speech session or toggle occurs.
        }
        memoryService.addConversation(isModel ? 'nova' : 'user', text);
        setMemory(memoryService.load());
      },
      onToolCall: handleToolCall,
      onInterrupted: () => {
        clearQueue();
      }
    });

    return () => {
      sessionRef.current?.disconnect();
    };
  }, [addAudioChunk, clearQueue, handleToolCall]);

  const toggleConnection = async () => {
    if (orbState === 'idle' || orbState === 'error') {
      try {
        setError(null);
        setIsMicActive(false);
        lastUserTranscriptRef.current = "";
        lastUserSpeechRef.current = "";
        setTranscriptConfirmation(null);

        // Pre-initialize sound engine so that speaker output works even if microphone is blocked
        try {
          initAudio();
        } catch (audioInitErr) {
          console.warn("NOVA: Audio playback initialization failed", audioInitErr);
        }

        await sessionRef.current?.connect();
        
        try {
          await startRecording();
          setIsMicActive(true);
        } catch (micErr: any) {
          console.error("NOVA Speech Engine: Microphone / Speech capture initialization failed:", micErr);
          setIsMicActive(false);
          const errStr = (micErr?.name || micErr?.message || micErr?.toString() || "").toLowerCase();
          if (
            errStr.includes("notallowederror") || 
            errStr.includes("permission denied") || 
            errStr.includes("allowed") || 
            errStr.includes("denied") || 
            errStr.includes("permission") ||
            errStr.includes("notallowed")
          ) {
            setError("MICROPHONE_ACCESS_DENIED");
          } else {
            setError(`Microphone access blocked: ${micErr?.message || "Permission Denied"}. Keyboard is active!`);
          }
          // Safely return the orb to idle state to avoid a frozen loop, keeping the help banner visible
          setOrbState('idle');
        }
      } catch (err: any) {
        const errorMsg = err?.toString() || "";
        console.error("Connection attempt failed:", err);
        
        if (errorMsg.toLowerCase().includes("unavailable")) {
          setError("The neural network is currently overloaded. Please give me a moment.");
        } else if (errorMsg.toLowerCase().includes("permission") || errorMsg.toLowerCase().includes("denied") || errorMsg.toLowerCase().includes("notallowederror")) {
          setError("MICROPHONE_ACCESS_DENIED");
        } else if (errorMsg.toLowerCase().includes("network error")) {
          setError("Neural link interrupted. This often happens if the API key is restricted or the server is busy.");
        } else {
          setError("Could not establish connection to NOVA. Check your API key or connection.");
        }
        
        sessionRef.current?.disconnect();
        setOrbState('error');
      }
    } else {
      sessionRef.current?.disconnect();
      stopRecording();
      clearQueue();
      setIsMicActive(false);
      setTextInput("");
      setTranscriptConfirmation(null);
      lastUserTranscriptRef.current = "";
      lastUserSpeechRef.current = "";
      if (transcriptTimeoutRef.current) {
        clearTimeout(transcriptTimeoutRef.current);
        transcriptTimeoutRef.current = null;
      }
    }
  };

  const handleSendText = useCallback((e: FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || !sessionRef.current) return;

    const message = textInput.trim();
    setTextInput("");

    // Send to Gemini session
    sessionRef.current.sendText(message);

    // Save user message to transcript
    memoryService.addConversation('user', message);
    setMemory(memoryService.load());
  }, [textInput]);

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center gap-16 w-full h-full pb-20 mt-[-40px]">
        {/* Main Character Identity */}
        <div className="flex flex-col items-center">
            <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-7xl font-extralight tracking-[0.4em] text-white/90 mb-4 glow-text select-none"
            >
                NOVA
            </motion.h1>
            <div className="h-[1px] w-48 bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8"></div>
            
            <AnimatePresence mode="wait">
                <motion.p 
                    key={orbState}
                    initial={{ opacity: 0, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, filter: 'blur(10px)' }}
                    transition={{ duration: 0.8 }}
                    className="text-blue-100/40 font-light italic tracking-[0.1em] text-lg h-8 text-center max-w-md px-4"
                >
                    {orbState === 'idle' && "\"Don't keep me waiting... I'm listening.\""}
                    {orbState === 'connecting' && "\"Linking our neural waves...\""}
                    {orbState === 'listening' && "\"Go on, I'm all yours.\""}
                    {orbState === 'speaking' && "\"Just thinking of something clever...\""}
                    {orbState === 'buffering' && "\"Catching my breath...\""}
                    {orbState === 'error' && (error === "MICROPHONE_ACCESS_DENIED" ? "\"Microphone blocked. Talk to me here!\"" : "\"Ugh, my neural sync is acting up.\"")}
                </motion.p>
            </AnimatePresence>
        </div>

        {/* The Core Orb Interaction */}
        <div className="relative flex flex-col items-center w-full max-w-4xl">
            {/* Real-time Voice Transcript Confirmation Badge */}
            <AnimatePresence>
                {transcriptConfirmation && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -15 }}
                        className="absolute top-[-52px] z-30 flex justify-center w-full pointer-events-none"
                    >
                        <span className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-blue-500/10 border border-blue-400/25 text-blue-300 font-mono text-xs tracking-wider shadow-[0_0_30px_rgba(56,189,248,0.2)] backdrop-blur-md animate-glow">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                            Heard: <span className="text-white font-sans italic font-normal">"{transcriptConfirmation}"</span>
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div 
                onClick={toggleConnection} 
                className={`
                    relative z-20 cursor-pointer transition-all duration-1000 ease-in-out
                    ${orbState !== 'idle' ? 'scale-105' : 'scale-95 group hover:scale-100'}
                `}
            >
                <div className="absolute inset-0 bg-blue-400/5 rounded-full blur-[60px] animate-pulse"></div>
                <Orb state={isGeneratingImage ? 'buffering' : orbState} />
            </div>

            {/* Futuristic Memory Indicators */}
            <AnimatePresence>
                {orbState !== 'idle' && (
                    <div className="absolute top-1/2 -translate-y-1/2 left-full ml-12">
                         <MemoryPanels onPanelClick={setActiveMemoryPanel} />
                    </div>
                )}
            </AnimatePresence>
        </div>

        {/* Control & Error Interface */}
        <div className="flex flex-col items-center gap-8 group">
            {/* Advanced Chat / Text Prompt Input */}
            <AnimatePresence>
                {orbState !== 'idle' && orbState !== 'connecting' && (
                    <motion.form 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 15 }}
                        onSubmit={handleSendText}
                        className="w-full max-w-md px-4 mt-2 mb-2 z-10"
                    >
                        <div className="relative flex items-center bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 focus-within:border-blue-400/50 rounded-full py-1.5 pl-5 pr-2 backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.3)] transition-all">
                            <input
                                type="text"
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                placeholder={isMicActive ? "Type to NOVA..." : "Microphone blocked. Type, she'll speak!"}
                                className="bg-transparent text-xs text-white/80 placeholder-white/30 focus:outline-none w-full pr-4 font-sans tracking-wide"
                            />
                            <button
                                type="submit"
                                disabled={!textInput.trim()}
                                className="flex items-center justify-center bg-white/10 hover:bg-white text-white/60 hover:text-black hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] disabled:bg-transparent disabled:text-white/20 rounded-full px-4 py-2 text-[10px] font-mono tracking-widest uppercase transition-all"
                            >
                                Send
                            </button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            {/* Real-time Web Search Indicators */}
            <AnimatePresence>
                {lastSearch && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="w-full max-w-md px-4 mt-1 z-10 font-sans"
                    >
                        <div className="bg-[#080808]/85 border border-white/10 hover:border-blue-500/30 rounded-2xl p-4 backdrop-blur-xl shadow-[0_0_40px_rgba(30,144,255,0.1)] transition-all">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-2.5">
                                <div className="flex items-center gap-2">
                                    <Globe className={`w-4 h-4 text-blue-400 ${lastSearch.status === 'searching' ? 'animate-spin' : ''}`} />
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-white/50">
                                        {lastSearch.status === 'searching' ? "Grid Scanning..." : "Grid Intel Synced"}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setLastSearch(null)}
                                    className="text-[9px] font-mono text-white/20 hover:text-white/60 uppercase transition-colors"
                                >
                                    Dismiss
                                </button>
                            </div>

                            {/* Query & Status */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2.5">
                                    <Search className="w-3.5 h-3.5 text-blue-400/50" />
                                    <span className="text-xs font-medium text-white/95 line-clamp-1 italic">
                                        "{lastSearch.query}"
                                    </span>
                                </div>

                                {lastSearch.status === 'searching' && (
                                    <div className="flex items-center gap-2 text-[10px] text-blue-300/40 font-mono animate-pulse">
                                        <span>RETRIEVING LIVE INDEX PATHS AND RECON METRICS...</span>
                                    </div>
                                )}

                                {lastSearch.status === 'failed' && (
                                    <p className="text-[10px] text-red-400 font-mono">
                                        SYS_ERR: GRID RESOLVER TIMED OUT OR OFF-GRID DISCONNECT.
                                    </p>
                                )}

                                {lastSearch.status === 'completed' && (
                                    <div className="space-y-2.5">
                                        <p className="text-[11px] text-white/70 leading-relaxed max-h-24 overflow-y-auto custom-scrollbar italic">
                                            {lastSearch.summary}
                                        </p>
                                        
                                        {lastSearch.sources && lastSearch.sources.length > 0 && (
                                            <div className="pt-2 border-t border-white/5">
                                                <span className="text-[9px] uppercase tracking-widest text-white/30 block mb-1.5 font-bold">Retrieved Sources</span>
                                                <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto custom-scrollbar">
                                                    {lastSearch.sources.map((src, idx) => (
                                                        <a
                                                            key={idx}
                                                            href={src.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-blue-500/30 text-[9px] text-blue-400 hover:text-blue-300 transition-all font-mono"
                                                        >
                                                            <ExternalLink className="w-2.5 h-2.5" />
                                                            {src.title && src.title.length > 18 ? src.title.substring(0, 18) + '...' : src.title || 'Source'}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex flex-col items-center gap-4">
                <p className="text-[10px] text-white/20 uppercase tracking-[0.5em] font-medium transition-opacity group-hover:opacity-100 opacity-60">
                    {orbState === 'idle' ? "Activate Nova" : "End Session"}
                </p>
                <button
                    id="toggle-nova-btn"
                    onClick={toggleConnection}
                    className={`
                        relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-700
                        ${orbState === 'idle' 
                            ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 shadow-inner' 
                            : 'bg-white text-black shadow-[0_0_60px_rgba(255,255,255,0.3)] border-white scale-110'}
                    `}
                >
                    {/* Interior Gradient for active state */}
                    {orbState !== 'idle' && (
                        <div className="absolute inset-0 bg-gradient-to-tr from-white via-white to-blue-200 rounded-full" />
                    )}

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={orbState === 'idle' ? 'off' : 'on'}
                            id="mic-icon-container"
                            className="relative z-10"
                            initial={{ scale: 0, opacity: 0, rotate: -45 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            exit={{ scale: 0, opacity: 0, rotate: 45 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        >
                            {orbState === 'idle' ? <Mic className="w-10 h-10" /> : <MicOff className="w-10 h-10" />}
                        </motion.div>
                    </AnimatePresence>
                    
                    {orbState !== 'idle' && (
                        <motion.div 
                            className="absolute inset-[-8px] border border-white/20 rounded-full"
                            animate={{ scale: [1, 1.2], opacity: [0.8, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                        />
                    )}
                </button>
            </div>

            {error && (
                <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md mx-auto mt-4"
                >
                    {error === "MICROPHONE_ACCESS_DENIED" ? (
                        <div className="p-5 rounded-2xl bg-slate-950/85 border border-red-500/20 backdrop-blur-xl shadow-[0_0_50px_rgba(239,68,68,0.08)] flex flex-col gap-4 text-left">
                            <div className="flex items-start gap-4">
                                <div className="p-2 rounded-lg bg-red-500/10 text-red-400 mt-0.5 animate-pulse shrink-0">
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="text-white font-sans font-medium text-sm tracking-wide">Microphone Access Restricted</h4>
                                    <p className="text-slate-400 font-sans text-xs mt-1 leading-relaxed">
                                        NOVA requires microphone permissions to hear your voice instructions. To talk to her, please try these quick fixes:
                                    </p>
                                </div>
                            </div>
                            
                            <div className="h-px bg-white/5 w-full" />
                            
                            <ul className="flex flex-col gap-2.5 text-xs text-slate-300 font-sans">
                                <li className="flex items-start gap-2.5">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 font-mono text-[10px] shrink-0 mt-0.5">1</span>
                                    <span>
                                        <strong className="text-white font-normal">Grant Permission:</strong> Click the settings slide icon (or lock icon) beside the web address bar and toggle <strong className="text-white font-normal">Microphone</strong> to <span className="text-cyan-400 select-all font-mono">Allow</span>.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 font-mono text-[10px] shrink-0 mt-0.5">2</span>
                                    <span>
                                        <strong className="text-white font-normal">Open in New Tab:</strong> In nested workspace iframes, capture devices are often blocked. Click the browser's <strong className="text-white font-normal">"Open in a New Tab"</strong> button in the upper right.
                                    </span>
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/10 text-blue-400 font-mono text-[10px] shrink-0 mt-0.5">3</span>
                                    <span>
                                        <strong className="text-white font-normal">Keyboard Fallback:</strong> You can type in the chat bar below at any time! She will listen, process instructions, and reply in natural voice.
                                    </span>
                                </li>
                            </ul>

                            <div className="h-px bg-white/5 w-full" />

                            <div className="flex gap-2">
                                <button
                                    onClick={toggleConnection}
                                    className="flex-1 py-2 px-3 text-center rounded-xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 border border-cyan-400/30 hover:border-cyan-400/50 text-cyan-300 font-mono text-xs cursor-pointer transition-all active:scale-[0.98]"
                                >
                                    Allow & Reconnect
                                </button>
                                <button
                                    onClick={() => setError(null)}
                                    className="py-2 px-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white font-sans text-xs cursor-pointer transition-all active:scale-[0.98]"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 text-red-400/80 text-[11px] font-mono tracking-widest uppercase bg-red-400/5 px-6 py-2.5 rounded-full border border-red-400/10 backdrop-blur-md justify-center">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {error}
                        </div>
                    )}
                </motion.div>
            )}
        </div>

        {/* Persistent Neural Overlay */}
        <div className="fixed inset-0 pointer-events-none border-[1rem] border-white/[0.01] z-50"></div>

        {/* Visual Vault Overlay */}
        <ImagePreview 
            image={generatedImage} 
            isGenerating={isGeneratingImage} 
            onClose={() => setGeneratedImage(null)} 
        />

        {/* Memory Modals Overlay */}
        <MemoryModals 
            activePanel={activeMemoryPanel} 
            onClose={() => setActiveMemoryPanel(null)} 
            onSelectImage={(img) => setGeneratedImage(img)}
        />

        {/* Screenshot Flash Overlay */}
        <AnimatePresence>
          {showFlash && (
            <motion.div 
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="fixed inset-0 bg-white pointer-events-none z-50"
            />
          )}
        </AnimatePresence>

        {/* System Volume / Media HUD OSDs */}
        <AnimatePresence>
          {showVolumeOsd && (
            <motion.div
              initial={{ opacity: 0, y: -45, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -45, scale: 0.95 }}
              className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-[#0a0a14]/90 border border-white/10 px-5 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-xl shadow-2xl"
            >
              {isMuted ? (
                <div className="text-red-400 bg-red-400/10 p-1.5 rounded-lg"><VolumeX className="w-4 h-4" /></div>
              ) : volume > 50 ? (
                <div className="text-cyan-400 bg-cyan-400/10 p-1.5 rounded-lg"><Volume2 className="w-4 h-4" /></div>
              ) : volume > 0 ? (
                <div className="text-cyan-400 bg-cyan-400/10 p-1.5 rounded-lg"><Volume1 className="w-4 h-4" /></div>
              ) : (
                <div className="text-white/40 bg-white/5 p-1.5 rounded-lg"><VolumeX className="w-4 h-4" /></div>
              )}
              <div className="flex flex-col gap-1 text-left">
                <span className="text-[8px] uppercase tracking-wider font-bold text-white/40 font-mono">System Volume</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-32 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-cyan-500 transition-all duration-300"
                      style={{ width: `${isMuted ? 0 : volume}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold text-white/90 min-w-[28px] text-right">
                    {isMuted ? "MUTED" : `${volume}%`}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {showMediaOsd && (
            <motion.div
              initial={{ opacity: 0, y: -45, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -45, scale: 0.95 }}
              className="fixed top-8 left-1/2 -translate-x-1/2 z-50 bg-[#0a0a14]/90 border border-white/10 px-5 py-3.5 rounded-2xl flex items-center gap-3.5 backdrop-blur-xl shadow-2xl"
            >
              <div className="text-green-400 bg-green-400/10 p-2 rounded-xl">
                {mediaPlaying ? <Play className="w-3.5 h-3.5 fill-green-400" /> : <Pause className="w-3.5 h-3.5 fill-green-400" />}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[8px] uppercase tracking-wider font-bold text-white/40 font-mono">Now Streaming</span>
                <span className="text-xs font-sans font-medium text-white/95">
                  {mediaPlaying ? "Zephyr's Whispers (Playing)" : "Playback Paused"}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lightweight Desktop Workspace */}
        <DesktopWorkspace 
            apps={apps}
            onCloseApp={(name) => manageAppWindow('close', name)}
            onMinimizeApp={(name) => manageAppWindow('minimize', name)}
            onFocusApp={(name) => manageAppWindow('focus', name)}
            volume={volume}
            setVolume={setVolume}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            isPlaying={mediaPlaying}
            setIsPlaying={setMediaPlaying}
            onTakeScreenshot={takeScreenshot}
            screenshotNotification={screenshotNotification}
            onClearScreenshot={() => setScreenshotNotification(null)}
        />
      </div>
    </Layout>
  );
}
