import { useState, useEffect, useRef, useCallback } from 'react';
import { float32ToInt16, int16ToFloat32 } from '../lib/audio-utils';

export function useAudioHandler(onInputAudio: (base64: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Playback queue and scheduling
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextStartTimeRef = useRef(0);
  const schedulerTimerRef = useRef<number | null>(null);
  const lastChunkTimeRef = useRef(0);
  const isBufferingRef = useRef(false);

  // Helper to safely initialize and resume the AudioContext for both recording and playback
  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const scheduleAudio = useCallback(() => {
    const audioContext = ensureAudioContext();
    if (!audioContext) return;

    const currentTime = audioContext.currentTime;
    const scheduleAheadTime = 0.25; // 250ms lookahead
    
    // While we have chunks and they fit within our schedule window
    while (audioQueueRef.current.length > 0 && nextStartTimeRef.current < currentTime + scheduleAheadTime) {
      const chunk = audioQueueRef.current.shift()!;
      const audioBuffer = audioContext.createBuffer(1, chunk.length, 24000);
      audioBuffer.getChannelData(0).set(chunk);

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      // If we've drifted or just started, sync to current time + small buffer
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime + 0.1; // 100ms initial buffer
      }

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
      lastChunkTimeRef.current = Date.now();
      isBufferingRef.current = false;
    }

    // If queue is empty and we've finished playing what was scheduled, stop playing
    if (audioQueueRef.current.length === 0 && nextStartTimeRef.current < currentTime) {
      if (Date.now() - lastChunkTimeRef.current > 1000) {
        isPlayingRef.current = false;
        if (schedulerTimerRef.current) {
          clearInterval(schedulerTimerRef.current);
          schedulerTimerRef.current = null;
        }
      } else {
        isBufferingRef.current = true;
      }
    }
  }, [ensureAudioContext]);

  const startPlayback = useCallback(() => {
    if (isPlayingRef.current) return;
    const audioContext = ensureAudioContext();
    if (!audioContext) return;
    
    isPlayingRef.current = true;
    isBufferingRef.current = false;
    nextStartTimeRef.current = audioContext.currentTime + 0.1;
    
    if (schedulerTimerRef.current) clearInterval(schedulerTimerRef.current);
    schedulerTimerRef.current = window.setInterval(scheduleAudio, 50) as unknown as number;
  }, [scheduleAudio, ensureAudioContext]);

  const addAudioChunk = useCallback((arrayBuffer: ArrayBuffer) => {
    const int16Array = new Int16Array(arrayBuffer);
    const float32Array = int16ToFloat32(int16Array);
    audioQueueRef.current.push(float32Array);
    
    const initialBufferThreshold = isBufferingRef.current ? 2 : 4;

    if (!isPlayingRef.current && audioQueueRef.current.length >= initialBufferThreshold) {
      startPlayback();
    } else if (isPlayingRef.current) {
      // Fast path: if already "started" but essentially idling/buffering, 
      // the interval will pick it up, but we can nudge it.
      scheduleAudio();
    }
  }, [startPlayback, scheduleAudio]);

  const clearQueue = useCallback(() => {
    audioQueueRef.current = [];
    nextStartTimeRef.current = 0;
    isPlayingRef.current = false;
    isBufferingRef.current = false;
    if (schedulerTimerRef.current) {
      clearInterval(schedulerTimerRef.current);
      schedulerTimerRef.current = null;
    }
    // Note: We don't stop the current context to avoid clicks, 
    // just clear the scheduler and queue.
  }, []);

  const startRecording = async () => {
    try {
      // Create and wake up AudioContext first (will work regardless of microphone status/permissions)
      const audioContext = ensureAudioContext();

      // Access microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Use a smaller 1024-sample buffer size (instead of 4096) for 4x faster responsive streaming
      const processor = audioContext.createScriptProcessor(1024, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Highly sensitive gate to suppress total silence, while preserving soft speech consonants
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        
        if (rms < 0.0001) {
          return;
        }

        const pcmData = float32ToInt16(inputData);
        
        // Convert to base64 for Gemini
        const binary = String.fromCharCode(...new Uint8Array(pcmData.buffer));
        const base64 = btoa(binary);
        onInputAudio(base64);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone access restricted:', err);
      throw err;
    }
  };

  const stopRecording = () => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
    }
    setIsRecording(false);
  };

  useEffect(() => {
    return () => {
      stopRecording();
      if (audioContextRef.current) {
          audioContextRef.current.close();
      }
    };
  }, []);

  return { isRecording, startRecording, stopRecording, addAudioChunk, clearQueue, initAudio: ensureAudioContext };
}
