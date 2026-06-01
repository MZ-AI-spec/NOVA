export type OrbState = "idle" | "listening" | "speaking" | "connecting" | "error" | "buffering" | "executing" | "success";

export interface LiveSessionConfig {
  apiKey: string;
  systemInstruction: string;
  tools?: any[];
  onStateChange?: (state: OrbState) => void;
  onAudioData?: (data: ArrayBuffer) => void;
  onInterrupted?: () => void;
  onTranscription?: (text: string, isModel: boolean) => void;
  onToolCall?: (toolCall: any) => Promise<any>;
}

export class GeminiLiveSession {
  private socket: WebSocket | null = null;
  private config: LiveSessionConfig;
  private isConnected = false;
  private isModelTurnActive = false;
  private stallTimeout: any = null;
  private lastAudioChunkTime = 0;
  private audioChunkCount = 0;
  private consecutiveSmallChunks = 0;
  private totalPayloadSize = 0;

  constructor(config: LiveSessionConfig) {
    this.config = config;
  }

  async connect(retryCount = 0) {
    this.config.onStateChange?.("connecting");
    
    const MAX_RETRIES = 3;
    
    try {
      if (retryCount === 0) {
        console.log("NOVA: Connecting to model gemini-3.1-flash-live-preview via server proxy...");
      } else {
        console.log(`NOVA: Connection retry attempt ${retryCount}/${MAX_RETRIES}...`);
      }

      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/live-proxy`;
      
      console.log(`NOVA: Initiating WebSocket connection to ${wsUrl}`);
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log("NOVA: Proxy WebSocket channel opened. Handshaking...");
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({
            type: "setup",
            config: {
              systemInstruction: this.config.systemInstruction,
              tools: this.config.tools
            }
          }));
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.type === "open") {
            this.isConnected = true;
            this.config.onStateChange?.("listening");
            console.log("NOVA: Live session bridge established");
          } else if (msg.type === "close") {
            this.isConnected = false;
            this.isModelTurnActive = false;
            this.clearStallDetection();
            this.config.onStateChange?.("idle");
            console.log("NOVA: Connection closed by server proxy");
          } else if (msg.type === "error") {
            console.error("NOVA: Server proxy encountered error details:", msg.error);
            this.config.onStateChange?.("error");
          } else if (msg.type === "message") {
            const message = msg.data;
            
            // Audio output from model
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              this.isModelTurnActive = true;
              this.lastAudioChunkTime = Date.now();
              this.audioChunkCount++;

              const chunkSizeBytes = (base64Audio.length * 3) / 4;
              this.totalPayloadSize += chunkSizeBytes;

              // Proactive buffering detection: 
              // Only trigger if we get extremely small chunks for a sustained period
              if (chunkSizeBytes < 2000) {
                this.consecutiveSmallChunks++;
                if (this.consecutiveSmallChunks > 12 && this.audioChunkCount > 10) {
                   console.warn(`NOVA: Proactive buffering triggered. Small chunk stream detected (${this.consecutiveSmallChunks} chunks).`);
                   this.config.onStateChange?.("buffering");
                }
              } else {
                this.consecutiveSmallChunks = 0;
                this.config.onStateChange?.("speaking");
              }

              const audioData = this.base64ToArrayBuffer(base64Audio);
              this.config.onAudioData?.(audioData);
              
              // Reset stall detection
              this.resetStallDetection();
            }

            // Transcriptions
            const modelTranscription = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (modelTranscription) {
              this.config.onTranscription?.(modelTranscription, true);
            }

            const userTranscription = message.serverContent?.userTurn?.parts?.[0]?.text;
            if (userTranscription) {
              this.config.onTranscription?.(userTranscription, false);
            }

            // Tool Calls
            const toolCalls = message.toolCall?.functionCalls;
            if (toolCalls && this.config.onToolCall) {
              this.processToolCalls(toolCalls);
            }

            // End of model turn
            if (message.serverContent?.turnComplete) {
                this.isModelTurnActive = false;
                this.clearStallDetection();
                this.consecutiveSmallChunks = 0;
                this.totalPayloadSize = 0;
                this.config.onStateChange?.("listening");
                console.log("NOVA: Model turn complete");
            }

            // Interruption handling (user speaking)
            if (message.serverContent?.interrupted) {
              this.isModelTurnActive = false;
              this.clearStallDetection();
              this.config.onInterrupted?.();
              this.config.onStateChange?.("listening");
            }
          }
        } catch (parseError) {
          console.error("NOVA: Failed to parse proxy web socket frame:", parseError);
        }
      };

      this.socket.onclose = (event) => {
        this.isConnected = false;
        this.isModelTurnActive = false;
        this.clearStallDetection();
        this.config.onStateChange?.("idle");
        console.log("NOVA: Proxy connection closed", event);
      };

      this.socket.onerror = (error) => {
        console.error("NOVA: WebSocket error details:", error);
        if (!this.isConnected) {
          this.config.onStateChange?.("error");
        } else {
          console.warn("NOVA: Transient socket error inside session. Attempting to preserve state.");
          this.handleNetworkGlitch();
        }
      };
    } catch (error: any) {
      console.error("NOVA: Exception initiating WebSocket transaction", error);
      
      const errorMessage = error?.toString() || "";
      const isUnavailable = errorMessage.toLowerCase().includes("unavailable") || 
                          errorMessage.toLowerCase().includes("resource_exhausted") ||
                          errorMessage.toLowerCase().includes("failed to connect");

      if (isUnavailable && retryCount < MAX_RETRIES) {
        const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
        console.log(`NOVA: Service unavailable. Auto-retry in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.connect(retryCount + 1);
      }

      this.config.onStateChange?.("error");
      throw error;
    }
  }

  private resetStallDetection() {
    if (this.stallTimeout) clearTimeout(this.stallTimeout);
    
    this.stallTimeout = setTimeout(() => {
      if (this.isConnected && this.isModelTurnActive) {
        console.warn("NOVA: Audio stream stall detected. Moving to buffering state.");
        this.config.onStateChange?.("buffering");
      }
    }, 1200);
  }

  private clearStallDetection() {
    if (this.stallTimeout) {
      clearTimeout(this.stallTimeout);
      this.stallTimeout = null;
    }
    this.audioChunkCount = 0;
  }

  private handleNetworkGlitch() {
    if (this.isModelTurnActive) {
      this.config.onStateChange?.("buffering");
    }
  }

  private async processToolCalls(toolCalls: any[]) {
    try {
      const responses = await Promise.all(
        toolCalls.map(async (call: any) => {
          const result = await this.config.onToolCall!(call);
          return {
            name: call.name,
            response: result,
            id: call.id,
          };
        })
      );
      if (this.socket && this.isConnected && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
          type: "toolResponse",
          data: {
            functionResponses: responses
          }
        }));
      }
    } catch (error) {
      console.error("NOVA: Tool call proxy processing failure", error);
    }
  }

  sendAudio(base64Data: string) {
    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: "realtimeInput",
        data: {
          audio: { data: base64Data, mimeType: "audio/pcm;rate=16000" }
        }
      }));
    }
  }

  sendText(text: string) {
    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: "realtimeInput",
        data: {
          text: text
        }
      }));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
    this.isConnected = false;
    this.config.onStateChange?.("idle");
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
