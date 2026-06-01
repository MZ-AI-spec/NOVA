import { motion, AnimatePresence } from 'motion/react';
import { X, Brain, Database, Shield, Image as ImageIcon, Cpu, Zap, Activity } from 'lucide-react';
import { memoryService, NovaMemory } from '../lib/memory-service';
import { useEffect, useState } from 'react';

interface MemoryModalsProps {
  activePanel: string | null;
  onClose: () => void;
  onSelectImage?: (image: any) => void;
}

export default function MemoryModals({ activePanel, onClose, onSelectImage }: MemoryModalsProps) {
  const [memory, setMemory] = useState<NovaMemory | null>(null);

  useEffect(() => {
    if (activePanel) {
      setMemory(memoryService.load());
    }
  }, [activePanel]);

  if (!activePanel) return null;

  const panels = {
    neural: {
      title: 'Neural Memory',
      icon: <Brain className="w-5 h-5 text-blue-400" />,
      content: (
        <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[10px] text-white/30 uppercase tracking-[0.2em] block mb-2">Cognitive Load</span>
                <div className="flex items-end gap-2">
                    <span className="text-2xl font-mono text-blue-400">12%</span>
                    <span className="text-[10px] text-white/20 mb-1 italic">OPTIMAL</span>
                </div>
             </div>
             <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <span className="text-[10px] text-white/30 uppercase tracking-[0.2em] block mb-2">Pattern Sync</span>
                <div className="flex items-end gap-2">
                    <span className="text-2xl font-mono text-purple-400">98.4</span>
                    <span className="text-[10px] text-white/20 mb-1 italic">SYNCED</span>
                </div>
             </div>
          </div>
          <div>
            <h4 className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-4 border-b border-white/5 pb-2">Established User Traits</h4>
            <div className="flex flex-wrap gap-2">
                {Object.entries(memory?.preferences || {}).length > 0 ? (
                    Object.entries(memory?.preferences || {}).map(([key, val]) => (
                        <div key={key} className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300">
                           {key}: {String(val)}
                        </div>
                    ))
                ) : (
                    <p className="text-[11px] text-white/20 italic">No established traits detected yet. Continue interacting to build neural weights.</p>
                )}
            </div>
          </div>
          <div>
            <h4 className="text-[10px] text-white/40 uppercase tracking-[0.2em] mb-4 border-b border-white/5 pb-2">Ongoing Tasks & Context</h4>
            <div className="space-y-2">
                {memory?.ongoingTasks && memory.ongoingTasks.length > 0 ? (
                    memory.ongoingTasks.map((task) => (
                        <div key={task.id} className="flex items-start justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                           <div className="flex items-start gap-2.5">
                              <span className={`w-2 h-2 rounded-full mt-1.5 ${task.status === 'completed' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'}`} />
                              <div>
                                 <p className={`text-[11px] text-white/80 font-medium ${task.status === 'completed' ? 'line-through text-white/40' : ''}`}>{task.description}</p>
                                 <span className="text-[8px] text-white/20 font-mono uppercase tracking-widest">{task.status}</span>
                              </div>
                           </div>
                        </div>
                    ))
                ) : (
                    <p className="text-[11px] text-white/20 italic">No ongoing tasks mapped in active memory context.</p>
                )}
            </div>
          </div>
        </div>
      )
    },
    archive: {
      title: 'Memory Archive',
      icon: <Database className="w-5 h-5 text-purple-400" />,
      content: (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {memory?.sessionSummaries && memory.sessionSummaries.length > 0 && (
            <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/10 space-y-2">
              <span className="text-[9px] uppercase tracking-widest text-purple-400 font-bold block">Historical Highlights</span>
              <ul className="space-y-1.5">
                 {memory.sessionSummaries.map((sum, idx) => (
                    <li key={idx} className="text-xs text-white/70 italic leading-relaxed list-disc list-inside">
                       {sum}
                    </li>
                 ))}
              </ul>
            </div>
          )}
          
          <h4 className="text-[10px] text-white/40 uppercase tracking-[0.2em] pt-2 pb-1 border-b border-white/5">Transcription Stream</h4>

          {memory?.recentConversations.length === 0 ? (
            <p className="text-sm text-white/20 italic text-center py-10">Archive is empty. Initiation required.</p>
          ) : (
            memory?.recentConversations.slice().reverse().map((conv, i) => (
              <div key={i} className={`p-3 rounded-lg border ${conv.role === 'user' ? 'bg-white/[0.03] border-white/10 ml-8' : 'bg-purple-500/5 border-purple-500/10 mr-8'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-[9px] uppercase tracking-widest font-bold ${conv.role === 'user' ? 'text-white/40' : 'text-purple-400'}`}>
                    {conv.role}
                  </span>
                  <span className="text-[8px] text-white/20">{new Date(conv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed truncate">{conv.text}</p>
              </div>
            ))
          )}
        </div>
      )
    },
    vault: {
      title: 'Visual Vault',
      icon: <ImageIcon className="w-5 h-5 text-indigo-400" />,
      content: (
        <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
           {memory?.visualMetadata.length === 0 ? (
             <div className="col-span-2 text-center py-20 bg-white/[0.01] rounded-2xl border border-white/5">
                <ImageIcon className="w-8 h-8 text-white/10 mx-auto mb-4" />
                <p className="text-xs text-white/30 italic uppercase tracking-[0.2em]">Vault Empty</p>
             </div>
           ) : (
             memory?.visualMetadata.map((img, i) => (
               <button
                 type="button"
                 key={i}
                 disabled={!img.url}
                 onClick={() => img.url && onSelectImage?.(img)}
                 className={`group relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center text-left ${img.url ? 'cursor-pointer hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] focus:ring-1 focus:ring-indigo-500/30' : 'cursor-not-allowed'} transition-all duration-300 w-full p-0`}
               >
                  {img.url ? (
                    <img 
                      src={img.url} 
                      alt={img.prompt} 
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-black/80 flex flex-col items-center justify-center p-4 text-center">
                       <Cpu className="w-6 h-6 text-indigo-400/60 animate-pulse mb-2" />
                       <span className="text-[8px] font-mono tracking-widest text-indigo-300 bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-500/20">CYBER_SCHEMATIC</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                     <p className="text-[9px] text-white/60 line-clamp-2 italic">"{img.prompt}"</p>
                  </div>
               </button>
             ))
           )}
        </div>
      )
    },
    core: {
      title: 'Core Storage',
      icon: <Shield className="w-5 h-5 text-cyan-400" />,
      content: (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                   <Cpu className="w-4 h-4 text-cyan-400" />
                   <span className="text-xs font-mono text-white/70 uppercase tracking-widest">Processor Health</span>
                </div>
                <span className="text-[10px] text-cyan-400 font-mono">99.9%</span>
             </div>
             <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: '99.9%' }}
                   className="h-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]"
                />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-2 mb-2 text-white/40">
                   <Zap className="w-3 h-3" />
                   <span className="text-[9px] uppercase tracking-widest">Uptime</span>
                </div>
                <div className="text-lg font-mono text-white/80">04:12:09</div>
             </div>
             <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                <div className="flex items-center gap-2 mb-2 text-white/40">
                   <Activity className="w-3 h-3" />
                   <span className="text-[9px] uppercase tracking-widest">Entropy</span>
                </div>
                <div className="text-lg font-mono text-white/80">0.0024</div>
             </div>
          </div>

          <div className="flex flex-col gap-2">
             <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/20 mb-1">
                <span>Memory Footprint</span>
                <span>0.8 MB / 5.0 MB</span>
             </div>
             <div className="flex gap-1">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className={`h-2 flex-1 rounded-sm ${i < 2 ? 'bg-cyan-400/40' : 'bg-white/5'}`} />
                ))}
             </div>
          </div>
        </div>
      )
    }
  };

  const selected = panels[activePanel as keyof typeof panels];
  if (!selected) return null;

  return (
    <AnimatePresence>
      {activePanel && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md pointer-events-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, rotateX: 10 }}
            animate={{ scale: 1, y: 0, rotateX: 0 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="w-full max-w-lg bg-[#080808]/90 border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glossy top highlight */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            
            {/* Technical Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                  {selected.icon}
                </div>
                <div>
                   <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">{selected.title}</h3>
                   <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500/80 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                      <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Active Data Stream</span>
                   </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/20 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Panel Content */}
            <div className="p-6">
              {selected.content}
            </div>

            {/* Footer Status */}
            <div className="px-6 py-3 bg-white/[0.02] border-t border-white/5 flex justify-between items-center">
              <span className="text-[8px] font-mono text-white/20 uppercase tracking-[0.3em]">NOVA_OS.MEMORY.EXP_BRANCH</span>
              <span className="text-[8px] font-mono text-white/20 italic">V-STABLE.0441</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
