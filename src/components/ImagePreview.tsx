import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Download } from 'lucide-react';

interface ImagePreviewProps {
  image: { url: string; prompt: string; isFallback?: boolean } | null;
  isGenerating: boolean;
  onClose: () => void;
}

function GenerativeArt({ prompt }: { prompt: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width = 500;
    let height = canvas.height = 500;

    // Determine theme from prompt
    const text = prompt.toLowerCase();
    let themeColor1 = '#38bdf8'; // Blue
    let themeColor2 = '#a855f7'; // Purple
    let themeColor3 = '#05050a'; // Dark blue-purple

    if (text.includes('neon') || text.includes('cyber') || text.includes('pink') || text.includes('city')) {
      themeColor1 = '#f43f5e'; // Rose
      themeColor2 = '#06b6d4'; // Cyan
      themeColor3 = '#0d0414'; // Deep fuchsia
    } else if (text.includes('space') || text.includes('cosmic') || text.includes('star') || text.includes('galaxy') || text.includes('alien')) {
      themeColor1 = '#6366f1'; // Indigo
      themeColor2 = '#ec4899'; // Pink
      themeColor3 = '#020205'; // Blackish blue
    } else if (text.includes('forest') || text.includes('green') || text.includes('nature') || text.includes('earth') || text.includes('garden')) {
      themeColor1 = '#10b981'; // Emerald
      themeColor2 = '#eab308'; // Yellow
      themeColor3 = '#020c08'; // Deep forest
    } else if (text.includes('fire') || text.includes('sunset') || text.includes('gold') || text.includes('orange') || text.includes('sun')) {
      themeColor1 = '#f97316'; // Orange
      themeColor2 = '#ef4444'; // Red
      themeColor3 = '#0c0400'; // Dark fire
    } else if (text.includes('water') || text.includes('ocean') || text.includes('sea') || text.includes('blue') || text.includes('storm')) {
      themeColor1 = '#0ea5e9'; // Sky
      themeColor2 = '#1d4ed8'; // Blue
      themeColor3 = '#020612'; // Dark deep-sea
    }

    const resize = () => {
      if (canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = canvas.parentElement.clientHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    // Create particles
    const particleCount = 50;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
    }> = [];

    const colors = [themeColor1, themeColor2, '#ffffff'];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 0.8,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.5 + 0.2
      });
    }

    // Mathematical nodes for orbits
    let angle = 0;

    const render = () => {
      ctx.fillStyle = themeColor3;
      ctx.fillRect(0, 0, width, height);

      // Draw futuristic grid lines with fading edge gradients
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      const gridSize = 35;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const centerX = width / 2;
      const centerY = height / 2;
      angle += 0.003;

      // Outer rings (dashed / technical style)
      ctx.strokeStyle = `${themeColor1}20`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 16]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, 160, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `${themeColor2}25`;
      ctx.setLineDash([30, 10]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, 110, -angle, Math.PI * 2 - angle);
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash

      // Glowing nebulous gradient core
      const gradient = ctx.createRadialGradient(centerX, centerY, 2, centerX, centerY, 130);
      gradient.addColorStop(0, `${themeColor1}35`);
      gradient.addColorStop(0.6, `${themeColor2}12`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 130, 0, Math.PI * 2);
      ctx.fill();

      // Horizontal central scanning line waveform
      ctx.strokeStyle = `${themeColor1}40`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < width; i += 4) {
        const distFromCenter = Math.abs(i - centerX) / centerX;
        const envelope = Math.max(0, 1 - distFromCenter * distFromCenter);
        const offset = Math.sin(i * 0.015 - angle * 5) * 25 * envelope;
        if (i === 0) ctx.moveTo(i, centerY + offset);
        else ctx.lineTo(i, centerY + offset);
      }
      ctx.stroke();

      // Process and render particles
      for (let i = 0; i < particleCount; i++) {
        const p1 = particles[i];
        
        p1.x += p1.vx;
        p1.y += p1.vy;

        if (p1.x < 0 || p1.x > width) p1.vx *= -1;
        if (p1.y < 0 || p1.y > height) p1.vy *= -1;

        ctx.fillStyle = p1.color;
        ctx.globalAlpha = p1.alpha;
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        // Draw connections
        for (let j = i + 1; j < particleCount; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (dist < 75) {
            const connAlpha = (1 - dist / 75) * 0.12;
            ctx.strokeStyle = themeColor1;
            ctx.globalAlpha = connAlpha;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
          }
        }
      }

      // Elegant Technical Overlay Markings (using font fallback)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
      ctx.fillText(`NEURAL_MODEL: [${prompt.substring(0, 24).toUpperCase()}...]`, 24, 34);
      ctx.fillText(`PROX_RESOLVED: 512.PX_VEC`, 24, 48);
      ctx.fillText(`SYS_RENDER: FREE_TIER_OVERFLOW_PASS`, 24, 62);

      // Coordinates at edges
      ctx.fillText(`SEC_T+${Math.floor(angle * 1200)}`, width - 100, 34);
      ctx.fillText(`INTEGRITY: LOCAL_STABLE`, width - 134, 48);

      // Centered delicate crosshair
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX - 8, centerY);
      ctx.lineTo(centerX + 8, centerY);
      ctx.moveTo(centerX, centerY - 8);
      ctx.lineTo(centerX, centerY + 8);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [prompt]);

  return <canvas ref={canvasRef} className="w-full h-full object-cover" />;
}

export default function ImagePreview({ image, isGenerating, onClose }: ImagePreviewProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (image || isGenerating) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [image, isGenerating, onClose]);

  return (
    <AnimatePresence>
      {(isGenerating || image) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.1, y: -20 }}
          className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl cursor-default"
          onClick={onClose}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl bg-[#050505] border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_100px_rgba(56,189,248,0.1)] pointer-events-auto"
          >
            {/* Header / Technical Bar */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-white/[0.02] relative z-20">
              <div className="flex flex-col">
                <span className="text-[10px] tracking-[0.3em] uppercase font-bold text-blue-400">
                  {image?.isFallback ? "Neuromorphic Design Lab" : "Visual Vault Output"}
                </span>
                <span className="text-[9px] tracking-[0.1em] text-white/30 truncate max-w-[300px]">PRCT: {image?.prompt || "GEN_PROCESS_ACTIVE"}</span>
              </div>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/40 hover:text-white cursor-pointer relative z-30 pointer-events-auto bg-transparent border-none"
                aria-label="Close output preview"
              >
                <X className="w-5 h-5 pointer-events-none" />
              </button>
            </div>

            {/* Content Area */}
            <div className="relative aspect-square w-full flex items-center justify-center bg-black">
              {isGenerating ? (
                <div className="flex flex-col items-center gap-6">
                  <div className="relative w-24 h-24">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border-t-2 border-blue-500 rounded-full"
                      />
                      <motion.div 
                        animate={{ rotate: -360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-2 border-b-2 border-purple-500/50 rounded-full"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                         <motion.div 
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-4 h-4 bg-white/20 rounded-full blur-[2px]"
                         />
                      </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-[11px] font-mono tracking-[0.4em] text-blue-400/80 animate-pulse">MATERIALIZING...</p>
                    <p className="text-[9px] text-white/20 mt-2">Accessing Neural Rendering Engine</p>
                  </div>
                </div>
              ) : image ? (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative w-full h-full"
                >
                    {image.isFallback ? (
                      <GenerativeArt prompt={image.prompt} />
                    ) : image.url ? (
                      <img 
                          src={image.url} 
                          alt={image.prompt}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                      />
                    ) : null}
                    {/* Holographic Overlay Scanline effect */}
                    <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] opacity-20"></div>
                </motion.div>
              ) : null}
            </div>

            {/* Footer / Controls */}
            {image && !isGenerating && (
                <div className="p-6 flex justify-between items-center bg-white/[0.01]">
                    <div className="flex gap-4">
                         {image.isFallback ? (
                           <div className="text-[10px] text-blue-300/60 leading-relaxed max-w-[420px] font-mono">
                             ⚡ <span className="text-blue-300 font-semibold uppercase">PROJECTION PROTOCOL</span>: API capacity reached. NOVA produced this local vector model. Switch your project settings to a Paid Gemini API style to unlock photorealism.
                           </div>
                         ) : (
                           <a 
                              href={image.url} 
                              download="nova-generation.png"
                              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-all text-[11px] text-white/60 tracking-widest uppercase"
                          >
                              <Download className="w-3 h-3" /> Save
                          </a>
                         )}
                    </div>
                    <div className="text-right flex-shrink-0">
                        <span className="block text-[8px] text-white/20 uppercase tracking-widest mb-1">Processing Node</span>
                        <span className="text-[10px] font-mono text-white/40">
                          {image.isFallback ? "LOCAL_VEC.NODE" : "G-2.5.IMG_STABLE"}
                        </span>
                    </div>
                </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
