import { motion } from 'motion/react';
import { Brain, Database, Shield, Image as ImageIcon } from 'lucide-react';

interface MemoryPanelsProps {
  onPanelClick?: (id: string) => void;
}

export default function MemoryPanels({ onPanelClick }: MemoryPanelsProps) {
  const panels = [
    { id: 'neural', label: 'Neural Memory', icon: <Brain className="w-3 h-3" />, color: 'text-blue-400' },
    { id: 'archive', label: 'Memory Archive', icon: <Database className="w-3 h-3" />, color: 'text-purple-400' },
    { id: 'vault', label: 'Visual Vault', icon: <ImageIcon className="w-3 h-3" />, color: 'text-indigo-400' },
    { id: 'core', label: 'Core Storage', icon: <Shield className="w-3 h-3" />, color: 'text-cyan-400' },
  ];

  return (
    <div className="flex flex-col gap-8 pointer-events-auto min-w-[140px]">
      {panels.map((panel, idx) => (
        <motion.div
          key={panel.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 + idx * 0.1, duration: 1 }}
          onClick={() => onPanelClick?.(panel.id)}
          className="group flex items-center gap-4 text-right cursor-pointer"
        >
          <div className="flex flex-col items-end">
            <span className="text-[8px] tracking-[0.3em] uppercase text-white/20 group-hover:text-white/40 transition-colors">
              {panel.label}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-white/50">ACTIVE</span>
              <motion.div 
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 2, repeat: Infinity, delay: idx * 0.5 }}
                className={`w-1 h-1 rounded-full bg-current ${panel.color}`} 
              />
            </div>
          </div>
          <div className={`p-2.5 rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl ${panel.color} shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden group-hover:border-white/30 group-hover:bg-white/[0.08] transition-all group-hover:scale-110`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <div className="relative z-10">{panel.icon}</div>
          </div>
        </motion.div>
      ))}
      
      {/* Decorative vertical line */}
      <div className="absolute right-[18px] top-6 bottom-6 w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent" />
    </div>
  );
}
