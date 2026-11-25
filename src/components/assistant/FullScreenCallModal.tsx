import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  CallState, 
  TranscriptTurn, 
  Doctor, 
  Appointment 
} from '../../types';
import { 
  Mic, 
  MicOff, 
  PhoneOff, 
  Activity, 
  Clock, 
  Radio, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  X, 
  AlertCircle,
  MessageSquare,
  HelpCircle,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface FullScreenCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  doctors: Doctor[];
  appointments: Appointment[];
  callState: CallState;
  duration: number;
  isMuted: boolean;
  transcript: TranscriptTurn[];
  audioLevels: number[];
  averageVolume: number;
  errorMessage: string | null;
  onStartCall: () => void;
  onEndCall: () => void;
  onToggleMute: () => void;
  onSendSpeech: (text: string) => void;
}

export const FullScreenCallModal: React.FC<FullScreenCallModalProps> = ({
  isOpen,
  onClose,
  doctors,
  callState,
  duration,
  isMuted,
  transcript,
  audioLevels,
  averageVolume,
  errorMessage,
  onStartCall,
  onEndCall,
  onToggleMute,
  onSendSpeech,
}) => {
  const [inputText, setInputText] = useState('');
  const [showConfirmClose, setShowConfirmClose] = useState<boolean>(false);
  const [confirmType, setConfirmType] = useState<'end_active_call' | 'cancel_connecting'>('end_active_call');
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const isCallActive = 
    callState === 'connected' || 
    callState === 'listening' || 
    callState === 'processing' || 
    callState === 'ai_speaking';

  const isConnecting = 
    callState === 'requesting_mic' || 
    callState === 'connecting';

  // Auto-scroll transcript to bottom
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  // Handle Intentional Close Attempt (from X button, backdrop click, or Escape key)
  const handleAttemptClose = useCallback(() => {
    if (callState === 'idle' || callState === 'ended' || callState === 'error') {
      // Close immediately if not active
      setShowConfirmClose(false);
      onClose();
      return;
    }

    if (isConnecting) {
      // Ask user if they wish to cancel connecting
      setConfirmType('cancel_connecting');
      setShowConfirmClose(true);
      return;
    }

    if (isCallActive) {
      // Show confirmation dialog: "Are you sure you want to end this call?"
      setConfirmType('end_active_call');
      setShowConfirmClose(true);
      return;
    }

    onClose();
  }, [callState, isConnecting, isCallActive, onClose]);

  // User confirms ending the call from confirmation dialog
  const handleConfirmEndAndClose = useCallback(() => {
    setShowConfirmClose(false);
    onEndCall();
    onClose();
  }, [onEndCall, onClose]);

  // Keyboard navigation & Escape key support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (showConfirmClose) {
          // Dismiss confirmation dialog and stay in call
          setShowConfirmClose(false);
        } else {
          handleAttemptClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showConfirmClose, handleAttemptClose]);

  if (!isOpen) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = () => {
    switch (callState) {
      case 'idle':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Standby / Ready
          </span>
        );
      case 'requesting_mic':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            Requesting Microphone...
          </span>
        );
      case 'connecting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-[#0D9488] border border-teal-200 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#0D9488] animate-ping" />
            Connecting to Pipecat...
          </span>
        );
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Connected
          </span>
        );
      case 'listening':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Listening to You
          </span>
        );
      case 'ai_speaking':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-[#0D9488] border border-teal-200 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#0D9488] animate-bounce" />
            MediVoice Speaking...
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Processing Request...
          </span>
        );
      case 'ended':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Call Ended
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Connection Error
          </span>
        );
    }
  };

  const handleSendCustomText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendSpeech(inputText.trim());
    setInputText('');
  };

  const quickActionPrompts = [
    'Check Dr. Sarah Chen availability',
    'Book 2:30 PM slot',
    'My phone number is 555-732-9104',
    'Yes, confirm booking',
    'Cancel my existing appointment',
    'Yes, cancel it',
  ];

  // Dynamic avatar scale based on real mic volume
  const avatarScale = isMuted ? 1 : 1 + Math.min(0.25, averageVolume * 0.8);
  const ringOpacity = isMuted ? 0 : Math.min(1, averageVolume * 2);

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      onClick={handleAttemptClose}
    >
      {/* Modal Container: Stop propagation so clicks inside do not close backdrop */}
      <div 
        className="w-full max-w-4xl bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in zoom-in-95 duration-200 relative"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-[#E2E8F0] bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0D9488] to-[#14B8A6] flex items-center justify-center text-white shadow-sm shadow-teal-500/20">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#172033] text-sm sm:text-base">MediVoice AI</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-50 text-[#0D9488] border border-teal-200">
                  Live Agent
                </span>
              </div>
              <p className="text-[11px] text-[#64748B]">Metropolitan Health Clinic • Voice Reception</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Status Badge */}
            {getStatusBadge()}

            {/* Timer */}
            {(isCallActive || isConnecting) && (
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 font-mono text-xs text-[#172033]">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatTimer(duration)}</span>
              </div>
            )}

            {/* Clearly Visible X (Close) Button in Top-Right Corner AT ALL TIMES */}
            <button
              onClick={handleAttemptClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              title="Close Calling Interface"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Banner with Retry */}
        {errorMessage && (
          <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={onStartCall}
              className="flex items-center gap-1 text-xs font-semibold text-rose-900 bg-rose-100/80 hover:bg-rose-200 px-2.5 py-1 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          </div>
        )}

        {/* Calling Body - Two Column Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          
          {/* Left Column: Visual AI Assistant Stage & Audio Waveform */}
          <div className="lg:col-span-6 p-6 flex flex-col items-center justify-between bg-slate-50/50">
            <div className="text-center">
              <h3 className="font-bold text-base text-[#172033]">
                Conversational Outpatient Reception
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Speak into your microphone naturally to book, check availability, or cancel visits
              </p>
            </div>

            {/* Center Circular Visual Waveform */}
            <div className="my-8 flex flex-col items-center justify-center relative">
              {/* Outer Audio-Reactive Ring */}
              <div 
                className="absolute w-48 h-48 rounded-full border-2 border-[#0D9488]/30 transition-all duration-75 pointer-events-none"
                style={{
                  transform: `scale(${1 + averageVolume * 0.5})`,
                  opacity: ringOpacity,
                }}
              />
              <div 
                className="absolute w-56 h-56 rounded-full bg-teal-500/10 transition-all duration-75 pointer-events-none"
                style={{
                  transform: `scale(${1 + averageVolume * 0.7})`,
                  opacity: ringOpacity * 0.6,
                }}
              />

              {/* Central Orb Avatar */}
              <div 
                className={`w-32 h-32 rounded-full flex items-center justify-center transition-transform duration-100 shadow-elevated ${
                  callState === 'ai_speaking'
                    ? 'bg-gradient-to-tr from-[#0D9488] to-[#14B8A6] text-white ring-8 ring-teal-100'
                    : callState === 'listening'
                    ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white ring-8 ring-emerald-50'
                    : callState === 'connecting' || callState === 'requesting_mic'
                    ? 'bg-amber-500 text-white ring-8 ring-amber-50'
                    : 'bg-white text-[#0D9488] border-2 border-[#0D9488] ring-8 ring-slate-100'
                }`}
                style={{
                  transform: `scale(${avatarScale})`,
                }}
              >
                {callState === 'ai_speaking' ? (
                  <Activity className="w-12 h-12 animate-pulse" />
                ) : (
                  <Mic className="w-12 h-12" />
                )}
              </div>

              {/* Volume Indicator pill */}
              <div className="mt-5 text-center">
                <span className="text-xs font-semibold text-[#172033] block">
                  {callState === 'ai_speaking'
                    ? 'MediVoice Speaking...'
                    : callState === 'listening'
                    ? (isMuted ? 'Microphone Muted' : 'Listening to You (Speak Now)')
                    : callState === 'processing'
                    ? 'Processing Clinical Request...'
                    : callState === 'connecting'
                    ? 'Connecting to WebRTC Pipeline...'
                    : callState === 'requesting_mic'
                    ? 'Accessing Microphone...'
                    : 'Voice Engine Ready'}
                </span>
              </div>

              {/* Real Audio Reactive Bars (Reacts Strictly to Real Mic Audio Levels) */}
              <div className="mt-5 flex items-center justify-center gap-1.5 h-14 px-6 py-2 bg-white rounded-2xl border border-slate-200/80 shadow-subtle">
                {audioLevels.map((lvl, i) => (
                  <div
                    key={i}
                    className={`w-1.5 rounded-full transition-all duration-75 ${
                      isMuted
                        ? 'bg-slate-200'
                        : callState === 'ai_speaking'
                        ? 'bg-[#0D9488]'
                        : averageVolume > 0.04
                        ? 'bg-emerald-500'
                        : 'bg-slate-300'
                    }`}
                    style={{
                      height: `${lvl}px`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Bottom Call Controls */}
            <div className="w-full flex items-center justify-center gap-4 pt-4 border-t border-slate-200/70">
              {callState === 'idle' || callState === 'ended' || callState === 'error' ? (
                <button
                  onClick={onStartCall}
                  className="flex items-center gap-2 px-6 py-3 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-2xl font-semibold text-sm shadow-md shadow-teal-700/25 transition-all hover:scale-[1.02]"
                >
                  <Mic className="w-5 h-5" />
                  <span>Start Live AI Call</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={onToggleMute}
                    className={`p-3.5 rounded-2xl border text-sm font-medium transition-all ${
                      isMuted
                        ? 'bg-rose-50 border-rose-200 text-rose-600'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-subtle'
                    }`}
                    title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <button
                    onClick={() => {
                      setConfirmType('end_active_call');
                      setShowConfirmClose(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-semibold text-sm shadow-md shadow-rose-600/20 transition-all hover:scale-[1.02]"
                  >
                    <PhoneOff className="w-5 h-5" />
                    <span>End Call</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Live Conversation Transcript & Interactive Intent Prompts */}
          <div className="lg:col-span-6 flex flex-col justify-between bg-white h-full min-h-[380px] p-5">
            {/* Transcript Header */}
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#0D9488]" />
                <h4 className="font-semibold text-xs sm:text-sm text-[#172033]">
                  Live Conversational Transcript
                </h4>
              </div>
              <span className="text-[11px] font-mono text-[#64748B]">ElevenLabs STT • Gemini • TTS</span>
            </div>

            {/* Transcript Messages Area */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-xs max-h-[300px] sm:max-h-[360px]">
              {transcript.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center text-[#64748B]">
                  <Sparkles className="w-8 h-8 text-teal-400 mb-2 animate-pulse" />
                  <p className="font-medium text-xs text-[#172033]">Voice Transcript Standby</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5 max-w-xs">
                    Speak into your microphone or click below to begin conversing with the clinical assistant.
                  </p>
                </div>
              ) : (
                transcript.map((item) => (
                  <div
                    key={item.id}
                    className={`flex flex-col ${
                      item.speaker === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          item.speaker === 'assistant'
                            ? 'bg-teal-50 text-[#0D9488] border border-teal-200'
                            : item.speaker === 'user'
                            ? 'bg-slate-100 text-slate-700 border border-slate-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {item.speaker === 'assistant'
                          ? 'MediVoice AI'
                          : item.speaker === 'user'
                          ? 'Patient (Recognized Speech)'
                          : 'System'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{item.time}</span>
                    </div>

                    <div
                      className={`p-3 rounded-2xl max-w-[88%] text-xs leading-relaxed ${
                        item.speaker === 'assistant'
                          ? 'bg-teal-50/60 border border-teal-100 text-[#172033] rounded-tl-sm'
                          : item.speaker === 'user'
                          ? 'bg-slate-900 text-white rounded-tr-sm'
                          : 'bg-slate-50 border border-slate-200 text-[#64748B] italic'
                      }`}
                    >
                      {item.text}
                    </div>
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>

            {/* Quick Suggestions & Input Controls */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                <span>Sample patient questions:</span>
                <span className="text-[10px] text-teal-600 font-medium">Click to speak or test intent</span>
              </div>

              {/* Quick Action Pills */}
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {quickActionPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSendSpeech(prompt)}
                    disabled={!isCallActive}
                    className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-teal-50 text-[11px] font-medium text-[#172033] hover:text-[#0D9488] border border-slate-200/80 hover:border-teal-200 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>

              {/* Text Input Fallback / Direct Message */}
              <form onSubmit={handleSendCustomText} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Or type speech here if microphone is unavailable..."
                  disabled={!isCallActive}
                  className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#172033] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || !isCallActive}
                  className="p-2 bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-slate-200 text-white rounded-xl transition-all shadow-sm"
                  title="Submit speech to AI"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Confirmation Dialog Overlay (For Ending Active Call or Cancelling Connection) */}
        {showConfirmClose && (
          <div 
            className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-elevated p-6 max-w-sm w-full text-center space-y-4 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h4 className="font-bold text-base text-[#172033]">
                  {confirmType === 'end_active_call' ? 'Are you sure you want to end this call?' : 'Cancel Connection?'}
                </h4>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                  {confirmType === 'end_active_call'
                    ? 'Ending the session will stop microphone streams, conclude conversational audio, and return to the dashboard.'
                    : 'The voice engine is still establishing connection. Do you want to cancel and exit?'}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setShowConfirmClose(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#172033] rounded-xl text-xs font-semibold transition-colors"
                >
                  Continue Call
                </button>

                <button
                  onClick={handleConfirmEndAndClose}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                >
                  End Call
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
