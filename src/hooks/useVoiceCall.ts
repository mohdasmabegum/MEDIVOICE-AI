import { useState, useEffect, useRef, useCallback } from 'react';
import { CallState, TranscriptTurn, Doctor, Appointment, BookingSuccessData, CancellationSuccessData } from '../types';
import { API_BASE_URL } from '../services/api';

const normalizeWsUrl = (raw: string): string => {
  const trimmed = raw.trim().replace(/\/+$/, '');
  let wsProto = trimmed;
  if (/^https:\/\//i.test(wsProto)) {
    wsProto = wsProto.replace(/^https:\/\//i, 'wss://');
  } else if (/^http:\/\//i.test(wsProto)) {
    wsProto = wsProto.replace(/^http:\/\//i, 'ws://');
  } else if (!/^wss?:\/\//i.test(wsProto)) {
    wsProto = `wss://${wsProto}`;
  }
  if (wsProto.endsWith('/ws/call')) return wsProto;
  return `${wsProto.replace(/\/api$/, '')}/ws/call`;
};

const getBackendWsCandidates = (): string[] => {
  const env = (import.meta as any).env || {};
  const explicitWsUrl = env.VITE_WS_URL as string | undefined;
  const envApiUrl = env.VITE_API_URL as string | undefined;
  const candidates: string[] = [];

  // 1. Explicitly configured WebSocket URL has highest priority in production
  if (explicitWsUrl && explicitWsUrl.trim()) {
    const trimmed = explicitWsUrl.trim();
    if (!trimmed.includes('vercel.app')) {
      candidates.push(normalizeWsUrl(trimmed));
    }
  }

  // 2. Correctly derive the WebSocket URL from VITE_API_URL only when VITE_WS_URL is not configured
  if (candidates.length === 0 && envApiUrl && /^https?:\/\//i.test(envApiUrl.trim())) {
    const trimmedApi = envApiUrl.trim();
    // In production, never derive a WebSocket URL pointing to vercel.app
    if (!trimmedApi.includes('vercel.app')) {
      candidates.push(normalizeWsUrl(trimmedApi));
    }
  }

  // Check hostname strictly in browser runtime
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isPureLocalhost =
    hostname === 'localhost' || hostname === '127.0.0.1';

  // Strictly ONLY during local development (running on localhost/127.0.0.1 and not on any remote domain)
  // The production build on Vercel or any remote domain will NEVER include localhost or port 8080.
  if (isPureLocalhost && env.DEV) {
    candidates.push('ws://127.0.0.1:8080/ws/call');
    candidates.push('ws://localhost:8080/ws/call');
  }

  return Array.from(new Set(candidates));
};

const BACKEND_API_URL = API_BASE_URL;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

interface UseVoiceCallOptions {
  doctors: Doctor[];
  appointments: Appointment[];
  onBookAppointment: (data: {
    patientName: string;
    patientPhone: string;
    doctorId: string;
    slot: string;
    symptoms?: string;
    preConfirmedBooking?: BookingSuccessData;
  }) => Promise<{ success: boolean; booking?: BookingSuccessData; error?: string }>;
  onCancelAppointment: (
    bookingId: string,
    phone: string,
    reason: string,
    preConfirmedCancellation?: CancellationSuccessData
  ) => Promise<{ success: boolean; cancellation?: CancellationSuccessData; error?: string }>;
  onShowToast: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
}

export const useVoiceCall = ({
  doctors,
  appointments,
  onBookAppointment,
  onCancelAppointment,
  onShowToast,
}: UseVoiceCallOptions) => {
  const [callState, setCallState] = useState<CallState>('idle');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(16).fill(4));
  const [averageVolume, setAverageVolume] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [conversationStage, setConversationStage] = useState<string>('idle');

  // Refs to avoid stale closures in WebSocket / MediaRecorder / rAF callbacks
  const callStateRef = useRef<CallState>(callState);
  callStateRef.current = callState;
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  const wsRef = useRef<WebSocket | null>(null);
  const wsOpenedRef = useRef(false);
  const wsOutgoingQueueRef = useRef<string[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Audio playback queue
  const audioQueueRef = useRef<Array<{ audio: string; contentType: string }>>([]);
  const isPlayingAudioRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // MediaRecorder + VAD state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('audio/webm');
  const isSpeakingRef = useRef(false);
  const lastSpeechTimeRef = useRef<number>(0);
  const isFlushingUtteranceRef = useRef(false);

  // --- Safe WebSocket Send with Queueing ---
  const sendWsMessage = useCallback((payload: Record<string, any>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(payload));
      } catch (err) {
        console.warn('[MediVoice] Error sending WS message:', err);
      }
    } else if (ws && ws.readyState === WebSocket.CONNECTING) {
      // Queue critical control messages only (ignore background pings/chunks while connecting)
      if (payload.type === 'init' || payload.type === 'text_input' || payload.type === 'end_call') {
        const jsonStr = JSON.stringify(payload);
        if (wsOutgoingQueueRef.current.length < 20) {
          wsOutgoingQueueRef.current.push(jsonStr);
        }
      }
    }
  }, []);

  // Flush queued messages when socket opens
  const flushWsOutgoingQueue = useCallback((ws: WebSocket) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    while (wsOutgoingQueueRef.current.length > 0) {
      const msg = wsOutgoingQueueRef.current.shift()!;
      try {
        ws.send(msg);
      } catch (err) {
        console.warn('[MediVoice] Failed to send queued message:', err);
      }
    }
  }, []);
  const addTranscript = useCallback((speaker: 'assistant' | 'user' | 'system', text: string) => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    setTranscript((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, speaker, text, time }]);
  }, []);

  // --- Stop current AI audio playback (used on endCall or interrupt) ---
  const stopAudioPlayback = useCallback(() => {
    audioQueueRef.current = [];
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {}
      currentAudioRef.current = null;
    }
    isPlayingAudioRef.current = false;
  }, []);

  // --- ElevenLabs TTS Audio Playback ---
  const playAudioB64 = useCallback(async (audioB64: string, contentType: string) => {
    try {
      const binary = atob(audioB64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: contentType || 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;
      setCallState('ai_speaking');
      setConversationStage('ai_speaking');

      // Ensure any suspended AudioContext is resumed
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }

      await new Promise<void>((resolve) => {
        let finished = false;
        const cleanup = () => {
          if (finished) return;
          finished = true;
          URL.revokeObjectURL(url);
          if (currentAudioRef.current === audio) currentAudioRef.current = null;
          resolve();
        };

        audio.onended = cleanup;
        audio.onerror = cleanup;
        audio.play().catch((playErr) => {
          console.warn('[MediVoice] Audio play error (handling autoplay policy):', playErr);
          cleanup();
        });
      });
    } catch (err) {
      console.warn('[MediVoice] Audio decode error:', err);
    }
  }, []);

  // Process audio queue sequentially
  const processAudioQueue = useCallback(async () => {
    if (isPlayingAudioRef.current) return;
    if (audioQueueRef.current.length === 0) return;
    isPlayingAudioRef.current = true;
    try {
      while (audioQueueRef.current.length > 0) {
        const item = audioQueueRef.current.shift()!;
        await playAudioB64(item.audio, item.contentType);
      }
    } finally {
      isPlayingAudioRef.current = false;
      if (callStateRef.current === 'ai_speaking') {
        setCallState('listening');
        setConversationStage('listening');
      }
    }
  }, [playAudioB64]);

  // --- Start a fresh MediaRecorder utterance ---
  const startUtteranceRecorder = useCallback((stream: MediaStream, ws: WebSocket) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
    mimeTypeRef.current = mimeType || 'audio/webm';

    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];
    isSpeakingRef.current = false;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0 && !isMutedRef.current) {
        audioChunksRef.current.push(e.data);
      }
    };

    recorder.onstop = async () => {
      const shouldSend = isFlushingUtteranceRef.current;
      isFlushingUtteranceRef.current = false;
      const chunks = audioChunksRef.current;
      audioChunksRef.current = [];

      // Audio chunks must ONLY be sent when the transport is strictly ready and OPEN
      if (shouldSend && chunks.length > 0 && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          const blob = new Blob(chunks, { type: mimeTypeRef.current });
          if (blob.size >= 800) {
            const buf = await blob.arrayBuffer();
            const b64 = arrayBufferToBase64(buf);
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              sendWsMessage({ type: 'audio_chunk', data: b64 });
              sendWsMessage({ type: 'speech_end' });
            }
          }
        } catch (err) {
          console.warn('[MediVoice] Failed to send audio utterance:', err);
        }
      }

      // Immediately start a new recorder with a fresh WebM header if call is still active
      if (
        wsRef.current &&
        wsRef.current.readyState === WebSocket.OPEN &&
        mediaStreamRef.current &&
        callStateRef.current !== 'ended' &&
        callStateRef.current !== 'idle' &&
        callStateRef.current !== 'error'
      ) {
        startUtteranceRecorder(mediaStreamRef.current, wsRef.current);
      }
    };

    recorder.start(250);
  }, []);

  // --- Microphone Audio Waveform Visualiser + VAD Silence Detection ---
  const startAudioAnalysis = useCallback((stream: MediaStream, ws: WebSocket) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const SPEECH_THRESHOLD = 0.04;
      const SILENCE_MS = 1200;

      const updateWaveform = () => {
        if (!analyserRef.current) return;

        if (isMutedRef.current) {
          setAudioLevels(new Array(16).fill(4));
          setAverageVolume(0);
          isSpeakingRef.current = false;
        } else {
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          const levels: number[] = [];
          const step = Math.floor(dataArray.length / 16) || 1;
          for (let i = 0; i < 16; i++) {
            const val = dataArray[i * step] || 0;
            sum += val;
            levels.push(Math.max(4, Math.min(72, (val / 255) * 72)));
          }
          const avgVol = sum / (dataArray.length * 255);
          setAverageVolume(avgVol);
          setAudioLevels(levels);

          // Voice Activity Detection (VAD)
          const now = Date.now();
          if (avgVol > SPEECH_THRESHOLD) {
            // If user speaks while AI is speaking, interrupt AI playback
            if (isPlayingAudioRef.current && avgVol > 0.08) {
              stopAudioPlayback();
              sendWsMessage({ type: 'interrupt' });
            }
            if (!isPlayingAudioRef.current && callStateRef.current !== 'processing') {
              isSpeakingRef.current = true;
              lastSpeechTimeRef.current = now;
            }
          } else if (isSpeakingRef.current && now - lastSpeechTimeRef.current > SILENCE_MS) {
            // User finished speaking — stop recorder to flush complete WebM blob with header
            isSpeakingRef.current = false;
            const rec = mediaRecorderRef.current;
            if (rec && rec.state === 'recording' && !isFlushingUtteranceRef.current) {
              isFlushingUtteranceRef.current = true;
              rec.stop();
            }
          }
        }

        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      updateWaveform();
    } catch {}
  }, [stopAudioPlayback]);

  const stopAudioAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    analyserRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setAudioLevels(new Array(16).fill(4));
    setAverageVolume(0);
  }, []);

  // --- WebSocket Event Handler ---
  const handleWsMessage = useCallback((event: MessageEvent) => {
    let msg: any;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }

    switch (msg.type) {
      case 'connection_ready':
        sendWsMessage({
          type: 'init',
          callerPhone: '+1 (555) 000-0000',
          callerName: 'Caller',
        });
        break;

      case 'call_state':
        // Do not override ai_speaking -> listening prematurely while browser audio queue is still playing
        if (msg.state === 'listening' && isPlayingAudioRef.current) {
          break;
        }
        setCallState(msg.state as CallState);
        if (msg.state === 'listening') setConversationStage('listening');
        if (msg.state === 'processing') setConversationStage('processing');
        if (msg.state === 'ai_speaking') setConversationStage('ai_speaking');
        break;

      case 'llm_response':
        addTranscript('assistant', msg.text);
        break;

      case 'stt_transcript':
        addTranscript('user', msg.text);
        break;

      case 'audio_response':
        audioQueueRef.current.push({ audio: msg.audio, contentType: msg.contentType || 'audio/mpeg' });
        processAudioQueue();
        break;

      case 'booking_confirmed':
        if (msg.booking) {
          onBookAppointment({
            patientName: msg.booking.patientName,
            patientPhone: msg.booking.patientPhone,
            doctorId: msg.booking.doctorId,
            slot: msg.booking.appointmentTime,
            symptoms: msg.booking.symptoms,
            preConfirmedBooking: msg.booking,
          });
        }
        break;

      case 'cancellation_confirmed':
        if (msg.cancellation) {
          onCancelAppointment(
            msg.cancellation.bookingId,
            msg.cancellation.patientPhone,
            msg.cancellation.reason || 'Cancelled via AI',
            msg.cancellation
          );
        }
        break;

      case 'speech_error':
        onShowToast('error', 'Speech Error', msg.error || 'Speech processing failed');
        addTranscript('system', `Speech error: ${msg.error}`);
        break;

      case 'speech_warning':
        addTranscript('system', msg.message);
        break;

      case 'error':
        setCallState('error');
        setErrorMessage(msg.message || 'Pipeline error');
        onShowToast('error', `Error (${msg.code || 'PIPELINE'})`, msg.message || 'Voice pipeline error');
        addTranscript('system', msg.message);
        break;
    }
  }, [addTranscript, processAudioQueue, onBookAppointment, onCancelAppointment, onShowToast]);

  // --- End Call ---
  const endCall = useCallback(() => {
    stopAudioPlayback();
    wsOutgoingQueueRef.current = [];

    const ws = wsRef.current;
    wsRef.current = null;
    if (ws) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'end_call' }));
        } catch {}
      }
      try {
        ws.close();
      } catch {}
    }

    isFlushingUtteranceRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    isSpeakingRef.current = false;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    stopAudioAnalysis();
    setCallState('ended');
  }, [stopAudioAnalysis, stopAudioPlayback]);

  // --- Start Call ---
  const startCall = useCallback(async () => {
    // Clean up any prior session resources first
    stopAudioPlayback();
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    stopAudioAnalysis();
    wsOutgoingQueueRef.current = [];
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }

    setErrorMessage(null);
    setCallState('requesting_mic');
    setTranscript([]);
    setDuration(0);
    setConversationStage('greeting');
    wsOpenedRef.current = false;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
    } catch (err: any) {
      setCallState('error');
      const msg = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
        ? 'Microphone access was denied. Please allow microphone permission in your browser.'
        : 'Could not access microphone hardware.';
      setErrorMessage(msg);
      onShowToast('error', 'Microphone Error', msg);
      return;
    }

    setCallState('connecting');

    const candidates = getBackendWsCandidates();
    let candidateIndex = 0;
    let connected = false;

    const connectToCandidate = (index: number) => {
      if (index >= candidates.length) {
        setCallState('error');
        const msg =
          candidates.length === 0
            ? 'Voice backend WebSocket URL is not configured. Set VITE_WS_URL or VITE_API_URL in your Vercel project settings to your deployed Render/Railway backend.'
            : `Could not connect to voice backend (tried: ${candidates.join(', ')}). If your Render backend is spinning up from idle, please retry in a few seconds.`;
        setErrorMessage(msg);
        onShowToast('error', 'Backend Connection Failed', msg);
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }
        return;
      }

      const targetUrl = candidates[index];
      let ws: WebSocket;
      let isCandidateClosed = false;

      try {
        ws = new WebSocket(targetUrl);
        wsRef.current = ws;
      } catch (e) {
        connectToCandidate(index + 1);
        return;
      }

      const connectionTimeout = setTimeout(() => {
        if (!connected && !isCandidateClosed) {
          isCandidateClosed = true;
          try { ws.close(); } catch {}
          connectToCandidate(index + 1);
        }
      }, 7000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        connected = true;
        wsOpenedRef.current = true;
        setCallState('connected');
        flushWsOutgoingQueue(ws);
        startAudioAnalysis(stream, ws);
        startUtteranceRecorder(stream, ws);
        timerIntervalRef.current = setInterval(() => {
          setDuration((d) => d + 1);
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: 'ping' }));
            } catch {}
          }
        }, 1000);
      };

      ws.onmessage = handleWsMessage;

      ws.onerror = () => {
        clearTimeout(connectionTimeout);
        if (!connected && !isCandidateClosed) {
          isCandidateClosed = true;
          try { ws.close(); } catch {}
          connectToCandidate(index + 1);
        } else if (connected) {
          const msg = `Voice connection issue with ${targetUrl}.`;
          setErrorMessage(msg);
          setCallState('error');
          onShowToast('error', 'Connection Error', msg);
        }
      };

      ws.onclose = (e) => {
        clearTimeout(connectionTimeout);
        if (!connected && !isCandidateClosed) {
          isCandidateClosed = true;
          connectToCandidate(index + 1);
          return;
        }

        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        isFlushingUtteranceRef.current = false;
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          try { mediaRecorderRef.current.stop(); } catch {}
        }
        mediaRecorderRef.current = null;
        stopAudioAnalysis();

        if (callStateRef.current !== 'ended' && callStateRef.current !== 'idle' && callStateRef.current !== 'error') {
          setCallState('ended');
          if (!e.wasClean) {
            addTranscript('system', 'Connection to backend closed.');
          }
        }
      };
    };

    connectToCandidate(0);
  }, [
    startAudioAnalysis,
    startUtteranceRecorder,
    handleWsMessage,
    addTranscript,
    onShowToast,
    stopAudioAnalysis,
    stopAudioPlayback,
    flushWsOutgoingQueue,
    sendWsMessage,
  ]);

  // --- Toggle Mute ---
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !next; });
      }
      return next;
    });
  }, []);

  // --- Process User Speech (direct text via WebSocket or /api/chat fallback) ---
  const processUserSpeech = useCallback(async (text: string) => {
    if (!text.trim()) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      sendWsMessage({ type: 'text_input', text });
    } else {
      addTranscript('user', text);
      setCallState('processing');
      try {
        const res = await fetch(`${BACKEND_API_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: text }] }),
        });
        const data = await res.json();
        if (data.response) {
          addTranscript('assistant', data.response);
        }
        if (data.booking) {
          await onBookAppointment({
            patientName: data.booking.patientName,
            patientPhone: data.booking.patientPhone,
            doctorId: data.booking.doctorId,
            slot: data.booking.appointmentTime,
            symptoms: data.booking.symptoms,
            preConfirmedBooking: data.booking,
          });
        }
        if (data.cancellation) {
          await onCancelAppointment(
            data.cancellation.bookingId,
            data.cancellation.patientPhone,
            data.cancellation.reason,
            data.cancellation
          );
        }
        setCallState('listening');
      } catch {
        addTranscript('system', 'Backend is offline. Please start the Python backend.');
        onShowToast('warning', 'Backend Offline', 'The MediVoice backend is not reachable. Start it with: python -m backend.main');
        setCallState('error');
        setErrorMessage('Backend is not reachable. Please start the Python backend server.');
      }
    }
  }, [addTranscript, onBookAppointment, onCancelAppointment, onShowToast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    callState,
    duration,
    isMuted,
    transcript,
    audioLevels,
    averageVolume,
    errorMessage,
    conversationStage,
    startCall,
    endCall,
    toggleMute,
    processUserSpeech,
  };
};
