/**
 * Lightweight memory service for NOVA.
 * Handles storage of preferences and short-term context in localStorage.
 */

export interface OngoingTask {
  id: string;
  description: string;
  status: 'active' | 'completed';
  timestamp: number;
}

export interface NovaMemory {
  preferences: Record<string, any>;
  recentConversations: { role: 'user' | 'nova', text: string, timestamp: number }[];
  visualMetadata: any[];
  ongoingTasks?: OngoingTask[];
  sessionSummaries?: string[];
}

const STORAGE_KEY = 'nova_core_memory';

export const memoryService = {
  load(): Required<NovaMemory> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          preferences: parsed.preferences || {},
          recentConversations: parsed.recentConversations || [],
          visualMetadata: parsed.visualMetadata || [],
          ongoingTasks: parsed.ongoingTasks || [],
          sessionSummaries: parsed.sessionSummaries || []
        };
      }
    } catch (e) {
      console.error('Failed to load NOVA memory', e);
    }
    return { preferences: {}, recentConversations: [], visualMetadata: [], ongoingTasks: [], sessionSummaries: [] };
  },

  save(memory: NovaMemory) {
    try {
      // Keep up to 100 conversations to stay lightweight but have complete rolling long-term history
      if (memory.recentConversations.length > 100) {
        memory.recentConversations = memory.recentConversations.slice(-100);
      }
      
      // Limit to 10 images initially to save space
      if (memory.visualMetadata.length > 10) {
        memory.visualMetadata = memory.visualMetadata.slice(0, 10);
      }

      // Safeguard tasks and summaries lists
      if (!memory.ongoingTasks) memory.ongoingTasks = [];
      if (!memory.sessionSummaries) memory.sessionSummaries = [];

      const serialized = JSON.stringify(memory);
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        console.warn('NOVA: Memory quota exceeded. Pruning files...');
        // If we hit quota, keep only the most recent image
        if (memory.visualMetadata && memory.visualMetadata.length > 1) {
          memory.visualMetadata = memory.visualMetadata.slice(0, 1);
          this.save(memory);
        } else {
          // Clear all visual data to restore disk space
          memory.visualMetadata = [];
          if (memory.recentConversations.length > 20) {
            memory.recentConversations = memory.recentConversations.slice(-20);
          }
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
          } catch (internalError) {
             console.error('Critically failed to save NOVA memory even after pruning.', internalError);
          }
        }
      } else {
        console.error('Failed to save NOVA memory', e);
      }
    }
  },

  updatePreference(key: string, value: any) {
    const mem = this.load();
    mem.preferences[key] = value;
    this.save(mem);
  },

  updateTaskByDescription(description: string, status: 'active' | 'completed' = 'active') {
    const mem = this.load();
    const normalizedDesc = description.trim().toLowerCase();
    const taskIndex = mem.ongoingTasks.findIndex(t => 
      t.description.toLowerCase().includes(normalizedDesc) || normalizedDesc.includes(t.description.toLowerCase())
    );

    if (taskIndex > -1) {
      mem.ongoingTasks[taskIndex].status = status;
    } else {
      const id = Math.random().toString(36).substring(2, 9);
      mem.ongoingTasks.push({ id, description, status, timestamp: Date.now() });
    }
    this.save(mem);
  },

  removeOngoingTask(description: string) {
    const mem = this.load();
    const normalizedDesc = description.trim().toLowerCase();
    mem.ongoingTasks = mem.ongoingTasks.filter(t => 
      !t.description.toLowerCase().includes(normalizedDesc) && !normalizedDesc.includes(t.description.toLowerCase())
    );
    this.save(mem);
  },

  addSessionSummary(summary: string) {
    const mem = this.load();
    mem.sessionSummaries.push(summary);
    if (mem.sessionSummaries.length > 5) {
      mem.sessionSummaries = mem.sessionSummaries.slice(-5);
    }
    this.save(mem);
  },

  addImage(image: { url: string, prompt: string, timestamp: number }) {
    const mem = this.load();
    mem.visualMetadata.unshift(image);
    // Initial loose limit, save() will enforce tighter if needed
    if (mem.visualMetadata.length > 15) {
      mem.visualMetadata = mem.visualMetadata.slice(0, 15);
    }
    this.save(mem);
  },

  addConversation(role: 'user' | 'nova', text: string) {
    const mem = this.load();
    mem.recentConversations.push({ role, text, timestamp: Date.now() });
    this.save(mem);
  }
};
