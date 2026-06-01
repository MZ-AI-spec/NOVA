import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { OrbState } from '../lib/gemini-live';

interface OrbProps {
  state: OrbState;
}

export default function Orb({ state }: OrbProps) {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number; delay: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate a fixed set of ambient celestial particles
  useEffect(() => {
    const generated = Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 5,
    }));
    setParticles(generated);
  }, []);

  // Determine elegant color gradients based on state
  const getColors = () => {
    switch (state) {
      case 'listening':
        return {
          coreGrad: ['#06b6d4', '#3b82f6', '#1d4ed8'], // Cyan to Royal Blue
          glow: 'rgba(59, 130, 246, 0.4)',
          outerRingColor: 'stroke-cyan-500/40',
          innerRingColor: 'stroke-blue-400/50',
          textColor: 'text-cyan-400',
          neonShadow: '0 0 35px rgba(6, 182, 212, 0.5)',
          statusText: 'LISTENING: MIC CAPTURING VOICEPORT'
        };
      case 'speaking':
        return {
          coreGrad: ['#8b5cf6', '#ec4899', '#db2777'], // Violet to Hot Pink
          glow: 'rgba(236, 72, 153, 0.45)',
          outerRingColor: 'stroke-pink-500/40',
          innerRingColor: 'stroke-violet-400/50',
          textColor: 'text-pink-400',
          neonShadow: '0 0 35px rgba(236, 72, 153, 0.5)',
          statusText: 'SPEAKING: SYNAPSE AUDIO BROADCAST'
        };
      case 'buffering':
      case 'connecting':
        return {
          coreGrad: ['#a855f7', '#6366f1', '#4338ca'], // Purple to Indigo
          glow: 'rgba(168, 85, 247, 0.35)',
          outerRingColor: 'stroke-indigo-500/40',
          innerRingColor: 'stroke-purple-400/50',
          textColor: 'text-purple-300',
          neonShadow: '0 0 30px rgba(168, 85, 247, 0.35)',
          statusText: 'THINKING: SOLVING COGNITIVE NODES'
        };
      case 'error':
        return {
          coreGrad: ['#ef4444', '#b91c1c', '#7f1d1d'], // Red alert
          glow: 'rgba(239, 68, 68, 0.4)',
          outerRingColor: 'stroke-red-500/40',
          innerRingColor: 'stroke-red-400/50',
          textColor: 'text-red-500',
          neonShadow: '0 0 30px rgba(239, 68, 68, 0.4)',
          statusText: 'ALERT: NEURAL CORE DISRUPT'
        };
      case 'executing':
        return {
          coreGrad: ['#06b6d4', '#4f46e5', '#312e81'], // Teal to deep Indigo
          glow: 'rgba(6, 182, 212, 0.55)',
          outerRingColor: 'stroke-cyan-400/60',
          innerRingColor: 'stroke-indigo-400/70',
          textColor: 'text-cyan-400 animate-pulse',
          neonShadow: '0 0 35px rgba(6, 182, 212, 0.65)',
          statusText: 'EXECUTING: RESOLVING DESKTOP COM-PORT'
        };
      case 'success':
        return {
          coreGrad: ['#10b981', '#34d399', '#0f766e'], // Emerald to Bright Mint/Teal
          glow: 'rgba(16, 185, 129, 0.6)',
          outerRingColor: 'stroke-emerald-400/70',
          innerRingColor: 'stroke-teal-400/80',
          textColor: 'text-emerald-400 font-bold',
          neonShadow: '0 0 45px rgba(16, 185, 129, 0.75)',
          statusText: 'SUCCESS: ACTION APPLIED SEAMLESSLY'
        };
      case 'idle':
      default:
        return {
          coreGrad: ['#3b82f6', '#8b5cf6', '#4338ca'], // Calm Blue/Purple
          glow: 'rgba(59, 130, 246, 0.2)',
          outerRingColor: 'stroke-blue-500/20',
          innerRingColor: 'stroke-indigo-500/30',
          textColor: 'text-blue-400/80',
          neonShadow: '0 0 25px rgba(59, 130, 246, 0.2)',
          statusText: 'INTEL IDLE // WAVEFLOW STANDBY'
        };
    }
  };

  const { coreGrad, glow, outerRingColor, innerRingColor, textColor, neonShadow, statusText } = getColors();

  return (
    <div 
      ref={containerRef}
      id="orb-core-container"
      className="relative flex flex-col items-center justify-center w-[400px] h-[450px]"
    >
      
      {/* 1. Cinematic Background Spatial Grid */}
      <div className="absolute inset-x-8 top-12 bottom-20 bg-gradient-to-b from-slate-950 via-slate-900/40 to-black rounded-[48px] border border-white/5 backdrop-blur-[6px] shadow-2xl overflow-hidden pointer-events-none">
        {/* Soft Matrix Glow */}
        <div 
          className="absolute inset-[15%] rounded-full blur-[100px] transition-all duration-1000 ease-in-out opacity-20 pointer-events-none"
          style={{ backgroundColor: glow }}
        ></div>

        {/* Dynamic Scanline Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,38,0)_96%,rgba(244,63,94,0.02)_98%)] bg-[length:100%_4px] pointer-events-none opacity-40"></div>

        {/* Ambient Floating Digital Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full bg-white transition-colors duration-1000"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: state === 'listening' ? '#22d3ee' : state === 'speaking' ? '#ec4899' : '#fff',
                opacity: 0.15,
              }}
              animate={{
                y: [0, -40, 0],
                opacity: [0.1, 0.4, 0.1],
              }}
              transition={{
                duration: 5 + p.delay,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: p.delay,
              }}
            />
          ))}
        </div>
      </div>

      {/* 2. Primary Atmospheric Glow Overlay */}
      <div className="absolute inset-10 bg-gradient-to-tr from-cyan-950/10 via-transparent to-purple-950/20 rounded-full blur-[80px] pointer-events-none"></div>

      {/* 3. Dynamic Holographic Rotating Assemblies */}
      <div className="relative w-72 h-72 flex items-center justify-center overflow-visible select-none">
        
        {/* Reactive Ripple Ring (Outputs expanding waves for voice actions) */}
        <AnimatePresence>
          {(state === 'listening' || state === 'speaking' || state === 'executing' || state === 'success') && (
            <>
              <motion.div
                className="absolute inset-10 rounded-full border-2 border-cyan-500/20"
                initial={{ scale: 0.95, opacity: 0.8 }}
                animate={{ scale: state === 'executing' ? 1.7 : 1.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: state === 'executing' ? 1.0 : 1.8, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.div
                className="absolute inset-10 rounded-full border border-pink-500/20"
                initial={{ scale: 0.95, opacity: 0.6 }}
                animate={{ scale: state === 'executing' ? 2.0 : 1.8, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: state === 'executing' ? 1.2 : 2.2, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
              />
            </>
          )}
        </ AnimatePresence>

        {/* Interactive Ambient Orb Core Element */}
        <motion.div
          className="absolute w-36 h-36 rounded-full flex items-center justify-center pointer-events-none"
          animate={{
            scale: state === 'speaking' ? [1, 1.08, 0.98, 1.05, 1] : state === 'listening' ? [1, 1.04, 1] : [1, 1.03, 1],
            rotate: 360,
          }}
          transition={{
            scale: {
              duration: state === 'speaking' ? 0.6 : state === 'listening' ? 1.4 : 4.5,
              repeat: Infinity,
              ease: 'easeInOut',
            },
            rotate: {
              duration: state === 'buffering' ? 6 : 28,
              repeat: Infinity,
              ease: 'linear',
            },
          }}
          style={{
            background: `radial-gradient(circle at 35% 35%, ${coreGrad[0]} 0%, ${coreGrad[1]} 45%, ${coreGrad[2]} 100%)`,
            boxShadow: neonShadow,
          }}
        >
          {/* Sphere Highlight Glare */}
          <div className="absolute top-3 left-6 w-10 h-6 bg-white/25 rounded-full rotate-[-25deg] filter blur-[1px]"></div>
          
          {/* Shimmer Inner Orbit */}
          <motion.div
            className="absolute inset-5 rounded-full border border-white/10"
            animate={{ rotate: -360 }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>

        {/* SVG HUD Ring Interface overlay */}
        <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <linearGradient id="glowRing" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#db2777" />
            </linearGradient>
          </defs>

          {/* Outer Slow Telemetry Dash Ring */}
          <motion.circle
            cx="100"
            cy="100"
            r="82"
            fill="none"
            className={`${outerRingColor} transition-colors duration-1000`}
            strokeWidth="1.5"
            strokeDasharray="6 14"
            animate={{ rotate: 360 }}
            transition={{ duration: 42, repeat: Infinity, ease: 'linear' }}
            style={{ originX: '100px', originY: '100px' }}
          />

          {/* Outer Ring Telemetry Markers */}
          <motion.circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            className="stroke-white/5"
            strokeWidth="1.5"
            strokeDasharray="1 19"
          />

          {/* Inner Counter-Rotating Telemetry Solid Ring */}
          <motion.circle
            cx="100"
            cy="100"
            r="68"
            fill="none"
            className={`${innerRingColor} transition-colors duration-1000`}
            strokeWidth="1"
            strokeDasharray="100 45"
            animate={{ rotate: -360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            style={{ originX: '100px', originY: '100px' }}
          />

          {/* Core HUD Frame Ticks */}
          <path d="M 100,5 L 100,12 M 100,188 L 100,195 M 5,100 L 12,100 M 188,100 L 195,100" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

          {/* Listening State Waveform Pulse Bars */}
          {state === 'listening' && (
            <g transform="translate(100,100)">
              {Array.from({ length: 4 }).map((_, idx) => (
                <motion.circle
                  key={idx}
                  r={60 + idx * 8}
                  fill="none"
                  stroke="rgba(34, 211, 238, 0.2)"
                  strokeWidth="0.8"
                  animate={{ opacity: [0.1, 0.5, 0.1], scale: [0.98, 1.04, 0.98] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: idx * 0.3 }}
                />
              ))}
            </g>
          )}

          {/* Executing State Cyber Waves */}
          {state === 'executing' && (
            <g transform="translate(100,100)">
              {Array.from({ length: 5 }).map((_, idx) => (
                <motion.circle
                  key={idx}
                  r={58 + idx * 6}
                  fill="none"
                  stroke="rgba(34, 211, 238, 0.45)"
                  strokeWidth="1"
                  animate={{ opacity: [0.2, 0.7, 0.2], scale: [0.95, 1.1, 0.95] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: idx * 0.12 }}
                />
              ))}
            </g>
          )}

          {/* Success State Green Glow Rings */}
          {state === 'success' && (
            <g transform="translate(100,100)">
              {Array.from({ length: 4 }).map((_, idx) => (
                <motion.circle
                  key={idx}
                  r={60 + idx * 8}
                  fill="none"
                  stroke="rgba(16, 185, 129, 0.45)"
                  strokeWidth="1.2"
                  animate={{ opacity: [0.1, 0.8, 0.1], scale: [0.97, 1.06, 0.97] }}
                  transition={{ duration: 1.0, repeat: Infinity, delay: idx * 0.15 }}
                />
              ))}
            </g>
          )}

          {/* Speaking State Sine Pulse Bar Lines */}
          {state === 'speaking' && (
            <g transform="translate(100,100)">
              {Array.from({ length: 4 }).map((_, idx) => (
                <motion.circle
                  key={idx}
                  r={62 + idx * 7}
                  fill="none"
                  stroke="rgba(236, 72, 153, 0.25)"
                  strokeWidth="0.8"
                  animate={{ opacity: [0.2, 0.6, 0.2], scale: [0.99, 1.05, 0.99] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: idx * 0.2 }}
                />
              ))}
            </g>
          )}

          {/* Thinking State Rotating Multi-Axis Rings */}
          {(state === 'buffering' || state === 'connecting') && (
            <g transform="translate(100,100)">
              <motion.circle
                r="56"
                fill="none"
                stroke="rgba(168, 85, 247, 0.3)"
                strokeWidth="1.2"
                strokeDasharray="30 20"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
              <motion.circle
                r="50"
                fill="none"
                stroke="rgba(99, 102, 241, 0.4)"
                strokeWidth="0.8"
                strokeDasharray="15 15"
                animate={{ rotate: -360 }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
              />
            </g>
          )}
        </svg>

      </div>

      {/* 4. Mini Telemetry Signal HUD readout */}
      <div className="mt-2 flex flex-col items-center gap-1.5 relative z-30 pointer-events-auto">
        
        {/* Companion Operational State Flag */}
        <div className="text-[9px] font-mono select-none tracking-widest text-[#64748b] uppercase bg-black/60 px-3.5 py-1 rounded-full border border-white/5 shadow-2xl flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${
            state === 'listening' ? 'bg-cyan-400 animate-pulse' :
            state === 'speaking' ? 'bg-pink-400 animate-pulse' :
            state === 'executing' ? 'bg-indigo-400 animate-bounce' :
            state === 'success' ? 'bg-emerald-400 animate-ping' :
            state === 'error' ? 'bg-red-500' : 'bg-blue-500'
          }`} />
          NEURAL INTERFACE: <span className={`${textColor} font-bold`}>{state.toUpperCase()}</span>
        </div>

        {/* Dynamic telemetry status descriptor */}
        <div className="text-[10px] font-mono text-zinc-400 max-w-[280px] text-center tracking-wide uppercase truncate h-4">
          {statusText}
        </div>

      </div>

    </div>
  );
}
